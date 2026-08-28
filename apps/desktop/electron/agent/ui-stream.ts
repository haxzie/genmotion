import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import type { AgentBackend, AgentEvent } from "./types";

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
  onFinish: (result: { message: UIMessage | null; sessionId: string | null }) => void | Promise<void>;
}): Response {
  let sessionId: string | null = input.resumeSessionId;

  const stream = createUIMessageStream({
    // Without this the stream swallows the real failure and emits a bare
    // "An error occurred", which is useless in a chat transcript.
    onError: (error) => (error instanceof Error ? error.message : String(error)),
    onFinish: async ({ responseMessage }) => {
      await input.onFinish({ message: responseMessage ?? null, sessionId });
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
            break;
          }

          case "reasoning-delta": {
            if (!reasoningId) {
              reasoningId = "r0";
              writer.write({ type: "reasoning-start", id: reasoningId });
            }
            writer.write({ type: "reasoning-delta", id: reasoningId, delta: event.text });
            break;
          }

          case "tool-start": {
            // Close the text part first: a tool call ends the prose block, and
            // leaving it open would append later text to the wrong bubble.
            closeText();
            closeReasoning();
            writer.write({
              type: "tool-input-available",
              toolCallId: event.id,
              toolName: event.name,
              input: event.input,
            });
            break;
          }

          case "tool-end": {
            if (event.isError) {
              writer.write({
                type: "tool-output-error",
                toolCallId: event.id,
                errorText: stringify(event.output),
              });
            } else {
              writer.write({
                type: "tool-output-available",
                toolCallId: event.id,
                output: event.output,
              });
            }
            break;
          }

          case "context": {
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

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
