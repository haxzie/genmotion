import path from "node:path";
import type { ProjectSession } from "../project-session";
import { agentEnv, resolveExecutable } from "./detect";
import { loadAgentSdk, type AgentSdkModule } from "./load-sdk";
import { buildSystemPrompt } from "./prompt";
import { waitForAnswer } from "./questions";
import {
  ALLOWED_TOOLS,
  DISALLOWED_TOOLS,
  READ_ONLY_TOOLS,
  createGenmotionTools,
  isInsideProject,
} from "./tools";
import { isReadable, listReadRoots } from "./read-roots";
import { getLaunchDir } from "../cli";
import { activeModel } from "./registry";
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

/**
 * The harness's own view of how full its context is.
 *
 * Never throws and never blocks a turn: a number for a status ring is not
 * worth failing a message over.
 */
async function readContextUsage(
  response: unknown,
): Promise<{ usedTokens: number; maxTokens: number } | null> {
  const query = response as { getContextUsage?: () => Promise<unknown> };
  if (typeof query.getContextUsage !== "function") return null;
  try {
    const usage = (await query.getContextUsage()) as {
      totalTokens?: number;
      maxTokens?: number;
    };
    if (typeof usage?.totalTokens !== "number" || typeof usage?.maxTokens !== "number") {
      return null;
    }
    return { usedTokens: usage.totalTokens, maxTokens: usage.maxTokens };
  } catch {
    return null;
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
/**
 * The SDK and the CLI path, resolved once.
 *
 * Loading the vendored SDK costs ~170ms and probing PATH costs a few more.
 * Both answers are the same for the life of the process, and paying for them
 * on every turn is time the user spends watching a spinner.
 */
let toolchain: Promise<[AgentSdkModule, string | null]> | null = null;

function loadToolchain(): Promise<[AgentSdkModule, string | null]> {
  toolchain ??= Promise.all([loadAgentSdk(), resolveExecutable("claude")]);
  return toolchain;
}

/**
 * The turn currently running, for callbacks that outlive a single `query()`.
 *
 * A pre-warmed subprocess is created before the turn that will use it exists,
 * so its `canUseTool` cannot close over that turn's abort signal. It reads it
 * from here instead.
 */
let activeTurn: { signal: AbortSignal } | null = null;

/**
 * The most recent context reading, per project, carried between turns.
 *
 * Keyed by project: one process serves every project the user opens, and a
 * single shared slot meant the ring showed the last project's number until the
 * new one answered.
 */
const lastContext = new Map<string, { usedTokens: number; maxTokens: number }>();

/** Options a turn runs with. Shared so a warm spawn cannot drift from a cold one. */
async function turnOptions(
  sdk: AgentSdkModule,
  session: ProjectSession,
  executable: string | null,
) {
  const projectDir = session.dir;
  const readRoots = (await listReadRoots(projectDir)).map((root) => root.path);
  // Null when the user has not chosen one, which leaves the CLI on whatever it
  // considers default — the same thing they would get in a terminal.
  const model = await activeModel("claude-code").catch(() => null);
  return {
    cwd: projectDir,
    // Use the CLI the user signed in with, not the SDK's bundled copy —
    // which this build can't reach anyway (see resolveExecutable).
    ...(executable ? { pathToClaudeCodeExecutable: executable } : {}),
    env: agentEnv(),
    ...(model ? { model } : {}),
    systemPrompt: buildSystemPrompt(readRoots, getLaunchDir()),
    // Folders the user has shared. The CLI refuses a path outside its working
    // roots before `canUseTool` is ever consulted, so a grant has to be
    // declared here too — this opens the door, and the callback below is what
    // decides that only reads walk through it.
    ...(readRoots.length ? { additionalDirectories: readRoots } : {}),
    allowedTools: ALLOWED_TOOLS,
    disallowedTools: DISALLOWED_TOOLS,
    // "default", not "acceptEdits": an auto-approving mode would decide
    // before canUseTool runs, and that callback is the containment check.
    permissionMode: "default" as const,
    // Don't inherit the user's own CLAUDE.md, skills, or hooks — this
    // agent authors videos, and their coding setup would only confuse it.
    settingSources: [] as [],
    mcpServers: { genmotion: createGenmotionTools(sdk, session) },
    includePartialMessages: true,
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
        const signal = activeTurn?.signal ?? AbortSignal.timeout(0);
        const answers = await waitForAnswer(toolUseID, signal);
        return {
          behavior: "allow" as const,
          updatedInput: answers ? { ...input, answers } : input,
        };
      }

      // Bash has no `file_path`/`path`/`file` input to check — a shell command
      // is a string, not a declared path — so it falls straight through to the
      // `allow` at the bottom of this function, ungoverned by anything here.
      // That is a real gap, accepted deliberately when Bash was allowed back
      // onto this harness (see the comment above `DISALLOWED_TOOLS`): unlike
      // Codex, this CLI has no OS-level sandbox, so there is nothing this
      // callback can do to contain a shell the way it contains a file tool.
      const target = input.file_path ?? input.path ?? input.file;
      if (typeof target === "string" && !isInsideProject(projectDir, target)) {
        // Outside the project, a read-only tool can still go ahead if the user
        // has shared the folder it points into. Nothing that writes can, ever:
        // the project folder is the only thing this agent may change, and a
        // shared folder is somebody's own work, not a scratch space.
        if (READ_ONLY_TOOLS.has(toolName) && (await isReadable(projectDir, target))) {
          return { behavior: "allow" as const, updatedInput: input };
        }
        return {
          behavior: "deny" as const,
          message: READ_ONLY_TOOLS.has(toolName)
            ? `${toolName} was refused: ${target} is outside the project and is not in a folder the user has shared. Ask them to add it with "Folders" in the composer, and carry on without it for now.`
            : `${toolName} was refused: ${target} is outside the project folder. You can only write inside the project — copy what you need into it instead.`,
        };
      }
      return { behavior: "allow" as const, updatedInput: input };
    },
  };
}

/** A CLI already spawned and through its handshake, waiting for a prompt. */
let warm: { dir: string; handle: Awaited<ReturnType<AgentSdkModule["startup"]>> } | null = null;

/**
 * Spawn the CLI before anyone asks for it.
 *
 * Most of a cold turn's first seconds go on starting a Node process and
 * waiting out the initialize handshake. Measured: first token drops from
 * ~3.2s to ~1.4s when the process is already up — so this is over half the
 * wait before anything appears on screen.
 *
 * Only the *first* turn of a session can use it: `startup()` fixes its options
 * at spawn time, and every later turn carries a `resume` id that was not known
 * then. That is also the turn where the wait is most noticeable, since the
 * editor has just opened.
 *
 * Best-effort throughout. A failure here is left for the real turn to surface
 * properly, and a machine without Claude Code installed simply never warms.
 */
export function warmClaudeCode(session: ProjectSession): void {
  void (async () => {
    try {
      await disposeWarmClaudeCode();
      const [sdk, executable] = await loadToolchain();
      const handle = await sdk.startup({ options: await turnOptions(sdk, session, executable) });
      warm = { dir: session.dir, handle };
    } catch {
      warm = null;
    }
  })();
}

/** Release a warm subprocess nobody used — closing a project must not leak one. */
export async function disposeWarmClaudeCode(): Promise<void> {
  const held = warm;
  warm = null;
  try {
    held?.handle.close();
  } catch {
    /* already gone */
  }
}

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
      // Last turn's reading, so the ring is populated from the first frame
      // rather than only once this turn produces its own.
      const carried = lastContext.get(projectDir);
      if (carried) yield { type: "context", context: carried };
      /**
       * Set when the in-flight context request lands. Never awaited: the CLI
       * answers it as it goes idle, so waiting would hold the turn open — and
       * the spinner up — for a status number.
       */
      let contextResult: { usedTokens: number; maxTokens: number } | null = null;
      let contextAsked = false;

      const [sdk, executable] = await loadToolchain();

      // A warm subprocess is usable only for a turn that starts fresh: its
      // options were fixed before this turn existed, and a resumed turn needs
      // a `resume` id that was not known then. Claimed rather than borrowed —
      // a WarmQuery is single-use.
      const claimed = warm?.dir === projectDir && !resumeSessionId ? warm : null;
      warm = null;

      activeTurn = { signal };
      const response = claimed
        ? claimed.handle.query(text)
        : sdk.query({
            prompt: text,
            options: {
              ...(await turnOptions(sdk, session, executable)),
              ...(resumeSessionId ? { resume: resumeSessionId } : {}),
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
              // The CLI folded its own history. Say so: this is the one moment
              // the context ring drops on its own, and without a word for it
              // that reads as the number being broken.
              if (message.subtype === "compact_boundary") {
                const meta = message.compact_metadata as
                  | { trigger?: string; pre_tokens?: number; post_tokens?: number }
                  | undefined;
                const before = meta?.pre_tokens;
                const after = meta?.post_tokens;
                const size =
                  typeof before === "number" && typeof after === "number"
                    ? ` (${Math.round(before / 1000)}k → ${Math.round(after / 1000)}k tokens)`
                    : "";
                yield {
                  type: "status",
                  text: `${meta?.trigger === "manual" ? "Compacted" : "Auto-compacted"} the conversation${size}`,
                };
                // The carried reading is now stale by a long way, and the next
                // one is a turn away. Drop it rather than show the old number.
                lastContext.delete(projectDir);
                contextAsked = false;
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
              // Started, not awaited. The control request queues behind the
              // model turn — measured at ~1.9s — so awaiting it here would
              // stall every tool card behind a status number. It is asked for
              // while the query is alive and collected once the turn is done.
              if (!contextAsked) {
                contextAsked = true;
                void readContextUsage(response).then((usage) => {
                  if (!usage) return;
                  contextResult = usage;
                  lastContext.set(projectDir, usage);
                });
              }
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
        // Leaving a finished turn's signal here would let a later callback
        // park on an abort that can never fire again.
        activeTurn = null;
      }

      // Whatever landed before the turn ended. If it did not, the reading is
      // kept and sent at the start of the next turn instead — a ring one turn
      // stale is worth more than a turn held open to freshen it.
      if (contextResult) yield { type: "context", context: contextResult };

      yield { type: "done", sessionId };
    },
  };
}
