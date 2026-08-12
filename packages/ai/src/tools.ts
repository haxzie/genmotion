import { tool } from "ai";
import { z } from "zod";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  FrameContext,
  PlayingContext,
  RenderModeContext,
  VideoConfigContext,
} from "@genmotion/motion";
import { and, asc, eq, inArray, db, schema } from "@genmotion/db";
import { compileSceneToJs } from "@genmotion/compiler/node";
import { formatCompileError } from "@genmotion/compiler";
import { evaluateScene } from "@genmotion/compiler/evaluate";
import { writeScene } from "./scene-writer";
import { runCompaction } from "./compaction";
import { createWebTools } from "./web-tools";
import { createVoiceOverAudioTool } from "./voiceover";
import { createSandboxTools } from "./sandbox-tools";
import { createAssetTools } from "./asset-tools";
import { createImageTools } from "./image-tools";
import { createAudioClipTools } from "./audio-clip-tools";

const MAX_DURATION = 30 * 60 * 10; // 10 minutes at 30fps

interface ValidationConfig {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
}

const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 150,
};

/**
 * Validate scene code the way the browser will actually run it:
 * 1. esbuild compile (syntax) — same pinned version as the editor,
 * 2. evaluate the module through the sandbox require-shim (catches
 *    disallowed imports, top-level crashes, missing default export),
 * 3. smoke-render several frames with react-dom/server (catches
 *    render-path crashes like undefined props or bad hook usage).
 * Returns null if OK, otherwise the error string handed back to the model.
 */
async function validateSceneCode(
  code: string,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG,
): Promise<string | null> {
  const result = await compileSceneToJs(code);
  if (!result.ok) {
    return `Compile error: ${formatCompileError(result.error)}`;
  }
  if (!/export\s+default|exports\.default|module\.exports/.test(code)) {
    return "Scene must have a default export: `export default function Scene() { ... }`";
  }
  const banned = code.match(
    /\b(Math\.random|Date\.now|new Date\(|setTimeout|setInterval|requestAnimationFrame|fetch\(|XMLHttpRequest|localStorage|document\.|window\.)/,
  );
  if (banned) {
    return `Scene code uses "${banned[1]}", which breaks deterministic rendering. Use the frame-driven APIs from @genmotion/motion instead (random(seed) for randomness).`;
  }

  // Hot-linked logo CDNs are the top source of broken images in finished
  // videos: Simple Icons 404s for any brand it doesn't carry (plenty of famous
  // ones were pulled at the owner's request), and a 404 renders as a silent
  // gap. Saving first turns that into a tool error the agent can act on.
  const hotLinked = code.match(
    /https?:\/\/(cdn\.simpleicons\.org|thesvg\.org)\/[^"'`\s)]*/,
  );
  if (hotLinked) {
    return `Scene code hot-links a logo CDN ("${hotLinked[0]}"). That URL is never verified, so if the brand isn't in the set it 404s and the video ships with a broken image. Save it into the project first with saveImageToProject and use the URL it returns. If you cannot save assets (scene writers can't), use a lucide-react icon or the brand name set in type instead.`;
  }

  // Raster-pinning hints are fine on their own, but under a camera they tell
  // the compositor to freeze a layer's raster scale — so a zoom stretches a
  // stale texture instead of redrawing the text, and the export looks soft.
  if (/<\s*Camera[\s/>]/.test(code)) {
    const pinning = code.match(/\b(willChange|translate3d|translateZ)\b/);
    if (pinning) {
      return `Scene code uses "${pinning[1]}" inside a <Camera> scene. That pins the browser's raster scale, so a camera zoom magnifies a blurry cached texture instead of re-rendering the content. Remove it — the motion components handle compositing themselves.`;
    }
  }

  const evaluated = evaluateScene(result.code);
  if (!evaluated.ok) {
    return `Scene failed to load: ${evaluated.error.message}`;
  }

  // Smoke-render at the start, middle, and end of the scene.
  const frames = [
    0,
    Math.floor(config.durationInFrames / 2),
    Math.max(0, config.durationInFrames - 1),
  ];
  for (const frame of frames) {
    try {
      renderToString(
        createElement(
          RenderModeContext.Provider,
          { value: "preview" },
          createElement(
            PlayingContext.Provider,
            { value: false },
            createElement(
              VideoConfigContext.Provider,
              {
                value: {
                  fps: config.fps,
                  width: config.width,
                  height: config.height,
                  durationInFrames: config.durationInFrames,
                },
              },
              createElement(
                FrameContext.Provider,
                { value: frame },
                createElement(evaluated.component),
              ),
            ),
          ),
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `Scene crashed while rendering frame ${frame}: ${message}`;
    }
  }

  return null;
}

/**
 * Reserve `count` order slots at the insertion point, renumbering the whole
 * timeline first if the gap is too tight. Safe for concurrent batch inserts
 * because slots are claimed before any scene-writer starts.
 */
async function reserveOrderSlots(
  projectId: string,
  count: number,
  insertAfterSceneId?: string,
): Promise<number[]> {
  const scenes = await db
    .select({ id: schema.scenes.id, order: schema.scenes.order })
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, projectId))
    .orderBy(asc(schema.scenes.order));

  const afterIndex = insertAfterSceneId
    ? scenes.findIndex((s) => s.id === insertAfterSceneId)
    : scenes.length - 1;

  // Appending (or empty timeline / unknown anchor): extend past the end.
  if (afterIndex === -1 || afterIndex === scenes.length - 1) {
    const last = scenes[scenes.length - 1]?.order ?? 0;
    return Array.from({ length: count }, (_, i) => last + (i + 1) * 1000);
  }

  const after = scenes[afterIndex]!.order;
  const next = scenes[afterIndex + 1]!.order;
  let step = Math.floor((next - after) / (count + 1));
  if (step >= 1) {
    return Array.from({ length: count }, (_, i) => after + (i + 1) * step);
  }

  // Gap exhausted: renumber to 1000-spacing, then split the fresh gap.
  for (let i = 0; i < scenes.length; i++) {
    await db
      .update(schema.scenes)
      .set({ order: (i + 1) * 1000 })
      .where(eq(schema.scenes.id, scenes[i]!.id));
  }
  const newAfter = (afterIndex + 1) * 1000;
  step = Math.floor(1000 / (count + 1));
  return Array.from({ length: count }, (_, i) => newAfter + (i + 1) * step);
}

async function nextOrder(projectId: string, insertAfterSceneId?: string) {
  const scenes = await db
    .select({ id: schema.scenes.id, order: schema.scenes.order })
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, projectId))
    .orderBy(asc(schema.scenes.order));

  if (scenes.length === 0) return 1000;
  if (!insertAfterSceneId) return scenes[scenes.length - 1]!.order + 1000;

  const index = scenes.findIndex((s) => s.id === insertAfterSceneId);
  if (index === -1) return scenes[scenes.length - 1]!.order + 1000;
  const after = scenes[index]!.order;
  const next = scenes[index + 1]?.order;
  if (next === undefined) return after + 1000;
  if (next - after > 1) return Math.floor((after + next) / 2);

  // Gaps exhausted — renumber, then insert midway.
  for (let i = 0; i < scenes.length; i++) {
    await db
      .update(schema.scenes)
      .set({ order: (i + 1) * 1000 })
      .where(eq(schema.scenes.id, scenes[i]!.id));
  }
  return (index + 1) * 1000 + 500;
}

export interface EditorToolsContext {
  projectId: string;
  userId: string;
  /** Composition config, forwarded to scene-writer subagents. */
  project: { fps: number; width: number; height: number };
  /** Called after each persisted mutation so the UI can refetch mid-stream. */
  onMutation?: () => void;
  /**
   * Human-readable progress from a long-running tool (e.g. each parallel scene
   * as it lands), streamed to the chat so the turn never looks stuck while
   * subagents work invisibly.
   */
  onProgress?: (text: string) => void;
}

/**
 * Tools the editor agent can call. Every mutation validates before persisting.
 * Returns the tool map plus `dispose()` to tear down the sandbox at turn end.
 */
export function createEditorTools({
  projectId,
  userId,
  project,
  onMutation,
  onProgress,
}: EditorToolsContext) {
  const emit = () => onMutation?.();
  const progress = (text: string) => onProgress?.(text);
  const sandbox = createSandboxTools({ projectId, userId, onMutation });

  const tools = {
    ...createWebTools(),
    ...sandbox.tools,
    ...createAssetTools({ projectId, userId, onMutation }),
    ...createImageTools({ projectId, userId, onMutation }),
    ...createAudioClipTools({ projectId, userId, fps: project.fps, onMutation }),
    CreateVoiceOverAudio: createVoiceOverAudioTool({
      projectId,
      userId,
      onMutation,
    }),
    createScenes: tool({
      description:
        "Create MULTIPLE scenes at once. Each brief is handed to a parallel scene-writer, so this is the fast path for 2+ scenes. Briefs must be self-contained (exact text content, palette, layout, animation choreography, mood). Scenes land on the timeline in the order given.",
      inputSchema: z.object({
        scenes: z
          .array(
            z.object({
              name: z.string().min(1).max(80),
              durationInFrames: z.number().int().min(1).max(MAX_DURATION),
              brief: z
                .string()
                .min(40)
                .describe(
                  "Detailed creative brief for this scene: its role in the video's narrative arc, the narration line(s) spoken over it, exact on-screen copy, colors, background, layout, animation choreography timed to the narration beats, pacing, mood",
                ),
            }),
          )
          .min(1)
          .max(8),
        insertAfterSceneId: z
          .string()
          .optional()
          .describe("Place the new scenes after this scene; omit to append at the end"),
      }),
      execute: async ({ scenes: briefs, insertAfterSceneId }) => {
        // Reserve order slots up front so parallel completions can't interleave.
        const slots = await reserveOrderSlots(
          projectId,
          briefs.length,
          insertAfterSceneId,
        );
        progress(
          `Writing ${briefs.length} scene${briefs.length === 1 ? "" : "s"} in parallel…`,
        );
        let done = 0;
        const results = await Promise.all(
          briefs.map(async (brief, index) => {
            try {
              const written = await writeScene(brief, project, (code) =>
                validateSceneCode(code, {
                  ...project,
                  durationInFrames: brief.durationInFrames,
                }),
              );
              if (!written.ok) {
                progress(`✗ “${brief.name}” failed (${++done}/${briefs.length})`);
                return { name: brief.name, ok: false as const, error: written.error };
              }
              const [scene] = await db
                .insert(schema.scenes)
                .values({
                  projectId,
                  name: brief.name,
                  code: written.code,
                  durationInFrames: brief.durationInFrames,
                  order: slots[index]!,
                })
                .returning({ id: schema.scenes.id });
              emit();
              progress(`✓ Wrote “${brief.name}” (${++done}/${briefs.length})`);
              return { name: brief.name, ok: true as const, sceneId: scene!.id };
            } catch (err) {
              // Never let one brief reject the whole tool call — that would
              // leave the tool call without a result in the message history.
              progress(`✗ “${brief.name}” failed (${++done}/${briefs.length})`);
              return {
                name: brief.name,
                ok: false as const,
                error: err instanceof Error ? err.message : String(err),
              };
            }
          }),
        );

        const created = results.filter((r) => r.ok);
        const failed = results.filter((r) => !r.ok);
        return {
          ok: failed.length === 0,
          created,
          ...(failed.length > 0 && {
            error: `${failed.length} scene(s) failed: ${failed
              .map((f) => (f as { error: string }).error)
              .join(" | ")}. Create them individually with createScene.`,
          }),
        };
      },
    }),
    createScene: tool({
      description:
        "Create a new scene from TSX code. The code is compiled before saving; on error, fix the code and retry.",
      inputSchema: z.object({
        name: z.string().min(1).max(80).describe("Short scene name shown in the timeline, e.g. 'Intro'"),
        code: z.string().describe("Complete TSX source for the scene module"),
        durationInFrames: z.number().int().min(1).max(MAX_DURATION),
        insertAfterSceneId: z
          .string()
          .optional()
          .describe("Place the new scene after this scene; omit to append at the end"),
      }),
      execute: async ({ name, code, durationInFrames, insertAfterSceneId }) => {
        const error = await validateSceneCode(code, { ...project, durationInFrames });
        if (error) return { ok: false as const, error };
        const order = await nextOrder(projectId, insertAfterSceneId);
        const [scene] = await db
          .insert(schema.scenes)
          .values({ projectId, name, code, durationInFrames, order })
          .returning({ id: schema.scenes.id });
        emit();
        return { ok: true as const, sceneId: scene!.id, name };
      },
    }),

    updateScene: tool({
      description:
        "Replace a scene's code and/or name. Provide the COMPLETE new code (not a diff). Compiled before saving; on error, fix and retry.",
      inputSchema: z.object({
        sceneId: z.string(),
        code: z.string().optional().describe("Complete new TSX source"),
        name: z.string().min(1).max(80).optional(),
      }),
      execute: async ({ sceneId, code, name }) => {
        if (!code && !name) {
          return { ok: false as const, error: "Provide code and/or name to update." };
        }
        if (code) {
          const [existing] = await db
            .select({ durationInFrames: schema.scenes.durationInFrames })
            .from(schema.scenes)
            .where(
              and(eq(schema.scenes.id, sceneId), eq(schema.scenes.projectId, projectId)),
            );
          const error = await validateSceneCode(code, {
            ...project,
            durationInFrames:
              existing?.durationInFrames ?? DEFAULT_VALIDATION_CONFIG.durationInFrames,
          });
          if (error) return { ok: false as const, error };
        }
        const [updated] = await db
          .update(schema.scenes)
          .set({
            ...(code && { code }),
            ...(name && { name }),
            updatedAt: new Date(),
          })
          .where(
            and(eq(schema.scenes.id, sceneId), eq(schema.scenes.projectId, projectId)),
          )
          .returning({ id: schema.scenes.id, name: schema.scenes.name });
        if (!updated) return { ok: false as const, error: `Scene ${sceneId} not found in this project.` };
        emit();
        return { ok: true as const, sceneId: updated.id, name: updated.name };
      },
    }),

    editScene: tool({
      description:
        "Make TARGETED edits to a scene's code via find-and-replace — the preferred way to tweak an existing scene (change a color, timing, copy, one element) without resending the whole file. First read the current code with getSceneCode, then pass one or more edits. Each `oldText` must match the current code EXACTLY (including indentation and whitespace) and be UNIQUE — include a few full surrounding lines so it matches exactly once, or set `replaceAll` to replace every occurrence. Edits apply in order; the whole scene is recompiled before saving and nothing is saved if it fails. Use updateScene instead only for large rewrites.",
      inputSchema: z.object({
        sceneId: z.string(),
        edits: z
          .array(
            z.object({
              oldText: z
                .string()
                .min(1)
                .describe(
                  "Exact snippet from the current code to replace — verbatim, with enough surrounding context to be unique",
                ),
              newText: z
                .string()
                .describe("Replacement text (may be empty to delete the snippet)"),
              replaceAll: z
                .boolean()
                .optional()
                .describe("Replace every occurrence instead of requiring a unique match"),
            }),
          )
          .min(1)
          .max(20),
      }),
      execute: async ({ sceneId, edits }) => {
        const [scene] = await db
          .select({
            code: schema.scenes.code,
            durationInFrames: schema.scenes.durationInFrames,
          })
          .from(schema.scenes)
          .where(
            and(eq(schema.scenes.id, sceneId), eq(schema.scenes.projectId, projectId)),
          );
        if (!scene) {
          return { ok: false as const, error: `Scene ${sceneId} not found in this project.` };
        }

        let code = scene.code;
        let applied = 0;
        let alreadyApplied = 0;
        for (let i = 0; i < edits.length; i++) {
          const { oldText, newText, replaceAll } = edits[i]!;
          if (oldText === newText) {
            return { ok: false as const, error: `Edit ${i + 1}: oldText and newText are identical.` };
          }
          const occurrences = code.split(oldText).length - 1;
          if (occurrences === 0) {
            // Idempotency: a very common failure is the model re-sending an edit
            // that's ALREADY applied (e.g. adding `Img` to an import that now has
            // it). If oldText is gone but newText is already present, there's
            // nothing to do — treat it as a no-op instead of erroring, so the
            // model stops looping on a stale edit.
            if (newText.length > 0 && code.includes(newText)) {
              alreadyApplied++;
              continue;
            }
            // Genuine mismatch — show the actual current code so the model stops
            // guessing (copy verbatim from THIS; note exact imports/whitespace).
            const current =
              code.length > 4000 ? `${code.slice(0, 4000)}\n…[truncated]` : code;
            return {
              ok: false as const,
              error: `Edit ${i + 1}: oldText was not found in the current scene code. Do not guess — copy the exact snippet from the current code below:\n\n\`\`\`tsx\n${current}\n\`\`\``,
            };
          }
          if (occurrences > 1 && !replaceAll) {
            return {
              ok: false as const,
              error: `Edit ${i + 1}: oldText appears ${occurrences} times. Add more surrounding context to make it unique, or set replaceAll: true.`,
            };
          }
          // Function replacement avoids special $-pattern handling in newText.
          code = replaceAll
            ? code.split(oldText).join(newText)
            : code.replace(oldText, () => newText);
          applied++;
        }

        // Every edit was already applied — nothing changed, so skip the re-save.
        if (applied === 0) {
          return {
            ok: true as const,
            sceneId,
            editsApplied: 0,
            alreadyApplied,
            note: "All edits were already applied — the scene is already in the requested state. Do not retry; re-read with getSceneCode if unsure.",
          };
        }

        const error = await validateSceneCode(code, {
          ...project,
          durationInFrames: scene.durationInFrames,
        });
        if (error) return { ok: false as const, error };

        const [updated] = await db
          .update(schema.scenes)
          .set({ code, updatedAt: new Date() })
          .where(
            and(eq(schema.scenes.id, sceneId), eq(schema.scenes.projectId, projectId)),
          )
          .returning({ id: schema.scenes.id, name: schema.scenes.name });
        if (!updated) return { ok: false as const, error: `Scene ${sceneId} not found.` };
        emit();
        return {
          ok: true as const,
          sceneId: updated.id,
          name: updated.name,
          editsApplied: applied,
          ...(alreadyApplied > 0 && { alreadyApplied }),
        };
      },
    }),

    getSceneCode: tool({
      description: "Read the current TSX source of a scene before editing it.",
      inputSchema: z.object({ sceneId: z.string() }),
      execute: async ({ sceneId }) => {
        const [scene] = await db
          .select({
            name: schema.scenes.name,
            code: schema.scenes.code,
            durationInFrames: schema.scenes.durationInFrames,
          })
          .from(schema.scenes)
          .where(
            and(eq(schema.scenes.id, sceneId), eq(schema.scenes.projectId, projectId)),
          );
        if (!scene) return { ok: false as const, error: `Scene ${sceneId} not found.` };
        return { ok: true as const, ...scene };
      },
    }),

    updateSceneDuration: tool({
      description: "Change how long a scene runs (in frames).",
      inputSchema: z.object({
        sceneId: z.string(),
        durationInFrames: z.number().int().min(1).max(MAX_DURATION),
      }),
      execute: async ({ sceneId, durationInFrames }) => {
        const [updated] = await db
          .update(schema.scenes)
          .set({ durationInFrames, updatedAt: new Date() })
          .where(
            and(eq(schema.scenes.id, sceneId), eq(schema.scenes.projectId, projectId)),
          )
          .returning({ id: schema.scenes.id });
        if (!updated) return { ok: false as const, error: `Scene ${sceneId} not found.` };
        emit();
        return { ok: true as const, sceneId, durationInFrames };
      },
    }),

    deleteScene: tool({
      description: "Delete a scene from the project.",
      inputSchema: z.object({ sceneId: z.string() }),
      execute: async ({ sceneId }) => {
        const deleted = await db
          .delete(schema.scenes)
          .where(
            and(eq(schema.scenes.id, sceneId), eq(schema.scenes.projectId, projectId)),
          )
          .returning({ id: schema.scenes.id });
        if (deleted.length === 0) {
          return { ok: false as const, error: `Scene ${sceneId} not found.` };
        }
        emit();
        return { ok: true as const, sceneId };
      },
    }),

    reorderScenes: tool({
      description:
        "Reorder the timeline. Pass ALL scene ids in the desired order.",
      inputSchema: z.object({ orderedSceneIds: z.array(z.string()).min(1) }),
      execute: async ({ orderedSceneIds }) => {
        const existing = await db
          .select({ id: schema.scenes.id })
          .from(schema.scenes)
          .where(
            and(
              eq(schema.scenes.projectId, projectId),
              inArray(schema.scenes.id, orderedSceneIds),
            ),
          );
        if (existing.length !== orderedSceneIds.length) {
          return {
            ok: false as const,
            error: "orderedSceneIds must contain exactly the project's scene ids.",
          };
        }
        for (let i = 0; i < orderedSceneIds.length; i++) {
          await db
            .update(schema.scenes)
            .set({ order: (i + 1) * 1000, updatedAt: new Date() })
            .where(eq(schema.scenes.id, orderedSceneIds[i]!));
        }
        emit();
        return { ok: true as const };
      },
    }),

    compactConversation: tool({
      description:
        "Compact the conversation history. Call this ONCE, BEFORE doing anything else, when the user's latest message is a SELF-CONTAINED new task that can be handled WITHOUT the earlier conversation — none of the prior messages, scenes, research, or decisions are needed to do it. It folds everything before this message into a cheap summary so the context stays small. Do NOT call it when the request builds on, refines, references, or depends on prior context (tweaks, fixes, 'now add…', anything about work already discussed). After it returns, proceed with the new request as normal.",
      inputSchema: z.object({
        reason: z
          .string()
          .optional()
          .describe("Brief note on why this is a new, unrelated task"),
      }),
      execute: async () => {
        const result = await runCompaction(projectId);
        if (!result.created) {
          return {
            ok: true as const,
            note: "Nothing earlier to compact; starting fresh.",
          };
        }
        return {
          ok: true as const,
          note: "Compacted the earlier conversation. Continue with the new task.",
        };
      },
    }),

    renameProject: tool({
      description: "Set the project's title (2-5 words).",
      inputSchema: z.object({ name: z.string().min(1).max(120) }),
      execute: async ({ name }) => {
        await db
          .update(schema.projects)
          .set({ name, updatedAt: new Date() })
          .where(eq(schema.projects.id, projectId));
        return { ok: true as const, name };
      },
    }),
  };

  return { tools, dispose: sandbox.dispose };
}

/** Tool names whose successful results change the timeline/preview. */
export const SCENE_MUTATING_TOOLS = new Set([
  "createScene",
  "createScenes",
  "updateScene",
  "editScene",
  "updateSceneDuration",
  "deleteScene",
  "reorderScenes",
  "addAudio",
  "updateAudio",
  "removeAudio",
]);
