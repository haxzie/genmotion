import path from "node:path";
import type { ProjectSession } from "../project-session";
import { agentEnv, resolveExecutable } from "./detect";
import { loadAgentSdk } from "./load-sdk";
import { buildSystemPrompt } from "./prompt";
import { waitForAnswer } from "./questions";
import { ALLOWED_TOOLS, DISALLOWED_TOOLS, createGenmotionTools, isInsideProject } from "./tools";
import type { AgentBackend, AgentEvent, TurnInput } from "./types";

/** A human line for the status pill while a tool runs. */
function describeTool(name: string, input: unknown): string {
  const values = (input ?? {}) as Record<string, unknown>;
  const raw = values.file_path ?? values.file ?? values.filename;
  const file = typeof raw === "string" ? raw : null;
  const short = file ? path.basename(file) : null;
  switch (name) {
    case "Write":
      return short ? `Writing ${short}` : "Writing a file";
    case "Edit":
      return short ? `Editing ${short}` : "Editing a file";
    case "Read":
      return short ? `Reading ${short}` : "Reading the project";
    case "Glob":
    case "Grep":
      return "Searching the project";
    case "mcp__genmotion__validate_scene":
      return short ? `Checking ${short}` : "Checking the scene";
    case "mcp__genmotion__project_overview":
      return "Reading the timeline";
    case "WebSearch":
      return "Searching the web";
    case "WebFetch":
      return "Reading a page";
    case "mcp__genmotion__save_asset":
      return short ? `Saving ${short}` : "Saving an asset";
    case "AskUserQuestion":
      return "Waiting for your answer";
    default:
      return name;
  }
}

interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

function blocks(message: unknown): ContentBlock[] {
  const content = (message as { message?: { content?: unknown } })?.message?.content;
  return Array.isArray(content) ? (content as ContentBlock[]) : [];
}

/**
 * Drives Claude Code through the Agent SDK, using whichever credentials the
 * user's own CLI is signed in with — a subscription, or an API key if they set
 * one. The SDK speaks the same `claude -p --output-format stream-json` protocol
 * the CLI does; we normalise its messages into `AgentEvent`s.
 */
export function createClaudeCodeBackend(session: ProjectSession): AgentBackend {
  return {
    id: "claude-code",
    label: "Claude Code",

    async *startTurn({ text, resumeSessionId, signal }: TurnInput): AsyncIterable<AgentEvent> {
      const projectDir = session.dir;
      let sessionId: string | null = resumeSessionId;
      // With partial messages on, text arrives as deltas; the final assistant
      // message repeats it. Emit deltas when we get them, and fall back to the
      // whole block only if this turn produced none.
      let sawDelta = false;

      const [sdk, executable] = await Promise.all([
        loadAgentSdk(),
        resolveExecutable("claude"),
      ]);

      const response = sdk.query({
        prompt: text,
        options: {
          cwd: projectDir,
          // Use the CLI the user signed in with, not the SDK's bundled copy —
          // which this build can't reach anyway (see resolveExecutable).
          ...(executable ? { pathToClaudeCodeExecutable: executable } : {}),
          env: agentEnv(),
          systemPrompt: buildSystemPrompt(),
          allowedTools: ALLOWED_TOOLS,
          disallowedTools: DISALLOWED_TOOLS,
          // "default", not "acceptEdits": an auto-approving mode would decide
          // before canUseTool runs, and that callback is the containment check.
          permissionMode: "default",
          // Don't inherit the user's own CLAUDE.md, skills, or hooks — this
          // agent authors videos, and their coding setup would only confuse it.
          settingSources: [],
          mcpServers: { genmotion: createGenmotionTools(sdk, session) },
          includePartialMessages: true,
          ...(resumeSessionId ? { resume: resumeSessionId } : {}),
          canUseTool: async (
            toolName: string,
            input: Record<string, unknown>,
            { toolUseID }: { toolUseID: string },
          ) => {
            // The one tool whose "permission" is really its answer. The chat
            // already has the card — the assistant block arrives before this
            // callback — so block here until the user picks something, and
            // hand the selection back on the input. Unanswered is a valid
            // outcome: the model is told nobody replied.
            if (toolName === "AskUserQuestion") {
              const answers = await waitForAnswer(toolUseID, signal);
              return {
                behavior: "allow" as const,
                updatedInput: answers ? { ...input, answers } : input,
              };
            }

            const target = input.file_path ?? input.path ?? input.file;
            if (typeof target === "string" && !isInsideProject(projectDir, target)) {
              return {
                behavior: "deny" as const,
                message: `${toolName} was refused: ${target} is outside the project folder. Work inside the project.`,
              };
            }
            return { behavior: "allow" as const, updatedInput: input };
          },
        },
      });

      const stop = () => {
        void response.interrupt?.();
      };
      signal.addEventListener("abort", stop, { once: true });

      try {
        for await (const message of response as AsyncIterable<Record<string, unknown>>) {
          if (signal.aborted) break;

          switch (message.type) {
            case "system": {
              if (message.subtype === "init" && typeof message.session_id === "string") {
                sessionId = message.session_id;
              }
              break;
            }

            case "stream_event": {
              const event = message.event as
                | { type?: string; delta?: { type?: string; text?: string; thinking?: string } }
                | undefined;
              if (event?.type !== "content_block_delta") break;
              if (event.delta?.type === "text_delta" && event.delta.text) {
                sawDelta = true;
                yield { type: "text-delta", text: event.delta.text };
              } else if (event.delta?.type === "thinking_delta" && event.delta.thinking) {
                yield { type: "reasoning-delta", text: event.delta.thinking };
              }
              break;
            }

            case "assistant": {
              for (const block of blocks(message)) {
                if (block.type === "text" && block.text && !sawDelta) {
                  yield { type: "text-delta", text: block.text };
                }
                if (block.type === "tool_use" && block.id && block.name) {
                  yield { type: "status", text: describeTool(block.name, block.input) };
                  yield {
                    type: "tool-start",
                    id: block.id,
                    name: block.name,
                    input: block.input ?? {},
                  };
                }
              }
              break;
            }

            case "user": {
              for (const block of blocks(message)) {
                if (block.type === "tool_result" && block.tool_use_id) {
                  yield {
                    type: "tool-end",
                    id: block.tool_use_id,
                    output: block.content ?? "",
                    isError: block.is_error === true,
                  };
                }
              }
              break;
            }

            case "result": {
              const usage = message.usage as
                | {
                    input_tokens?: number;
                    output_tokens?: number;
                    cache_read_input_tokens?: number;
                    cache_creation_input_tokens?: number;
                  }
                | undefined;
              if (usage) {
                yield {
                  type: "usage",
                  usage: {
                    inputTokens: usage.input_tokens,
                    outputTokens: usage.output_tokens,
                    cacheReadTokens: usage.cache_read_input_tokens,
                    cacheWriteTokens: usage.cache_creation_input_tokens,
                  },
                };
              }
              if (message.subtype !== "success" && typeof message.result === "string") {
                yield { type: "error", message: message.result };
              }
              if (typeof message.session_id === "string") sessionId = message.session_id;
              break;
            }

            default:
              break;
          }
        }
      } catch (err) {
        yield {
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        };
      } finally {
        signal.removeEventListener("abort", stop);
      }

      yield { type: "done", sessionId };
    },
  };
}
