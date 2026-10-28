import { projectEngineSchema, type ProjectEngine } from "@genmotion/project";
import { readSettings, update } from "./settings-store";

/**
 * What a new project starts from.
 *
 * The composer offers these on the start screen, so they are a property of the
 * machine rather than of any project — the same place the harness choice lives,
 * and the same file.
 */
export interface ProjectDefaults {
  width: number;
  height: number;
  fps: number;
  /** Which runtime a new project is written for. The start screen's picker sets it. */
  engine: ProjectEngine;
}

/**
 * 1080p at 30, on the Three.js engine — what a machine that has never touched
 * the picker creates.
 *
 * Only the default: `react` is a click away in the picker, every existing
 * project keeps the engine its manifest names, and a machine that has already
 * chosen keeps that choice (the stored value wins here) — unless it chose
 * `hyperframes`, which is no longer offered. See `OFFERED_ENGINES`.
 */
export const DEFAULT_PROJECT: ProjectDefaults = {
  width: 1920,
  height: 1080,
  fps: 30,
  engine: "three",
};

/** What is on disk: unvalidated, and possibly from a build that knew fewer fields. */
type StoredDefaults = { width?: number; height?: number; fps?: number; engine?: string };

/**
 * Engines a *new* project may be written for.
 *
 * Narrower than `projectEngineSchema`, which still has to accept every engine
 * the app can open — a HyperFrames project on disk is read, compiled,
 * previewed and exported exactly as before, and nothing here touches that.
 * This is only the creation side, and it is enforced here rather than in the
 * picker alone because the picker is a view of this value: a machine that
 * chose HyperFrames before it was withdrawn would otherwise go on creating
 * HyperFrames projects with no control left to change it.
 */
const OFFERED_ENGINES: readonly ProjectEngine[] = ["three", "react"];

/** Ceilings mirror `projectManifestSchema`, so a stored value is always writable. */
function sane(defaults: StoredDefaults | undefined): ProjectDefaults {
  const clamp = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
      ? value
      : fallback;
  const engine = projectEngineSchema.safeParse(defaults?.engine);
  const offered = engine.success && OFFERED_ENGINES.includes(engine.data);
  return {
    width: clamp(defaults?.width, 1, 7680, DEFAULT_PROJECT.width),
    height: clamp(defaults?.height, 1, 4320, DEFAULT_PROJECT.height),
    fps: clamp(defaults?.fps, 1, 120, DEFAULT_PROJECT.fps),
    engine: offered ? engine.data : DEFAULT_PROJECT.engine,
  };
}

export async function projectDefaults(): Promise<ProjectDefaults> {
  return sane((await readSettings()).defaults);
}

export async function setProjectDefaults(
  next: Partial<ProjectDefaults>,
): Promise<ProjectDefaults> {
  const merged = sane({ ...(await readSettings()).defaults, ...next });
  await update((settings) => ({ ...settings, defaults: merged }));
  return merged;
}

/**
 * Whether first-run onboarding has been through.
 *
 * A property of the machine rather than of the account: what it sets up — which
 * coding agent drives the chat, which MCP servers this install may reach — is
 * stored on this machine, so a second Mac signed into the same account has its
 * own first run to do.
 */
export async function onboardingState(): Promise<{ completed: boolean }> {
  const settings = await readSettings();
  // A machine that already chose a harness has been using the app since before
  // the walkthrough existed, and has nothing to be walked through. Without
  // this, shipping onboarding would put it in front of every existing install
  // exactly once, which is the one audience it is not for.
  return { completed: typeof settings.onboardedAt === "number" || typeof settings.harness === "string" };
}

export async function completeOnboarding(): Promise<{ completed: boolean }> {
  await update((settings) => ({ ...settings, onboardedAt: Date.now() }));
  return { completed: true };
}
