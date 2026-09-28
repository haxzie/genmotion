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
 *
 * The rule the rest of this file exists to keep: **every name the picker shows
 * is a name a harness said.** Not an alias we believe still points somewhere
 * sensible, not a generation we inferred — the harness's own words, or an
 * honest admission that we couldn't get them. A row reading "Opus" when the
 * CLI would have said "Opus 5.5" is the failure this is written against: it
 * looks like an answer, so nobody reports it as a bug, and the user quietly
 * believes their app doesn't have the new model.
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

export interface ModelList {
  models: AgentModel[];
  /**
   * Harnesses whose own list could not be read on the last attempt. Their rows,
   * if they have any, are the last ones they gave; the picker says so.
   */
  unread: HarnessId[];
}

/**
 * A capitalised name followed by a number — "Opus 5.5", "Fable 5.1", "GPT 6".
 *
 * Anchored, rather than hunted for anywhere in the sentence, because the
 * unanchored version happily reads "Supports 1" out of a description and puts
 * it in the picker as a version. Two anchors cover both shapes Claude Code
 * uses: the description that opens with the name ("Fable 5.1 · Most capable…")
 * and the default row's ("Use the default model (currently Opus 5.5)").
 */
const NAME = String.raw`[A-Z][\w.-]*(?: [A-Z][\w.-]*)* \d+(?:\.\d+)*`;
const LEADING_NAME = new RegExp(`^${NAME}`);
const CURRENT_NAME = new RegExp(String.raw`\bcurrently (?:the )?(${NAME})`);

/**
 * The generation a row is on, when the name doesn't say.
 *
 * Claude Code names a row "Fable" and puts "Fable 5.1" at the front of its
 * description, before a `·`. That leading segment is the only place the picker
 * can learn which generation `Fable` — or, more to the point, `Default` —
 * currently means. Codex names its models "GPT-5.5" and needs none of this.
 *
 * Only ever the harness's own words, narrowed: the whole segment used to be
 * taken verbatim, which put the sentence "Use the default model (currently
 * Opus 5.5 (1M context))" in the slot meant for "Opus 5.5". What comes back is
 * the model name inside it and nothing else — with the context window kept,
 * since on a 1M row that is part of which model you are choosing.
 */
function versionFrom(label: string, detail: string): string | null {
  const lead = detail.split("·")[0]?.trim() ?? "";
  const named = LEADING_NAME.exec(lead)?.[0] ?? CURRENT_NAME.exec(lead)?.[1];
  if (!named) return null;
  const version = /\b1M\b/i.test(lead) && !/1M/i.test(named) ? `${named} (1M context)` : named;
  return version === label ? null : version;
}

/**
 * What to offer when a harness has never answered.
 *
 * A CLI that isn't installed, a models cache that hasn't been written yet, a
 * subprocess that times out — none of them should leave the picker empty,
 * because an empty picker reads as "this app is broken" rather than "that CLI
 * isn't here". So each harness has a floor of exactly one row.
 *
 * It deliberately names no model. The floor used to carry `opus`/`sonnet`/
 * `haiku` on the reasoning that aliases keep meaning "the current one" — true
 * of what runs, but not of what the row *says*, and the row is the whole point
 * of a picker. Those three sat there reading "Opus", "Sonnet", "Haiku" with no
 * version under them and no sign anything had gone wrong, which is how a user
 * ends up reporting that the app is missing a model they in fact had.
 *
 * The empty id means "pass no model and let the CLI use its default", which is
 * exactly what a user gets in a terminal — the one row we can offer without
 * claiming to know a name.
 */
const FLOOR: Record<HarnessId, AgentModel> = {
  "claude-code": {
    id: "",
    label: "Default",
    version: null,
    detail: "Whatever Claude Code runs by default",
    harness: "claude-code",
  },
  codex: {
    id: "",
    label: "Default",
    version: null,
    detail: "Whatever Codex runs by default",
    harness: "codex",
  },
};

/**
 * How long a harness's answer is trusted before it is re-asked.
 *
 * Three hours, not the half-day this used to be: the cost of being early is a
 * ~1.5s subprocess nobody waits on, and the cost of being late is a user
 * looking at yesterday's lineup the morning a model ships. A stale list is
 * still served immediately and refreshed behind the answer, so this is the
 * window in which a new model can be missing, not a delay anyone sits through.
 */
const TTL_MS = 3 * 60 * 60 * 1000;

/**
 * And how long after a *failure* before trying again. Short, because a harness
 * that failed is one whose rows are currently missing or stale — the state
 * this file most wants to leave. Long enough not to spawn a subprocess every
 * time a menu opens.
 */
const RETRY_MS = 5 * 60 * 1000;

/** A hung CLI must not become a picker that never fills. */
const PROBE_TIMEOUT_MS = 20_000;

interface HarnessCache {
  fetchedAt: number;
  models: AgentModel[];
}

interface Cached {
  /** Bumped when the row shape changes, so an older cache is simply re-fetched. */
  schema: number;
  /**
   * Per harness, so a bad afternoon for one cannot discard the other's rows —
   * or, worse, get written over the top of good rows as an empty list.
   */
  harnesses: Partial<Record<HarnessId, HarnessCache>>;
}

const SCHEMA = 3;

const HARNESSES = Object.keys(FLOOR) as HarnessId[];

function cacheFile(): string {
  return path.join(app.getPath("userData"), "models-cache.json");
}

let memory: Cached | null = null;
/** When each harness last failed, so a failure has its own shorter cooldown. */
const failedAt = new Map<HarnessId, number>();
let inFlight: Promise<void> | null = null;

/** Never let one harness's subprocess hang the list. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms).unref?.()),
  ]);
}

/**
 * Claude Code's list, over the SDK's control channel.
 *
 * The prompt is an iterable that never yields, which is the whole trick: the
 * CLI starts, completes its handshake, and waits for input that never comes,
 * so the list costs a subprocess and no tokens. Measured at ~1.5s.
 */
async function claudeModels(): Promise<AgentModel[]> {
  const [sdk, executable] = await Promise.all([loadAgentSdk(), resolveExecutable("claude")]);
  if (!executable) throw new Error("claude is not on PATH");

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
    const models = await withTimeout(response.supportedModels(), PROBE_TIMEOUT_MS);
    if (models.length === 0) throw new Error("claude listed no models");
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
  const raw = await fs.readFile(file, "utf8");
  const parsed = JSON.parse(raw) as { models?: CodexModel[] };
  const models = (parsed.models ?? [])
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
  if (models.length === 0) throw new Error("codex listed no models");
  return models;
}

const PROBE: Record<HarnessId, () => Promise<AgentModel[]>> = {
  "claude-code": claudeModels,
  codex: codexModels,
};

async function readCache(): Promise<Cached> {
  if (memory) return memory;
  const raw = await fs.readFile(cacheFile(), "utf8").catch(() => null);
  const empty: Cached = { schema: SCHEMA, harnesses: {} };
  if (!raw) return (memory = empty);
  try {
    const parsed = JSON.parse(raw) as Cached;
    memory = parsed?.schema === SCHEMA && parsed.harnesses ? parsed : empty;
  } catch {
    memory = empty;
  }
  return memory;
}

/** Due for a re-ask: never answered, answer gone stale, or failed a while ago. */
function due(cache: Cached, harness: HarnessId, now: number): boolean {
  const failed = failedAt.get(harness);
  if (failed !== undefined && now - failed < RETRY_MS) return false;
  const entry = cache.harnesses[harness];
  return !entry || now - entry.fetchedAt > TTL_MS;
}

/**
 * Re-ask whichever harnesses are due, and keep what they say.
 *
 * A harness that fails keeps whatever it last said. Stale-but-real beats
 * invented, every time: "Opus 5.5" from yesterday is still the name of a model
 * the user has, while a floor row reading "Opus" is a claim about nothing.
 */
async function refresh(harnesses: HarnessId[]): Promise<void> {
  const cache = await readCache();
  await Promise.all(
    harnesses.map(async (harness) => {
      try {
        const models = await withTimeout(PROBE[harness](), PROBE_TIMEOUT_MS);
        cache.harnesses[harness] = { fetchedAt: Date.now(), models };
        failedAt.delete(harness);
      } catch {
        failedAt.set(harness, Date.now());
      }
    }),
  );
  memory = cache;
  await fs.writeFile(cacheFile(), `${JSON.stringify(cache, null, 2)}\n`, "utf8").catch(() => null);
}

/** One refresh at a time — several tabs opening the picker is still one probe. */
function refreshOnce(harnesses: HarnessId[]): Promise<void> {
  if (harnesses.length === 0) return Promise.resolve();
  inFlight ??= refresh(harnesses).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Every model the picker can offer.
 *
 * Answers from cache when there is one, so opening the picker never waits on a
 * subprocess, and refreshes behind the answer when that cache has gone stale.
 * A harness with nothing cached is waited for, once: the alternative is showing
 * a floor row on first launch and correcting it a second later.
 *
 * `force` is the picker's Retry — the user telling us the list is wrong, which
 * is better information than any cooldown of ours.
 */
export async function listModels(force = false): Promise<ModelList> {
  const cache = await readCache();
  const now = Date.now();

  if (force) {
    failedAt.clear();
    await refreshOnce(HARNESSES);
  } else {
    const missing = HARNESSES.filter((h) => !cache.harnesses[h]?.models.length && due(cache, h, now));
    const stale = HARNESSES.filter((h) => due(cache, h, now) && !missing.includes(h));
    // Nothing to show for a harness yet: worth the ~1.5s. Something to show:
    // show it, and let the re-ask land in the background.
    if (missing.length > 0) await refreshOnce([...missing, ...stale]);
    else if (stale.length > 0) void refreshOnce(stale);
  }

  const current = await readCache();
  const models: AgentModel[] = [];
  const unread: HarnessId[] = [];
  for (const harness of HARNESSES) {
    const own = current.harnesses[harness]?.models ?? [];
    models.push(...(own.length > 0 ? own : [FLOOR[harness]]));
    if (failedAt.has(harness)) unread.push(harness);
  }
  return { models, unread };
}

/** Fill the cache before anyone opens the picker. Best-effort, never awaited. */
export function warmModels(): void {
  void listModels().catch(() => null);
}
