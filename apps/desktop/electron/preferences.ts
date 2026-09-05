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
}

/** 1080p at 30 — what `createProject` falls back to when nothing is passed. */
export const DEFAULT_PROJECT: ProjectDefaults = { width: 1920, height: 1080, fps: 30 };

/** Ceilings mirror `projectManifestSchema`, so a stored value is always writable. */
function sane(defaults: Partial<ProjectDefaults> | undefined): ProjectDefaults {
  const clamp = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
      ? value
      : fallback;
  return {
    width: clamp(defaults?.width, 1, 7680, DEFAULT_PROJECT.width),
    height: clamp(defaults?.height, 1, 4320, DEFAULT_PROJECT.height),
    fps: clamp(defaults?.fps, 1, 120, DEFAULT_PROJECT.fps),
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
