import { Hono } from "hono";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  stepCountIs,
  streamText,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";
import { and, asc, gt, eq, db, schema } from "@genmotion/db";
import {
  EDITOR_SYSTEM_PROMPT,
  buildProjectContext,
  createEditorTools,
  chatModel,
  CHAT_MODEL_ID,
  CHAT_PROVIDER_OPTIONS,
  loadAudioClipsForContext,
  loadLatestCompaction,
  runCompaction,
  NAMING_PROMPT,
} from "@genmotion/ai";
import { COMPACTION_MESSAGE_LIMIT, LIMIT_STATUS } from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { checkLimit } from "../limits";
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
 * Coerce a tool part's `input` to an object. An interrupted or malformed tool
 * call can persist with a non-object input (empty, a string, null, an array),
 * which the Anthropic API rejects with
 * "messages.N.content.0.tool_use.input: Input should be an object". The tool
 * turn is already terminal (it has output), so replacing the broken input with
 * {} keeps it in context without tripping the validation.
 */
function ensureToolInputObject<T extends { type?: string }>(part: T): T {
  const type = part.type ?? "";
  if (!(type.startsWith("tool-") || type === "dynamic-tool")) return part;
  const input = (part as { input?: unknown }).input;
  const isObject =
    typeof input === "object" && input !== null && !Array.isArray(input);
  return isObject ? part : ({ ...part, input: {} } as T);
}

/**
 * Drop tool parts that never reached a terminal state (a tool call with no
 * result/error). `convertToModelMessages` throws "Tool result is missing for
 * tool call …" on those — they happen when a tool turn was interrupted or the
 * tool threw. Stripping them lets an otherwise-corrupted history recover.
 * Also normalizes malformed tool inputs and trims heavy tool payloads in all
 * but the last few messages.
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
        .map((part) => {
          const fixed = ensureToolInputObject(part);
          return recent ? fixed : trimToolPayload(fixed);
        });
      return { ...message, parts };
    })
    .filter((message) => message.parts.length > 0);
}

export const chatRoutes = new Hono<AuthEnv>();

chatRoutes.use(requireAuth);

async function loadOwnedProject(projectId: string, organizationId: string) {
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, organizationId),
      ),
    );
  return project ?? null;
}

/** GET /:projectId — persisted chat history as UIMessage[]. */
chatRoutes.get("/:projectId", async (c) => {
  const project = await loadOwnedProject(
    c.req.param("projectId"),
    c.get("organizationId"),
  );
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

/**
 * Map the AI SDK's usage object onto the columns. Every field is optional on
 * the provider side, so a model that reports nothing simply stores nulls
 * rather than zeros — "not reported" and "cost nothing" aren't the same thing
 * when this gets summed for billing.
 */
function usageColumns(usage: LanguageModelUsage | undefined) {
  return {
    model: usage ? CHAT_MODEL_ID : null,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    totalTokens: usage?.totalTokens ?? null,
    cacheReadTokens: usage?.inputTokenDetails?.cacheReadTokens ?? null,
    cacheWriteTokens: usage?.inputTokenDetails?.cacheWriteTokens ?? null,
  };
}

async function persistMessage(
  projectId: string,
  message: UIMessage,
  usage?: LanguageModelUsage,
) {
  const usageValues = usageColumns(usage);
  await db
    .insert(schema.chatMessages)
    .values({
      id: message.id,
      projectId,
      role: message.role as "user" | "assistant" | "system",
      parts: message.parts,
      ...usageValues,
    })
    .onConflictDoUpdate({
      target: schema.chatMessages.id,
      // A resumed/retried stream rewrites the same row — keep the usage in step
      // with the parts it paid for instead of leaving a stale count behind.
      set: { parts: message.parts, ...usageValues },
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
  const project = await loadOwnedProject(
    c.req.param("projectId"),
    c.get("organizationId"),
  );
  if (!project) return c.json({ error: "Not found" }, 404);

  // Scoped structured logging for the whole streaming turn. Every line is
  // prefixed with the project id so a single chat can be grepped end to end.
  const log = (msg: string, extra?: unknown) =>
    console.log(`[chat ${project.id}] ${msg}`, extra ?? "");
  const logError = (msg: string, err: unknown) =>
    console.error(
      `[chat ${project.id}] ${msg}:`,
      err instanceof Error
        ? `${err.name}: ${err.message}\n${err.stack ?? ""}`
        : err,
    );

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

  log("POST received", {
    messages: messages.length,
    lastRole: lastMessage?.role,
    selectedScenes: selectedSceneIds.length,
    selectedAssets: selectedAssetIds.length,
    selectedElements: selectedElements.length,
  });

  // Client disconnects (tab closed, navigation, or a dropped stream showing up
  // as ERR_INCOMPLETE_CHUNKED_ENCODING) abort this signal. Log it and thread it
  // into the model call so we stop generating instead of doing orphaned work.
  const requestSignal = c.req.raw.signal;
  requestSignal.addEventListener("abort", () =>
    log("client disconnected — request aborted mid-stream"),
  );

  // Checked before the user's message is persisted: a turn we refuse to answer
  // must not be stored, and must not count toward the quota that blocked it.
  // Only a genuine new turn is gated — a regenerate replays an existing message
  // and would otherwise be charged twice.
  if (lastMessage?.role === "user") {
    const blocked = await checkLimit(c.get("organizationId"), "aiTurns");
    if (blocked) {
      log("blocked by aiTurns quota", blocked.limit);
      return c.json(blocked, LIMIT_STATUS);
    }
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

  const audioClips = await loadAudioClipsForContext(project.id);

  const projectContext = buildProjectContext({
    project,
    scenes: scenes.map(({ code: _code, ...rest }) => rest),
    selectedScenes: scenes.filter((s) => focusSceneIds.has(s.id)),
    assets: assets.filter((a) => a.kind !== "export"),
    audioClips,
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
      log("auto-compaction start", { windowMessages: messages.length });
      const result = await runCompaction(project.id);
      didAutoCompact = result.created;
      log("auto-compaction done", { created: result.created });
    } catch (err) {
      logError("auto-compaction failed", err);
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

  // streamText reports usage in its own onFinish, but the assistant message is
  // persisted from the outer stream's onFinish — park it here to bridge the two.
  let turnUsage: LanguageModelUsage | undefined;

  const stream = createUIMessageStream({
    originalMessages: messages,
    // Without this, createUIMessageStream swallows the real error and emits a
    // generic "An error occurred." Log it and surface the actual message.
    onError: (error) => {
      logError("UI message stream error", error);
      return error instanceof Error
        ? error.message
        : "An error occurred while generating the response.";
    },
    execute: async ({ writer }) => {
      log("stream execute start", { modelMessages: modelMessages.length });
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
                  providerOptions: CHAT_PROVIDER_OPTIONS,
                  system: NAMING_PROMPT,
                  prompt: extractText(lastMessage).slice(0, 2000),
                  // Don't let a slow naming call linger behind the stream.
                  abortSignal: AbortSignal.timeout(8000),
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
              } catch (err) {
                logError("project naming failed", err);
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
        onProgress: (text) => {
          // Live status (e.g. each parallel scene) so the long tool phase shows
          // continuous progress in the chat instead of a silent spinner.
          log("progress", text);
          writer.write({ type: "data-status", data: { text }, transient: true });
        },
      });
      disposeSandbox = editor.dispose;

      const result = streamText({
        model: chatModel(),
        providerOptions: CHAT_PROVIDER_OPTIONS,
        // Ordered for prefix caching: everything that is byte-identical turn to
        // turn comes first, and the one block that changes every turn comes
        // last. Moonshot caches the longest matching prefix, so a volatile
        // block placed early strands everything behind it — projectContext used
        // to sit second, which made the entire conversation history uncacheable.
        // Measured on a 44-message project: 0% cache hit with the old order,
        // 93% with this one, same request otherwise.
        messages: [
          // Static (a module constant) → always the cached head.
          {
            role: "system",
            content: EDITOR_SYSTEM_PROMPT,
          },
          // Changes only when a compaction runs — and a compaction rewrites the
          // live window anyway, so this costs nothing to place ahead of it.
          ...(compaction
            ? [
                {
                  role: "system" as const,
                  content: `Summary of the earlier conversation (it was compacted to save context):\n${compaction.summary}`,
                },
              ]
            : []),
          // Append-only between turns, so each turn reuses the previous turn's
          // history as cached prefix.
          ...modelMessages,
          // Rebuilt every turn from live scene/asset/selection state, so it must
          // be last. Trailing it also means the model reads the freshest project
          // state closest to the new instruction.
          { role: "system", content: projectContext },
        ],
        tools: editor.tools,
        stopWhen: stepCountIs(12),
        abortSignal: requestSignal,
        onError: ({ error }) => {
          // Fires on model/tool/transport errors mid-stream — the usual cause
          // of a turn that "hangs" without producing output.
          logError("streamText error", error);
        },
        onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
          // One line per agent step — shows exactly which tool ran and whether
          // its result came back, so a hang can be pinned to a specific tool.
          log("step finished", {
            finishReason,
            toolCalls: toolCalls?.map((t) => t.toolName),
            toolResults: toolResults?.length ?? 0,
          });
        },
        onFinish: ({ finishReason, totalUsage, steps }) => {
          // totalUsage, not usage — `usage` is the last step alone, which would
          // under-report a turn that ran a dozen tool steps.
          turnUsage = totalUsage;
          log("streamText finished", {
            finishReason,
            steps: steps?.length,
            usage: totalUsage,
          });
        },
      });

      log("merging model stream");
      // Kimi is a reasoning model — forward its thinking tokens so the UI shows
      // live progress instead of a frozen spinner during long reasoning phases.
      writer.merge(result.toUIMessageStream({ sendReasoning: true }));

      // Naming is best-effort and must NOT hold the stream open. Awaiting a hung
      // naming call here would keep the response streaming forever, so cap it.
      await Promise.race([
        namingPromise,
        new Promise<void>((resolve) =>
          setTimeout(() => {
            log("naming wait timed out (8s) — not blocking stream close");
            resolve();
          }, 8000),
        ),
      ]);
      log("stream execute end");
    },
    onFinish: async ({ responseMessage }) => {
      log("stream finished", {
        hasResponse: Boolean(responseMessage),
        parts: responseMessage?.parts.length,
      });
      try {
        // Tear down the workbench sandbox now that the turn is done.
        await disposeSandbox?.();
        if (responseMessage) {
          await persistMessage(project.id, responseMessage, turnUsage);
        }
        // Scenes likely changed this turn — refresh the project thumbnail.
        await enqueueThumbnail(project.id);
      } catch (err) {
        logError("stream onFinish cleanup failed", err);
      }
    },
  });

  log("responding with stream");
  return createUIMessageStreamResponse({ stream });
});
