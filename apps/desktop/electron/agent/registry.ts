import { detectAgents } from "./detect";
import { listModels, type AgentModel } from "./models";
import type { AgentAvailability } from "./types";
import { readSettings, update, type Settings } from "../settings-store";

export type HarnessId = "claude-code" | "codex";

export interface HarnessOption extends AgentAvailability {
  /** False while a harness is detected but this build can't drive it yet. */
  supported: boolean;
  /** Why it can't be selected, when it can't. */
  unavailableReason: string | null;
}

export interface HarnessState {
  active: HarnessId;
  /** The model driving the chat, or null to let the harness pick its default. */
  activeModel: string | null;
  options: HarnessOption[];
  /** Every model the picker can offer, across harnesses. */
  models: AgentModel[];
}

const DEFAULT: HarnessId = "claude-code";

function storedHarness(settings: Settings): HarnessId | null {
  return settings.harness === "claude-code" || settings.harness === "codex"
    ? settings.harness
    : null;
}

/**
 * Which harnesses this machine could use, and which one is driving the chat.
 *
 * Detection runs per call rather than being cached at launch: a user who
 * installs Claude Code while the app is open should see it appear when they
 * open the picker, not after a restart.
 */
export async function harnessState(): Promise<HarnessState> {
  const detected = await detectAgents();
  const missing: Record<string, string> = {
    "claude-code": "Not found on PATH — install Claude Code and sign in.",
    codex: "Not found on PATH — install the Codex CLI and run codex login.",
  };
  const options: HarnessOption[] = detected.map((agent) => ({
    ...agent,
    supported: true,
    unavailableReason: agent.installed ? null : (missing[agent.id] ?? agent.detail),
  }));

  const settings = await readSettings();
  const stored = storedHarness(settings);
  const usable = options.find((o) => o.id === stored && o.supported && o.installed);
  const fallback = options.find((o) => o.supported && o.installed);
  const active = usable?.id ?? fallback?.id ?? DEFAULT;

  const models = await listModels().catch(() => []);
  // A stored model that the harness no longer lists — renamed, retired, or
  // chosen on another machine — falls back to the harness's own default rather
  // than being sent as-is and failing at the first turn.
  const chosen = settings.models?.[active];
  const activeModel =
    chosen && models.some((m) => m.harness === active && m.id === chosen) ? chosen : null;

  return { active, activeModel, options, models };
}

/**
 * Pick what drives the chat.
 *
 * Model and harness move together because the picker presents them together:
 * choosing "Sonnet" is choosing Claude Code, and there is no sensible state
 * where the harness is Codex and the model is a Claude one.
 */
export async function setHarness(id: HarnessId, model?: string | null): Promise<HarnessState> {
  const state = await harnessState();
  const option = state.options.find((o) => o.id === id);
  if (!option?.supported || !option.installed) {
    throw new Error(option?.unavailableReason ?? `Unknown harness ${id}`);
  }
  if (model && !state.models.some((m) => m.harness === id && m.id === model)) {
    throw new Error(`${option.label} does not offer a model called ${model}.`);
  }

  await update((settings) => {
    const models = { ...settings.models };
    if (model) models[id] = model;
    return { ...settings, harness: id, models };
  });
  return { ...state, active: id, activeModel: model ?? state.activeModel };
}

/** The model the next turn should run on, or null for the harness's default. */
export async function activeModel(harness: HarnessId): Promise<string | null> {
  const state = await harnessState();
  if (state.active !== harness) return null;
  return state.activeModel;
}
