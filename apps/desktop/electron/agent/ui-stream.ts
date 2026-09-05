import { randomUUID } from "node:crypto";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import type { AgentBackend, AgentEvent } from "./types";

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

  const stream = createUIMessageStream({
    // Without this the stream swallows the real failure and emits a bare
    // "An error occurred", which is useless in a chat transcript.
    onError: (error) => (error instanceof Error ? error.message : String(error)),
    onFinish: async ({ responseMessage }) => {
      await input.onFinish({ message: responseMessage ?? null, sessionId, context });
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
      const checkpointId = randomUUID();
      const parts: CheckpointPart[] = [];
      let openText: { type: "text"; text: string } | null = null;
      let openReasoning: { type: "reasoning"; text: string } | null = null;
      const toolPartIndex = new Map<string, number>();
      let lastCheckpointAt = 0;

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
            // One last unthrottled write before this throws: whatever text
            // hadn't cleared the 400ms window yet is still worth having on
            // disk. (This throw itself is not the interruption case the
            // checkpoint exists for — the AI SDK still runs onFinish/flush
            // after it, so `chatTurn`'s own onFinish clears the checkpoint
            // right back out a moment later. This is only insurance for the
            // process dying before that gets the chance to run.)
            checkpoint(true);
            throw new Error(event.message);
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
