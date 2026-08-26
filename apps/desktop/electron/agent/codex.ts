import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { ProjectSession } from "../project-session";
import { agentEnv, resolveExecutable } from "./detect";
import { MCP_TOKEN, MCP_TOKEN_ENV } from "./mcp-http";
import { buildCodexPreamble } from "./prompt";
import type { AgentBackend, AgentEvent, TurnInput } from "./types";

/**
 * Drives the user's own Codex CLI through `codex exec --json`, using whichever
 * credentials they signed in with.
 *
 * The CLI is spawned rather than driven through a bundled SDK: `exec --json` is
 * the stable, documented surface, and going through the binary on their PATH is
 * what makes the turn run on their subscription. Its JSONL events are
 * normalised into `AgentEvent`s, the same ones the Claude backend produces, so
 * the chat UI can't tell which harness answered.
 *
 * Containment works differently here, and better. The Claude backend vets every
 * file path in `canUseTool`, because that agent has no sandbox. Codex has one:
 * `--sandbox workspace-write` with the project as the working root means the OS
 * refuses writes outside the folder, whatever the model asks for. That also
 * settles the shell question — Claude's Bash tool is disabled because there is
 * no sanctioned way to install packages, and Codex reaches the same place from
 * the other side: its sandbox denies network access to commands, so `npm
 * install` fails on its own.
 */

/**
 * Everything is passed as config rather than flags because `exec resume` takes
 * a much smaller set of flags than `exec` does — no `--cd`, no `--sandbox` — and
 * one arg list that works for both is worth more than the shorter spelling. The
 * working directory comes from the spawned process's own cwd, which is also
 * what the sandbox takes as its writable root.
 */
const CONFIG: string[] = [
  'sandbox_mode="workspace-write"',
  // Pinned rather than left to default: this is what stops the agent reaching
  // the network from a shell — `npm install` and `curl` both fail — which is
  // the same stance the Claude backend takes by disabling Bash outright.
  // Research still works, through the model's own web search and `save_asset`.
  "sandbox_workspace_write.network_access=false",
  // Non-interactive: nothing can answer a prompt, so an approval request would
  // simply hang until it timed out and came back as "user cancelled".
  'approval_policy="never"',
  // Research is on for the same reason it is on for Claude — a brand video
  // written without looking at the brand invents its palette and its copy.
  "tools.web_search=true",
  // Most models default to no reasoning summary. Asking for one is what puts
  // the thinking trace in the chat.
  'model_reasoning_summary="auto"',
];

function mcpConfig(url: string): string[] {
  return [
    `mcp_servers.genmotion.url="${url}"`,
    `mcp_servers.genmotion.bearer_token_env_var="${MCP_TOKEN_ENV}"`,
    // Without this every call comes back "user cancelled MCP tool call": tool
    // approval is a separate gate from `approval_policy`, and there is no one
    // here to approve. These are our own tools, in our own process.
    'mcp_servers.genmotion.default_tools_approval_mode="approve"',
  ];
}

interface CodexItem {
  id?: string;
  type?: string;
  text?: string;
  summary?: string;
  command?: string;
  aggregated_output?: string;
  exit_code?: number | null;
  status?: string;
  server?: string;
  tool?: string;
  arguments?: unknown;
  result?: { content?: unknown } | null;
  error?: { message?: string } | null;
  changes?: { path?: string; kind?: string }[];
  query?: string;
  items?: unknown[];
}

interface CodexEvent {
  type?: string;
  thread_id?: string;
  item?: CodexItem;
  usage?: {
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
  };
  error?: { message?: string } | string;
}

/** The tool name the chat should render this item as. */
function toolNameFor(item: CodexItem): string | null {
  switch (item.type) {
    case "command_execution":
      return "Shell";
    case "file_change":
      return "FileChange";
    case "web_search":
      return "WebSearch";
    case "todo_list":
      return "TodoWrite";
    case "mcp_tool_call":
      // Reuse the Claude-side names so one presentation serves both harnesses.
      return item.server === "genmotion"
        ? `mcp__genmotion__${item.tool ?? "tool"}`
        : `${item.server ?? "mcp"}__${item.tool ?? "tool"}`;
    default:
      return null;
  }
}

/** Project-relative paths read better in a tool card than absolute ones. */
function relativeChanges(projectDir: string, changes: CodexItem["changes"]) {
  return (changes ?? []).map((change) => ({
    path: change.path ? path.relative(projectDir, change.path) || change.path : "",
    kind: change.kind ?? "update",
  }));
}

/** The input a tool card shows — shaped like the Claude tool it stands in for. */
function toolInputFor(item: CodexItem, projectDir: string): unknown {
  switch (item.type) {
    case "command_execution":
      return { command: item.command ?? "" };
    case "file_change":
      return { changes: relativeChanges(projectDir, item.changes) };
    case "web_search":
      return { query: item.query ?? "" };
    case "todo_list":
      return { todos: normaliseTodos(item.items) };
    case "mcp_tool_call":
      return item.arguments ?? {};
    default:
      return {};
  }
}

/**
 * Codex's plan items, in the shape the existing TodoWrite card reads. The field
 * names have moved between CLI versions, so take whichever is present rather
 * than rendering raw JSON at the user.
 */
function normaliseTodos(items: unknown[] | undefined): { content: string; status: string }[] {
  return (items ?? []).map((entry) => {
    const todo = (entry ?? {}) as Record<string, unknown>;
    const content = [todo.text, todo.content, todo.step, todo.title].find(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    const done =
      todo.completed === true ||
      todo.status === "completed" ||
      todo.status === "done";
    return {
      content: content ?? JSON.stringify(entry),
      status: done ? "completed" : typeof todo.status === "string" ? todo.status : "pending",
    };
  });
}

/** A human line for the status pill while an item runs. */
function statusFor(item: CodexItem, projectDir: string): string | null {
  switch (item.type) {
    case "command_execution":
      return "Running a command";
    case "file_change": {
      const changes = relativeChanges(projectDir, item.changes);
      const first = changes[0];
      if (!first?.path) return "Editing the project";
      const name = path.basename(first.path);
      const more = changes.length > 1 ? ` +${changes.length - 1}` : "";
      return `${first.kind === "add" ? "Writing" : first.kind === "delete" ? "Deleting" : "Editing"} ${name}${more}`;
    }
    case "web_search":
      return "Searching the web";
    case "todo_list":
      return "Planning";
    case "mcp_tool_call":
      switch (item.tool) {
        case "validate_scene":
          return "Checking the scene";
        case "project_overview":
          return "Reading the timeline";
        case "save_asset":
          return "Saving an asset";
        default:
          return item.tool ?? "Using a tool";
      }
    default:
      return null;
  }
}

/** The text a tool card shows as output. */
function toolOutputFor(item: CodexItem, projectDir: string): unknown {
  if (item.error?.message) return item.error.message;
  switch (item.type) {
    case "command_execution":
      return item.aggregated_output ?? "";
    case "file_change":
      return relativeChanges(projectDir, item.changes)
        .map((c) => `${c.kind} ${c.path}`)
        .join("\n");
    case "mcp_tool_call":
      return item.result?.content ?? "";
    default:
      return item.result?.content ?? item.text ?? "";
  }
}

function isFailed(item: CodexItem): boolean {
  if (item.error) return true;
  if (item.status === "failed") return true;
  return item.type === "command_execution" && typeof item.exit_code === "number" && item.exit_code !== 0;
}

export function createCodexBackend(session: ProjectSession, mcpUrl: string): AgentBackend {
  return {
    id: "codex",
    label: "Codex",

    async *startTurn({ text, resumeSessionId, signal }: TurnInput): AsyncIterable<AgentEvent> {
      const projectDir = session.dir;
      const executable = (await resolveExecutable("codex")) ?? "codex";

      let sessionId: string | null = resumeSessionId;
      // Codex emits whole assistant messages, not token deltas, and a turn
      // usually produces several. Blank-line them apart so the chat bubble
      // doesn't run its narration together.
      let wroteText = false;
      const started = new Set<string>();

      const baseArgs = [
        "--json",
        // A video project is a folder, not necessarily a repo.
        "--skip-git-repo-check",
        ...[...CONFIG, ...mcpConfig(mcpUrl)].flatMap((entry) => ["-c", entry]),
      ];

      const run = (resume: string | null) =>
        spawn(
          executable,
          resume
            ? ["exec", "resume", resume, ...baseArgs, "-"]
            : ["exec", ...baseArgs, "-"],
          {
            cwd: projectDir,
            env: { ...agentEnv(), [MCP_TOKEN_ENV]: MCP_TOKEN },
            stdio: ["pipe", "pipe", "pipe"],
          },
        );

      // The preamble rides along with the first message of a thread; a resumed
      // thread already has it in history.
      const opening = resumeSessionId ? text : `${buildCodexPreamble()}\n\n${text}`;

      // A resume can fail for reasons the user can't act on — the session log
      // was pruned, or the folder was opened on another machine. Falling back
      // to a fresh thread costs the conversation's memory; refusing the turn
      // costs the turn. A resume that *worked* always produces events, so an
      // empty failed run is the signal; a successful resume reports no
      // `thread.started` of its own, and keeps the id it was given.
      let attempt = await collect(run(resumeSessionId), opening, signal);
      if (resumeSessionId && attempt.failed && !signal.aborted) {
        yield { type: "status", text: "Starting a new Codex session" };
        sessionId = null;
        attempt = await collect(run(null), `${buildCodexPreamble()}\n\n${text}`, signal);
      }

      // Read the thread id before emitting anything. An error event ends the
      // stream where it is raised, so anything after it never runs — and losing
      // the id would silently start the next turn from scratch.
      for (const event of attempt.events) {
        if (event.type === "thread.started" && typeof event.thread_id === "string") {
          sessionId = event.thread_id;
        }
      }

      // Held back for the same reason, and reported once the id is safely out.
      let failure: string | null = attempt.failure;

      for (const event of attempt.events) {
        switch (event.type) {
          case "item.started":
          case "item.completed": {
            const item = event.item;
            if (!item) break;
            const done = event.type === "item.completed";

            if (item.type === "agent_message") {
              if (done && item.text) {
                yield { type: "text-delta", text: wroteText ? `\n\n${item.text}` : item.text };
                wroteText = true;
              }
              break;
            }

            if (item.type === "reasoning") {
              const thought = item.text ?? item.summary;
              if (done && thought) yield { type: "reasoning-delta", text: thought };
              break;
            }

            if (item.type === "error") {
              if (done) failure ??= item.text ?? "Codex reported an error";
              break;
            }

            const name = toolNameFor(item);
            const id = item.id;
            if (!name || !id) break;

            if (!started.has(id)) {
              started.add(id);
              const status = statusFor(item, projectDir);
              if (status) yield { type: "status", text: status };
              yield { type: "tool-start", id, name, input: toolInputFor(item, projectDir) };
            }

            if (done) {
              yield {
                type: "tool-end",
                id,
                output: toolOutputFor(item, projectDir),
                isError: isFailed(item),
              };
              // The preview watches the folder anyway, but saying so here means
              // the editor refetches the moment the write lands rather than
              // after the watcher's debounce.
              if (item.type === "file_change") yield { type: "project-touched" };
            }
            break;
          }

          case "turn.completed": {
            const usage = event.usage;
            if (usage) {
              yield {
                type: "usage",
                usage: {
                  // Codex counts cached tokens inside `input_tokens`; the chat's
                  // meter treats the two as disjoint, so take the cache out.
                  inputTokens: Math.max(
                    0,
                    (usage.input_tokens ?? 0) - (usage.cached_input_tokens ?? 0),
                  ),
                  outputTokens: usage.output_tokens,
                  cacheReadTokens: usage.cached_input_tokens,
                },
              };
            }
            break;
          }

          case "turn.failed":
          case "error": {
            const message =
              typeof event.error === "string" ? event.error : event.error?.message;
            failure ??= message ?? "Codex could not finish the turn";
            break;
          }

          default:
            break;
        }
      }

      yield { type: "done", sessionId };
      // A turn the user stopped isn't a failure worth writing into the chat.
      if (failure && !signal.aborted) yield { type: "error", message: failure };
    },
  };
}

interface Attempt {
  events: CodexEvent[];
  /** True when the CLI died without producing a single event. */
  failed: boolean;
  /** Set when the process failed in a way the event stream never reported. */
  failure: string | null;
}

/**
 * Run one `codex exec` to completion, collecting its events.
 *
 * Buffered rather than streamed because a failed resume has to be retried from
 * the top, and events already yielded to the chat can't be taken back. A turn's
 * JSONL is small — a few hundred lines — so holding it costs nothing, and the
 * user sees the same thing either way: Codex reports whole messages, so there
 * is no token-by-token stream to lose.
 */
function collect(
  child: ChildProcessWithoutNullStreams,
  prompt: string,
  signal: AbortSignal,
): Promise<Attempt> {
  return new Promise<Attempt>((resolve) => {
    const events: CodexEvent[] = [];
    let stdout = "";
    let stderr = "";
    let settled = false;

    const stop = () => {
      child.kill("SIGTERM");
      // A model mid-request won't always notice the term; don't leave it running
      // against the user's plan.
      setTimeout(() => child.kill("SIGKILL"), 2000).unref?.();
    };
    signal.addEventListener("abort", stop, { once: true });

    const finish = (failure: string | null) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", stop);
      resolve({ events, failed: events.length === 0 && failure !== null, failure });
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      const lines = stdout.split("\n");
      stdout = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          events.push(JSON.parse(line) as CodexEvent);
        } catch {
          /* not every line is an event — the CLI logs to stdout too */
        }
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      // Keep only the tail: a failing turn's stderr is mostly refresh warnings.
      stderr = `${stderr}${chunk}`.slice(-4000);
    });

    child.on("error", (err) => {
      finish(`Couldn't start Codex: ${err.message}`);
    });

    child.on("close", (code) => {
      if (signal.aborted) return finish(null);
      if (code === 0 || events.length > 0) return finish(null);
      finish(codexFailure(code, stderr));
    });

    child.stdin.on("error", () => {
      /* the CLI can exit before the prompt is written; `close` reports why */
    });
    child.stdin.end(prompt);
  });
}

/** Turn a bare exit code into something worth showing in a chat transcript. */
function codexFailure(code: number | null, stderr: string): string {
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    // Timestamped log lines are noise; the human-readable error isn't one.
    .filter((line) => line && !/^\d{4}-\d{2}-\d{2}T/.test(line));
  const detail = lines.slice(-3).join("\n");
  if (detail) return detail;
  return `Codex exited with code ${code ?? "unknown"}. Run \`codex login\` if you haven't signed in.`;
}
