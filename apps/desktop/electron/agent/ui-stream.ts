import { randomUUID } from "node:crypto";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { parseMcpToolName } from "@genmotion/shared";
import type { AgentBackend, AgentEvent } from "./types";
import { track } from "../analytics";

/** How often a checkpoint is written while only plain text is streaming in.
 *  Tool events bypass this entirely — those are rare and worth writing
 *  immediately, unlike a token arriving many times a second. */
const CHECKPOINT_MIN_INTERVAL_MS = 400;

interface CheckpointToolPart {
  type: string;
  toolCallId: string;
  state: "input-available" | "output-available" | "output-error";
  input: unknown;
  output?: unknown;
  errorText?: string;
}
type CheckpointPart = { type: "text" | "reasoning"; text: string } | CheckpointToolPart;

/**
 * Adapts an `AgentEvent` stream into the AI SDK's UI message stream — the exact
 * protocol `useChat` speaks — so the web app's ChatPanel, ToolCard, and status
 * pill render a Claude Code turn with no changes at all.
 */
export function runTurnAsUiStream(input: {
  backend: AgentBackend;
  projectDir: string;
  text: string;
  resumeSessionId: string | null;
  signal: AbortSignal;
  onFinish: (result: {
    message: UIMessage | null;
    sessionId: string | null;
    /** The turn's last context reading, or null if it never reported one. */
    context: { usedTokens: number; maxTokens: number } | null;
    /**
     * The id the running checkpoint was written under. The finished message
     * carries the harness's own id, so the two would not dedupe against each
     * other on disk; the caller records this on the final message so a
     * checkpoint recovered by a later open is recognised as the same turn.
     */
    checkpointId: string;
  }) => void | Promise<void>;
  /**
   * A running snapshot of the assistant message, written as it streams —
   * see `ProjectSession.writeCheckpoint`'s own comment for why. Optional so
   * a caller with nowhere durable to put one (a test harness, say) can skip
   * it; the turn behaves identically either way.
   */
  onCheckpoint?: (message: UIMessage) => void;
}): Response {
  let sessionId: string | null = input.resumeSessionId;
  // Kept so the reading survives the turn: the ring needs a number when the
  // project is next opened, long before another turn produces one.
  let context: { usedTokens: number; maxTokens: number } | null = null;

  // Minted up front so `onFinish` can name it — see the mirror built inside
  // `execute` for what it labels.
  const checkpointId = randomUUID();

  const stream = createUIMessageStream({
    // Without this the stream swallows the real failure and emits a bare
    // "An error occurred", which is useless in a chat transcript.
    onError: (error) => (error instanceof Error ? error.message : String(error)),
    onFinish: async ({ responseMessage }) => {
      await input.onFinish({ message: responseMessage ?? null, sessionId, context, checkpointId });
    },
    execute: async ({ writer }) => {
      // One text part per turn, opened lazily so a tool-only turn has none.
      let textId: string | null = null;
      let reasoningId: string | null = null;

      const closeText = () => {
        if (textId) {
          writer.write({ type: "text-end", id: textId });
          textId = null;
        }
      };
      const closeReasoning = () => {
        if (reasoningId) {
          writer.write({ type: "reasoning-end", id: reasoningId });
          reasoningId = null;
        }
      };

      // A hand-rolled mirror of the exact same message the chunks above are
      // building — kept in parallel, rather than read back off the AI SDK's
      // own accumulator, because that one is only ever handed to `onFinish`,
      // at the very end. This is the one that can be checkpointed *during*
      // the turn, which is the entire point.
      const parts: CheckpointPart[] = [];
      let openText: { type: "text"; text: string } | null = null;
      let openReasoning: { type: "reasoning"; text: string } | null = null;
      const toolPartIndex = new Map<string, number>();
      /** Call id → tool name, so the end event can be attributed. */
      const toolNames = new Map<string, string>();
      let lastCheckpointAt = 0;
      /**
       * A failure is held rather than thrown where it arrives — see the
       * `error` case below for why the rest of the stream still has to be
       * drained first. Rethrown once the backend is genuinely done.
       */
      let failure: Error | null = null;

      const checkpoint = (force: boolean) => {
        if (!input.onCheckpoint) return;
        const now = Date.now();
        if (!force && now - lastCheckpointAt < CHECKPOINT_MIN_INTERVAL_MS) return;
        lastCheckpointAt = now;
        input.onCheckpoint({
          id: checkpointId,
          role: "assistant",
          parts: parts as UIMessage["parts"],
          metadata: { interrupted: true },
        } as UIMessage);
      };

      for await (const event of input.backend.startTurn({
        projectDir: input.projectDir,
        text: input.text,
        resumeSessionId: input.resumeSessionId,
        signal: input.signal,
      })) {
        switch (event.type) {
          case "text-delta": {
            closeReasoning();
            if (!textId) {
              textId = "t0";
              writer.write({ type: "text-start", id: textId });
            }
            writer.write({ type: "text-delta", id: textId, delta: event.text });
            if (!openText) {
              openText = { type: "text", text: "" };
              parts.push(openText);
            }
            openText.text += event.text;
            checkpoint(false);
            break;
          }

          case "reasoning-delta": {
            if (!reasoningId) {
              reasoningId = "r0";
              writer.write({ type: "reasoning-start", id: reasoningId });
            }
            writer.write({ type: "reasoning-delta", id: reasoningId, delta: event.text });
            if (!openReasoning) {
              openReasoning = { type: "reasoning", text: "" };
              parts.push(openReasoning);
            }
            openReasoning.text += event.text;
            checkpoint(false);
            break;
          }

          case "tool-start": {
            // A call to one of the user's servers is the marketplace being
            // used — the event names the server and the tool, never the
            // input. Our own genmotion tools are not integrations.
            const mcp = parseMcpToolName(event.name);
            if (mcp && mcp.server !== "genmotion") {
              track("mcp_tool_called", { server: mcp.server, tool: mcp.tool, harness: input.backend.id });
            }
            // Close the text part first: a tool call ends the prose block, and
            // leaving it open would append later text to the wrong bubble.
            closeText();
            closeReasoning();
            openText = null;
            openReasoning = null;
            writer.write({
              type: "tool-input-available",
              toolCallId: event.id,
              toolName: event.name,
              input: event.input,
            });
            toolPartIndex.set(event.id, parts.length);
            toolNames.set(event.id, event.name);
            parts.push({
              type: `tool-${event.name}`,
              toolCallId: event.id,
              state: "input-available",
              input: event.input,
            });
            // Tool traces are exactly what's worth never losing — this is the
            // one case checkpointed unconditionally, throttle or not.
            checkpoint(true);
            break;
          }

          case "tool-end": {
            const ended = toolNames.get(event.id);
            const endedMcp = ended ? parseMcpToolName(ended) : null;
            if (endedMcp && endedMcp.server !== "genmotion") {
              track("mcp_tool_finished", { server: endedMcp.server, tool: endedMcp.tool, ok: !event.isError });
            }
            const output = withoutImages(event.output);
            if (event.isError) {
              writer.write({
                type: "tool-output-error",
                toolCallId: event.id,
                errorText: stringify(output),
              });
            } else {
              writer.write({
                type: "tool-output-available",
                toolCallId: event.id,
                output,
              });
            }
            const index = toolPartIndex.get(event.id);
            const existing = index !== undefined ? parts[index] : undefined;
            if (existing && "toolCallId" in existing) {
              if (event.isError) {
                existing.state = "output-error";
                existing.errorText = stringify(output);
              } else {
                existing.state = "output-available";
                existing.output = output;
              }
            }
            checkpoint(true);
            break;
          }

          case "context": {
            context = event.context;
            writer.write({
              type: "data-context-usage",
              data: event.context,
              transient: true,
            });
            break;
          }

          case "status": {
            writer.write({ type: "data-status", data: { text: event.text }, transient: true });
            break;
          }

          case "project-touched": {
            writer.write({ type: "data-scenes-updated", data: {}, transient: true });
            break;
          }

          case "error": {
            closeText();
            closeReasoning();
            // One last unthrottled write: whatever text hadn't cleared the
            // 400ms window yet is still worth having on disk. (Not the
            // interruption case the checkpoint exists for — the AI SDK runs
            // onFinish/flush after the throw below, so `chatTurn`'s onFinish
            // clears the checkpoint right back out a moment later. This is
            // only insurance for the process dying before that can run.)
            checkpoint(true);
            // Held, not thrown. A harness that fails mid-turn still has an
            // epilogue worth consuming: Claude Code yields its `done` — the
            // only event carrying the session id — *after* the error, so
            // throwing here unwound the loop before that arrived. The id went
            // back null, `writeAgentSession` wrote that null over a perfectly
            // live thread, and the next turn resumed nothing: one dropped
            // connection and the agent had forgotten the whole conversation.
            // (Codex yields `done` first, so it never hit this.)
            failure ??= new Error(event.message);
            break;
          }

          case "done": {
            sessionId = event.sessionId;
            break;
          }

          default:
            break;
        }
      }

      closeText();
      closeReasoning();
      // Now that `done` has been seen and `sessionId` is whatever the harness
      // last reported, the turn can fail for real.
      if (failure) throw failure;
      // The files changed underneath the editor; tell it to refetch.
      writer.write({ type: "data-scenes-updated", data: {}, transient: true });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

/**
 * Tool output as the chat should keep it.
 *
 * A tool can hand the model a picture — `capture_frames` does — and that block
 * is base64. It belongs in the model's context and nowhere else: this output is
 * written into every checkpoint and appended to `chat.jsonl`, so keeping it
 * would put a hundred kilobytes per call on disk and replay it on every reopen.
 * The text block alongside it names the file the frame was saved to, which is
 * what the card has to show anyway.
 */
function withoutImages(output: unknown): unknown {
  if (!Array.isArray(output)) return output;
  return output.filter(
    (block) =>
      !(block && typeof block === "object" && (block as { type?: unknown }).type === "image"),
  );
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
