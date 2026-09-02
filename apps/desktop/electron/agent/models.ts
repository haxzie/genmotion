import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { app } from "electron";
import { agentEnv, resolveExecutable } from "./detect";
import { loadAgentSdk } from "./load-sdk";
import type { HarnessId } from "./registry";

/**
 * Which models the picker can offer, asked of the harnesses themselves.
 *
 * Nothing here is a hardcoded list of model names. A list written into this
 * repo is wrong the week a model ships and stays wrong until someone notices,
 * and the person it fails is the one whose subscription already includes the
 * model they cannot select. Both CLIs know their own lineup, so both are asked:
 * Claude Code over the SDK's control channel, Codex out of the cache it
 * maintains for its own picker.
 */

export interface AgentModel {
  /** What gets passed to the CLI — an alias like `opus`, or a full slug. */
  id: string;
  /** "Opus (1M context)". */
  label: string;
  /** The versioned name — "Fable 5.1" — when the label doesn't carry it. */
  version: string | null;
  /** The model's own one-liner, for the row's tooltip. */
  detail: string;
  harness: HarnessId;
}

/**
 * The generation a row is on, when the name doesn't say.
 *
 * Claude Code names a row "Fable" and puts "Fable 5.1" at the front of its
 * description, before a `·`. That leading segment is the only place the picker
 * can learn which generation `Fable` — or, more to the point, `Default` —
 * currently means. Codex names its models "GPT-5.5" and needs none of this.
 *
 * Written as a read of a convention rather than a parse of a format: no digit,
 * or nothing the label doesn't already say, and the row simply goes without.
 */
function versionFrom(label: string, detail: string): string | null {
  const lead = detail.split("·")[0]?.trim() ?? "";
  if (!lead || !/\d/.test(lead) || lead === label) return null;
  return lead;
}

/**
 * What to offer when a harness cannot be asked.
 *
 * A CLI that isn't installed, a models cache that hasn't been written yet, a
 * subprocess that times out — none of them should leave the picker empty,
 * because an empty picker reads as "this app is broken" rather than "that CLI
 * isn't here". So each harness has a floor.
 *
 * These are aliases, not model ids, which is the whole reason it is safe to
 * write them down: `opus` and `sonnet` are a stable interface the CLI
 * documents in its own `--help`, and they keep meaning "the current one" long
 * after `claude-opus-5[1m]` has been replaced. Codex has no such aliases, so
 * its floor is the single row that needs no name at all.
 *
 * The empty id means "pass no model and let the CLI use its default", which is
 * exactly what a user gets in a terminal.
 */
const FALLBACK: Record<HarnessId, AgentModel[]> = {
  "claude-code": [
    { id: "", label: "Default", version: null, detail: "Whatever Claude Code runs by default", harness: "claude-code" },
    { id: "opus", label: "Opus", version: null, detail: "The most capable model", harness: "claude-code" },
    { id: "sonnet", label: "Sonnet", version: null, detail: "Efficient for routine tasks", harness: "claude-code" },
    { id: "haiku", label: "Haiku", version: null, detail: "Fastest for quick answers", harness: "claude-code" },
  ],
  codex: [
    { id: "", label: "Default", version: null, detail: "Whatever Codex runs by default", harness: "codex" },
  ],
};

/**
 * Long enough that the picker never waits on a subprocess, short enough that a
 * model released this morning is offered this afternoon. A stale list is also
 * refreshed in the background on every read, so this is the worst case rather
 * than the usual one.
 */
const TTL_MS = 12 * 60 * 60 * 1000;

interface Cached {
  /** Bumped when the row shape changes, so an older cache is simply re-fetched. */
  schema: number;
  fetchedAt: number;
  models: AgentModel[];
}

const SCHEMA = 2;

function cacheFile(): string {
  return path.join(app.getPath("userData"), "models-cache.json");
}

let memory: Cached | null = null;
let inFlight: Promise<AgentModel[]> | null = null;

/**
 * Claude Code's list, over the SDK's control channel.
 *
 * The prompt is an iterable that never yields, which is the whole trick: the
 * CLI starts, completes its handshake, and waits for input that never comes,
 * so the list costs a subprocess and no tokens. Measured at ~1.5s.
 */
async function claudeModels(): Promise<AgentModel[]> {
  const [sdk, executable] = await Promise.all([loadAgentSdk(), resolveExecutable("claude")]);
  if (!executable) return [];

  const idle = (async function* () {
    await new Promise(() => {});
  })();

  const response = sdk.query({
    prompt: idle,
    options: {
      cwd: app.getPath("userData"),
      pathToClaudeCodeExecutable: executable,
      env: agentEnv(),
      // The same reason the turn options set it: the user's own CLAUDE.md,
      // skills and hooks have nothing to do with which models exist.
      settingSources: [] as [],
    },
  });

  try {
    const models = await response.supportedModels();
    return models.map((model) => ({
      id: model.value,
      label: model.displayName,
      version: versionFrom(model.displayName, model.description),
      detail: model.description,
      harness: "claude-code" as const,
    }));
  } finally {
    // Closes the generator, which kills the subprocess. Without it the CLI sits
    // there waiting for a prompt for as long as the app runs.
    await response.return?.(undefined).catch(() => null);
  }
}

/** One row of `~/.codex/models_cache.json`, as far as this file cares. */
interface CodexModel {
  slug?: string;
  display_name?: string;
  description?: string;
  visibility?: string;
  supported_in_api?: boolean;
  priority?: number;
}

/**
 * Codex's list, out of the cache its own picker reads.
 *
 * Codex has no "list models" command, but it keeps this file up to date for
 * itself — so reading it is both accurate and free, and it says which models
 * are meant to be shown (`visibility: "list"` hides internal ones like
 * codex-auto-review).
 */
async function codexModels(): Promise<AgentModel[]> {
  const file = path.join(os.homedir(), ".codex", "models_cache.json");
  const raw = await fs.readFile(file, "utf8").catch(() => null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { models?: CodexModel[] };
    return (parsed.models ?? [])
      .filter((m) => m.slug && m.visibility === "list" && m.supported_in_api !== false)
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
      .map((m) => ({
        id: m.slug!,
        label: m.display_name ?? m.slug!,
        // Codex's names already carry it: "GPT-5.5", "GPT-5.4-Mini".
        version: null,
        detail: m.description ?? "",
        harness: "codex" as const,
      }));
  } catch {
    return [];
  }
}

async function collect(): Promise<AgentModel[]> {
  // Neither list is allowed to cost the other one: a Claude CLI that hangs
  // should not empty the Codex rows.
  const [claude, codex] = await Promise.all([
    claudeModels().catch(() => []),
    codexModels().catch(() => []),
  ]);
  return [...claude, ...codex];
}

async function readCache(): Promise<Cached | null> {
  if (memory) return memory;
  const raw = await fs.readFile(cacheFile(), "utf8").catch(() => null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Cached;
    if (!Array.isArray(parsed?.models) || parsed.schema !== SCHEMA) return null;
    memory = parsed;
    return parsed;
  } catch {
    return null;
  }
}

async function refresh(): Promise<AgentModel[]> {
  inFlight ??= collect()
    .then(async (models) => {
      // An empty answer is not worth caching over a good one: it means a CLI
      // was mid-install or busy, and the old list is closer to the truth.
      if (models.length === 0 && memory?.models.length) return memory.models;
      // Only ever what a harness actually said. Fallbacks are added on the way
      // out, so a bad afternoon cannot bake a floor into the cache and leave
      // the picker short a model until the TTL expires.
      memory = { schema: SCHEMA, fetchedAt: Date.now(), models };
      await fs
        .writeFile(cacheFile(), `${JSON.stringify(memory, null, 2)}\n`, "utf8")
        .catch(() => null);
      return models;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * Every model the picker can offer.
 *
 * Answers from cache when there is one, so opening the picker never waits on a
 * subprocess, and refreshes behind the answer when that cache has gone stale.
 */
export async function listModels(): Promise<AgentModel[]> {
  const cached = await readCache();
  const discovered = cached ? cached.models : await refresh().catch(() => []);
  if (cached && Date.now() - cached.fetchedAt > TTL_MS) void refresh();
  return withFallbacks(discovered);
}

/** Each harness's own answer, or its floor when it had none. */
function withFallbacks(discovered: AgentModel[]): AgentModel[] {
  return (Object.keys(FALLBACK) as HarnessId[]).flatMap((harness) => {
    const own = discovered.filter((model) => model.harness === harness);
    return own.length > 0 ? own : FALLBACK[harness];
  });
}

/** Fill the cache before anyone opens the picker. Best-effort, never awaited. */
export function warmModels(): void {
  void listModels().catch(() => null);
}
