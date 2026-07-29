import { describe, it, expect } from "vitest";
import { streamText, stepCountIs, type ModelMessage } from "ai";
import {
  EDITOR_SYSTEM_PROMPT,
  buildProjectContext,
  createEditorTools,
  chatModel,
} from "@genmotion/ai";
import { db, schema, eq, asc, sql } from "@genmotion/db";

/**
 * Live end-to-end tests of the editor agent: the SAME streamText loop, system
 * prompt, and real createEditorTools the chat route uses. They hit the real
 * model (Moonshot Kimi) and a real Postgres, so they self-skip when
 * MOONSHOT_API_KEY is absent or the DB is unreachable.
 *
 * Goal: guard two regressions — (1) a turn must terminate (no infinite "stuck
 * streaming"), and (2) it must author scenes through the tools. Kimi is a
 * reasoning model, so we also record how long it spends thinking vs. producing.
 */

const SCENE_TOOLS = new Set(["createScene", "createScenes"]);

// A tight, single-scene brief — enough to exercise createScene(s) + the
// compiler + DB persistence without a marathon reasoning phase.
const SIMPLE_PROMPT =
  "Create a single 90-frame intro scene on a white background: the word " +
  "“Launch” in a bold dark font blurs up into place, with a light-orange " +
  "underline sweeping in beneath it. Keep it to one scene, no voiceover.";

// The complex brief that originally hung — kept as an opt-in reproduction
// (Kimi reasons on it for minutes). Enable with RUN_SLOW_AGENT_TESTS=1.
const WORLD_TOUR_PROMPT =
  'Create a event announcement video for a world tour. Very minimal, light ' +
  "orange hue white background. 1st scene. An arrow in the center pointing at " +
  'a country + emoji. Sort of like "<arrow icon> San Francisco <emoji>" and ' +
  "then the country names change like it's a spinning wheel. Text changes with " +
  "blur up, and blur down with circular animation. Every time the wheel moves, " +
  "the arrow animates slowly backwards, and when the text aligns, it snaps back " +
  'into position. It starts slow, then full speed, and lands on "Where next?".';

const hasKey = Boolean(process.env.MOONSHOT_API_KEY);
// Probe the DB once at load so tests can skip (not fail) when Postgres is down.
const dbReady = hasKey
  ? await db
      .execute(sql`select 1`)
      .then(() => true)
      .catch((err) => {
        console.warn("[editor-agent test] DB unreachable — skipping:", err);
        return false;
      })
  : false;

interface TurnResult {
  finishReason: string;
  steps: number;
  toolCalls: string[];
  progress: string[];
  scenes: { name: string; code: string }[];
  firstChunkMs: number;
  reasoningChunks: number;
  textChunks: number;
  elapsedMs: number;
}

/** Run one editor-agent turn against a throwaway project; always cleans up. */
async function runEditorTurn(prompt: string, abortMs: number): Promise<TurnResult> {
  const userId = `test-user-${Date.now()}-${Math.round(performance.now())}`;
  let projectId: string | null = null;
  let dispose: (() => Promise<void>) | undefined;
  const toolCalls: string[] = [];
  const progress: string[] = [];

  try {
    await db.insert(schema.user).values({
      id: userId,
      name: "Editor Agent Test",
      email: `${userId}@example.test`,
    });
    const [project] = await db
      .insert(schema.projects)
      .values({ userId, name: "Untitled", fps: 30, width: 1920, height: 1080 })
      .returning();
    projectId = project!.id;

    const editor = createEditorTools({
      projectId,
      userId,
      project: { fps: project!.fps, width: project!.width, height: project!.height },
      onProgress: (text) => {
        progress.push(text);
        console.log("[editor-agent test] progress:", text);
      },
    });
    dispose = editor.dispose;

    const messages: ModelMessage[] = [
      { role: "system", content: EDITOR_SYSTEM_PROMPT },
      {
        role: "system",
        content: buildProjectContext({
          project: project!,
          scenes: [],
          selectedScenes: [],
          assets: [],
        }),
      },
      // Keep the turn on the scene-authoring path (the part that hung); don't
      // pull in voiceover/S3/web deps that aren't under test here.
      {
        role: "system",
        content:
          "TEST MODE: create the scene(s) for this request only. Do NOT call " +
          "CreateVoiceOverAudio or any research/web tools.",
      },
      { role: "user", content: prompt },
    ];

    const startedAt = performance.now();
    let firstChunkMs = 0;
    let reasoningChunks = 0;
    let textChunks = 0;

    const result = streamText({
      model: chatModel(),
      messages,
      tools: editor.tools,
      stopWhen: stepCountIs(12),
      abortSignal: AbortSignal.timeout(abortMs),
      onChunk: ({ chunk }) => {
        if (!firstChunkMs) {
          firstChunkMs = Math.round(performance.now() - startedAt);
          console.log(`[editor-agent test] first chunk @ ${firstChunkMs}ms (${chunk.type})`);
        }
        if (chunk.type === "reasoning-delta") reasoningChunks++;
        if (chunk.type === "text-delta") textChunks++;
      },
      onStepFinish: ({ toolCalls: tc, finishReason }) => {
        for (const call of tc ?? []) toolCalls.push(call.toolName);
        console.log(
          `[editor-agent test] step @ ${Math.round(performance.now() - startedAt)}ms:`,
          (tc ?? []).map((c) => c.toolName),
          "finish:",
          finishReason,
        );
      },
      onError: ({ error }) => console.error("[editor-agent test] streamText error:", error),
    });

    await result.consumeStream();
    const finishReason = await result.finishReason;
    const steps = await result.steps;
    const elapsedMs = Math.round(performance.now() - startedAt);

    const scenes = await db
      .select({ name: schema.scenes.name, code: schema.scenes.code })
      .from(schema.scenes)
      .where(eq(schema.scenes.projectId, projectId))
      .orderBy(asc(schema.scenes.order));

    const out: TurnResult = {
      finishReason,
      steps: steps.length,
      toolCalls,
      progress,
      scenes,
      firstChunkMs,
      reasoningChunks,
      textChunks,
      elapsedMs,
    };
    console.log("[editor-agent test] summary:", {
      ...out,
      scenes: scenes.map((s) => s.name),
    });
    return out;
  } finally {
    await dispose?.();
    if (projectId) {
      await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
    }
    await db.delete(schema.user).where(eq(schema.user.id, userId));
  }
}

function assertAuthoredScenes(result: TurnResult) {
  // 1. The turn terminated (no infinite hang).
  expect(result.finishReason).toBeDefined();
  // 2. It used a scene-authoring tool.
  expect(result.toolCalls.some((t) => SCENE_TOOLS.has(t))).toBe(true);
  // 3. It persisted at least one scene, each with a valid-looking module.
  expect(result.scenes.length).toBeGreaterThan(0);
  for (const scene of result.scenes) {
    expect(scene.code.length).toBeGreaterThan(0);
    expect(scene.code).toMatch(/export\s+default/);
  }
}

describe("editor agent (live integration)", () => {
  // Opt-in like its slower sibling below: this calls a live model, so it costs
  // money and minutes on every run. It used to self-skip whenever the dev DB
  // happened to be down; now the suite always provisions a database, so the
  // only thing keeping it out of a routine `pnpm test` is this flag.
  it.skipIf(!dbReady || !process.env.RUN_SLOW_AGENT_TESTS)(
    "authors a scene for a simple brief and terminates",
    async () => {
      const result = await runEditorTurn(SIMPLE_PROMPT, 170_000);
      assertAuthoredScenes(result);
    },
    180_000,
  );

  it.skipIf(!dbReady || !process.env.RUN_SLOW_AGENT_TESTS)(
    "authors scenes for the complex world-tour brief (slow, opt-in)",
    async () => {
      const result = await runEditorTurn(WORLD_TOUR_PROMPT, 280_000);
      assertAuthoredScenes(result);
    },
    300_000,
  );
});
