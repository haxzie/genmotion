import path from "node:path";
import fs from "node:fs/promises";
import { app } from "electron";
import { detectAgents } from "./detect";
import type { AgentAvailability } from "./types";

export type HarnessId = "claude-code" | "codex";

export interface HarnessOption extends AgentAvailability {
  /** False while a harness is detected but this build can't drive it yet. */
  supported: boolean;
  /** Why it can't be selected, when it can't. */
  unavailableReason: string | null;
}

export interface HarnessState {
  active: HarnessId;
  options: HarnessOption[];
}

const DEFAULT: HarnessId = "claude-code";

function settingsFile(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

async function readSetting(): Promise<HarnessId | null> {
  const raw = await fs.readFile(settingsFile(), "utf8").catch(() => null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { harness?: unknown };
    return parsed.harness === "claude-code" || parsed.harness === "codex"
      ? parsed.harness
      : null;
  } catch {
    return null;
  }
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

  const stored = await readSetting();
  const usable = options.find((o) => o.id === stored && o.supported && o.installed);
  const fallback = options.find((o) => o.supported && o.installed);
  return { active: usable?.id ?? fallback?.id ?? DEFAULT, options };
}

export async function setHarness(id: HarnessId): Promise<HarnessState> {
  const state = await harnessState();
  const option = state.options.find((o) => o.id === id);
  if (!option?.supported || !option.installed) {
    throw new Error(option?.unavailableReason ?? `Unknown harness ${id}`);
  }
  await fs.writeFile(settingsFile(), `${JSON.stringify({ harness: id }, null, 2)}\n`, "utf8");
  return { ...state, active: id };
}
