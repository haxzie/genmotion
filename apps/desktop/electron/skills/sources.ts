import path from "node:path";
import fs from "node:fs/promises";
import type { SkillSource } from "@genmotion/shared";
import { genmotionSkillsDir, skillsDir } from "../hyperframes/vendor";
import { projectSkillsRoot, readSkillSettings, skillsCacheRoot, userSkillsRoot } from "./store";

/**
 * Every skill folder the agent may read, in precedence order.
 *
 * Five origins now: the HyperFrames pack vendored from upstream, a cached
 * refresh of GenMotion's own pack (pulled from the API, see `refresh.ts`),
 * that same pack as bundled inside the app (the offline and first-run
 * fallback), skills the user imported, and skills committed with the
 * project. They are flat by the time Codex sees them (one directory of
 * symlinks), so a name can only belong to one of them, and the order below
 * decides which: the closer to the user, the higher it wins — except the
 * cache, which outranks the bundled copy precisely because it is meant to
 * replace it, not sit beside it.
 */

export interface ResolvedSkill {
  id: string;
  dir: string;
  source: SkillSource;
}

async function entriesIn(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name);
}

/**
 * Resolve the skills a session should see.
 *
 * `engine` gates the HyperFrames pack only: those skills describe composition
 * HTML, and a React project has no use for them. The GenMotion pack is
 * creative direction and applies to both.
 */
export async function resolveSkills(opts: {
  projectDir?: string;
  engine?: string;
}): Promise<ResolvedSkill[]> {
  const { disabled = [] } = await readSkillSettings();
  const off = new Set(disabled);

  const candidates: { root: string; source: SkillSource }[] = [];
  if (opts.projectDir) candidates.push({ root: projectSkillsRoot(opts.projectDir), source: "project" });
  candidates.push({ root: userSkillsRoot(), source: "user" });
  // The cache is checked before the bundled copy it exists to supersede; an
  // empty or absent cache directory (no refresh has ever landed, or it left
  // an id out) falls straight through to the bundled one below with no gap.
  candidates.push({ root: skillsCacheRoot(), source: "first-party" });
  candidates.push({ root: genmotionSkillsDir(), source: "first-party" });
  if (opts.engine === "hyperframes") candidates.push({ root: skillsDir(), source: "first-party" });

  const seen = new Map<string, ResolvedSkill>();
  for (const { root, source } of candidates) {
    for (const id of await entriesIn(root)) {
      if (seen.has(id) || off.has(id)) continue;
      seen.set(id, { id, dir: path.join(root, id), source });
    }
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Just the user's and the project's, which need a generated plugin wrapper. */
export async function resolveLooseSkills(projectDir?: string): Promise<ResolvedSkill[]> {
  return (await resolveSkills({ projectDir })).filter((s) => s.source !== "first-party");
}
