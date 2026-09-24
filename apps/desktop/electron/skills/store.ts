import path from "node:path";
import { app } from "electron";
import { readSettings, update } from "../settings-store";

/**
 * Which skills this machine has, and which of them are switched on.
 *
 * Two kinds live here. A **bundled** skill ships inside the app and can only
 * be disabled, never removed; the registry records nothing about it except
 * when the user has switched it off. An **installed** skill is a folder the
 * user brought in, under `<userData>/skills/<id>`, and the registry is the
 * only record that it exists.
 *
 * Both sit in `settings.json`, through the same serialised writer as every
 * other preference, for the same reason `mcp/store.ts` does: a second file
 * would race with it and lose.
 */

export interface InstalledSkill {
  /** Folder name, and the handle the agent calls the skill by. */
  id: string;
  /** Where it came from, for the "Remove" affordance and the detail panel. */
  origin: { kind: "folder" | "zip" | "git"; ref: string };
  installedAt: number;
  /** The sidecar's version at install time. Informational. */
  version: string;
}

export interface SkillSettings {
  /** Ids switched off, bundled or installed. Absent means every skill is on. */
  disabled?: string[];
  installed?: InstalledSkill[];
  /** The first-party pack's revision last written to `skillsCacheRoot()`. */
  cachedRevision?: string;
}

/** Where an imported skill's folder lives. */
export function userSkillsRoot(): string {
  return path.join(app.getPath("userData"), "skills");
}

/**
 * Where the first-party pack lands when it is refreshed from the API.
 *
 * Separate from `userSkillsRoot()`: this directory is ours to overwrite
 * wholesale on every refresh, where a user's own imports are never touched
 * by anything but them. Absent, or stale against `cachedRevision`, is a
 * normal state — the bundled copy inside the app is the fallback either way.
 */
export function skillsCacheRoot(): string {
  return path.join(app.getPath("userData"), "skills-cache");
}

/** A project's own skills, committed with it. Not `.agents/`, which is derived. */
export function projectSkillsRoot(projectDir: string): string {
  return path.join(projectDir, "skills");
}

export async function cachedRevision(): Promise<string | undefined> {
  return (await readSkillSettings()).cachedRevision;
}

export async function setCachedRevision(revision: string): Promise<void> {
  await update((settings) => ({ ...settings, skills: { ...settings.skills, cachedRevision: revision } }));
}

export async function readSkillSettings(): Promise<SkillSettings> {
  return (await readSettings()).skills ?? {};
}

export async function isDisabled(id: string): Promise<boolean> {
  return ((await readSkillSettings()).disabled ?? []).includes(id);
}

export async function setEnabled(id: string, enabled: boolean): Promise<void> {
  await update((settings) => {
    const skills = settings.skills ?? {};
    const disabled = new Set(skills.disabled ?? []);
    if (enabled) disabled.delete(id);
    else disabled.add(id);
    return { ...settings, skills: { ...skills, disabled: [...disabled].sort() } };
  });
}

export async function recordInstall(entry: InstalledSkill): Promise<void> {
  await update((settings) => {
    const skills = settings.skills ?? {};
    const installed = (skills.installed ?? []).filter((s) => s.id !== entry.id);
    return { ...settings, skills: { ...skills, installed: [...installed, entry] } };
  });
}

export async function forgetInstall(id: string): Promise<void> {
  await update((settings) => {
    const skills = settings.skills ?? {};
    const disabled = (skills.disabled ?? []).filter((d) => d !== id);
    return {
      ...settings,
      skills: { ...skills, disabled, installed: (skills.installed ?? []).filter((s) => s.id !== id) },
    };
  });
}
