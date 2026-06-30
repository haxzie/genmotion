import { Hono } from "hono";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { and, asc, gt, eq, db, schema } from "@genmotion/db";
import {
  EDITOR_SYSTEM_PROMPT,
  buildProjectContext,
  createEditorTools,
  chatModel,
  loadLatestCompaction,
  runCompaction,
  NAMING_PROMPT,
} from "@genmotion/ai";
import { COMPACTION_MESSAGE_LIMIT } from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { enqueueThumbnail } from "../queue";

/** Keep this many trailing messages (~2 turns) at full tool-payload fidelity. */
const KEEP_FULL_RECENT = 4;
const TRIMMED = "[omitted — see current project state]";

/**
 * Replace heavy tool payloads (scene TSX, workbench code/output, full-code
 * error dumps) in an OLD tool part with short placeholders. The current scene
 * code is always re-supplied by buildProjectContext, so this is lossless for
 * the model while cutting the bulk of repeated input tokens. Clones before
 * mutating — the original parts are still persisted/streamed at full fidelity.
 */
function trimToolPayload<T extends { type?: string }>(part: T): T {
  const type = part.type ?? "";
  if (!(type.startsWith("tool-") || type === "dynamic-tool")) return part;

  const p = part as { input?: Record<string, unknown>; output?: Record<string, unknown> };
  let input = p.input;
  let output = p.output;
  let changed = false;

  if (input && typeof input === "object") {
    if (typeof input.code === "string") {
      input = { ...input, code: TRIMMED };
      changed = true;
    }
    if (Array.isArray(input.scenes) && input.scenes.some((s) => (s as { brief?: string })?.brief)) {
      input = {
        ...input,
        scenes: (input.scenes as Array<Record<string, unknown>>).map((s) =>
          s?.brief ? { ...s, brief: TRIMMED } : s,
        ),
      };
      changed = true;
    }
  }

  if (output && typeof output === "object") {
    for (const key of ["code", "stdout", "stderr"] as const) {
      if (typeof output[key] === "string" && (output[key] as string).length > 0) {
        output = { ...output, [key]: TRIMMED };
        changed = true;
      }
    }
    // editScene's "not found" error inlines the whole scene file — drop the bulk.
    if (typeof output.error === "string" && output.error.length > 400) {
      output = { ...output, error: `${(output.error as string).slice(0, 200)} …[truncated]` };
      changed = true;
    }
  }

  return (changed ? { ...part, input, output } : part) as T;
}

/**
 * Drop tool parts that never reached a terminal state (a tool call with no
 * result/error). `convertToModelMessages` throws "Tool result is missing for
 * tool call …" on those — they happen when a tool turn was interrupted or the
 * tool threw. Stripping them lets an otherwise-corrupted history recover.
 * Also trims heavy tool payloads in all but the last few messages.
 */
function repairToolMessages(messages: UIMessage[]): UIMessage[] {
  const trimBefore = Math.max(0, messages.length - KEEP_FULL_RECENT);
  return messages
    .map((message, index) => {
      const recent = index >= trimBefore;
      const parts = message.parts
        .filter((part) => {
          const type = (part as { type?: string }).type ?? "";
          // Drop UI-only context parts; they aren't model input.
          if (type.startsWith("data-")) return false;
          if (type.startsWith("tool-") || type === "dynamic-tool") {
            const state = (part as { state?: string }).state;
            return state === "output-available" || state === "output-error";
          }
          return true;
        })
        .map((part) => (recent ? part : trimToolPayload(part)));
      return { ...message, parts };
    })
    .filter((message) => message.parts.length > 0);
}

export const chatRoutes = new Hono<AuthEnv>();

chatRoutes.use(requireAuth);

async function loadOwnedProject(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)),
    );
  return project ?? null;
}

/** GET /:projectId — persisted chat history as UIMessage[]. */
chatRoutes.get("/:projectId", async (c) => {
  const user = c.get("user");
  const project = await loadOwnedProject(c.req.param("projectId"), user.id);
  if (!project) return c.json({ error: "Not found" }, 404);

  // Load only messages after the latest compaction — older turns are folded
  // into the summary and intentionally not shown/re-sent.
  const compaction = await loadLatestCompaction(project.id);
  const rows = await db
    .select()
    .from(schema.chatMessages)
    .where(
      and(
        eq(schema.chatMessages.projectId, project.id),
        compaction
          ? gt(schema.chatMessages.createdAt, compaction.createdAt)
          : undefined,
      ),
    )
    .orderBy(asc(schema.chatMessages.createdAt));

  return c.json(
    rows.map((row) => ({
      id: row.id,
      role: row.role,
      parts: row.parts,
    })),
  );
});

async function persistMessage(projectId: string, message: UIMessage) {
  await db
    .insert(schema.chatMessages)
    .values({
      id: message.id,
      projectId,
      role: message.role as "user" | "assistant" | "system",
      parts: message.parts,
    })
    .onConflictDoUpdate({
      target: schema.chatMessages.id,
      set: { parts: message.parts },
    });
}

function extractText(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

/** POST /:projectId — streaming editor agent. */
chatRoutes.post("/:projectId", async (c) => {
  const user = c.get("user");
  const project = await loadOwnedProject(c.req.param("projectId"), user.id);
  if (!project) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    messages: UIMessage[];
    selectedSceneIds?: string[];
    selectedAssetIds?: string[];
    selectedElements?: Array<{
      tag: string;
      text: string;
      elementId: string | null;
      sceneId: string | null;
      sceneName: string;
      timecode: string;
    }>;
  }>();
  const messages = body.messages ?? [];
  const selectedSceneIds = body.selectedSceneIds ?? [];
  const selectedAssetIds = body.selectedAssetIds ?? [];
  const selectedElements = body.selectedElements ?? [];
  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.role === "user") {
    await persistMessage(project.id, lastMessage);
  }

  const scenes = await db
    .select({
      id: schema.scenes.id,
      name: schema.scenes.name,
      code: schema.scenes.code,
      durationInFrames: schema.scenes.durationInFrames,
      order: schema.scenes.order,
    })
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, project.id))
    .orderBy(asc(schema.scenes.order));

  const assets = await db
    .select({
      id: schema.assets.id,
      url: schema.assets.url,
      kind: schema.assets.kind,
      filename: schema.assets.filename,
    })
    .from(schema.assets)
    .where(
      and(eq(schema.assets.projectId, project.id), eq(schema.assets.status, "ready")),
    );

  // Selected elements pull their scene's code into context so the agent can edit it.
  const focusSceneIds = new Set([
    ...selectedSceneIds,
    ...selectedElements
      .map((e) => e.sceneId)
      .filter((id): id is string => Boolean(id)),
  ]);

  const projectContext = buildProjectContext({
    project,
    scenes: scenes.map(({ code: _code, ...rest }) => rest),
    selectedScenes: scenes.filter((s) => focusSceneIds.has(s.id)),
    assets: assets.filter((a) => a.kind !== "export"),
  });

  // Auto-compact: once the live window passes the message limit, fold the older
  // turns into the rolling summary before this turn runs (so this turn already
  // benefits). runCompaction summarizes everything before the just-persisted
  // user message and dates the new summary just before it, leaving only that
  // message in the live window. The agent's compactConversation tool does the
  // same for explicit new-task switches; both share the chat_compactions table.
  let didAutoCompact = false;
  if (lastMessage?.role === "user" && messages.length > COMPACTION_MESSAGE_LIMIT) {
    try {
      const result = await runCompaction(project.id);
      didAutoCompact = result.created;
    } catch {
      // Best-effort — fall through and run the turn with the full window.
    }
  }

  // After auto-compaction only the latest user message remains live; otherwise
  // send the whole window. The selection context is prepended to the user's
  // message on the client, so it travels with the message.
  const windowMessages = didAutoCompact ? messages.slice(-1) : messages;
  const modelMessages = await convertToModelMessages(
    repairToolMessages(windowMessages),
  );

  // Rolling summary of everything before the active window (written by
  // auto-compaction above or the compactConversation tool). Kept AFTER the
  // stable system prompt so the big cached prefix isn't disturbed.
  const compaction = await loadLatestCompaction(project.id);

  // Set when the editor tools build their sandbox; torn down on stream finish.
  let disposeSandbox: (() => Promise<void>) | undefined;

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      // Tell the client the earlier history was compacted, so it clears the now
      // pre-summary bubbles (keeping only this user message) when the turn ends.
      if (didAutoCompact) {
        writer.write({ type: "data-compacted", data: {}, transient: true });
      }

      // Auto-name the project off the first user message (non-blocking for the
      // main stream; the rename lands as a data part whenever Haiku finishes).
      const namingPromise =
        project.name === "Untitled" && lastMessage?.role === "user"
          ? (async () => {
              try {
                const { text } = await generateText({
                  model: chatModel(),
                  system: NAMING_PROMPT,
                  prompt: extractText(lastMessage).slice(0, 2000),
                });
                const name = text.trim().slice(0, 80);
                if (!name) return;
                await db
                  .update(schema.projects)
                  .set({ name, updatedAt: new Date() })
                  .where(eq(schema.projects.id, project.id));
                writer.write({
                  type: "data-project-renamed",
                  data: { name },
                });
              } catch {
                // Naming is best-effort; the user can rename manually.
              }
            })()
          : Promise.resolve();

      const editor = createEditorTools({
        projectId: project.id,
        userId: user.id,
        project: {
          fps: project.fps,
          width: project.width,
          height: project.height,
        },
        onMutation: () => {
          // Nudge the client to refetch scenes as each parallel write lands.
          writer.write({ type: "data-scenes-updated", data: {}, transient: true });
        },
      });
      disposeSandbox = editor.dispose;

      const result = streamText({
        model: chatModel(),
        messages: [
          // Stable, identical every turn → Moonshot caches this prefix.
          {
            role: "system",
            content: EDITOR_SYSTEM_PROMPT,
          },
          // Volatile per-request context comes after the cached prefix.
          { role: "system", content: projectContext },
          ...(compaction
            ? [
                {
                  role: "system" as const,
                  content: `Summary of the earlier conversation (it was compacted to save context):\n${compaction.summary}`,
                },
              ]
            : []),
          ...modelMessages,
        ],
        tools: editor.tools,
        stopWhen: stepCountIs(12),
      });

      writer.merge(result.toUIMessageStream());
      await namingPromise;
    },
    onFinish: async ({ responseMessage }) => {
      // Tear down the workbench sandbox now that the turn is done.
      await disposeSandbox?.();
      if (responseMessage) {
        await persistMessage(project.id, responseMessage);
      }
      // Scenes likely changed this turn — refresh the project thumbnail.
      await enqueueThumbnail(project.id);
    },
  });

  return createUIMessageStreamResponse({ stream });
});
