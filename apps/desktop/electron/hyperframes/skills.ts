import path from "node:path";
import fs from "node:fs/promises";
import { resolveSkills } from "../skills/sources";

/**
 * Make the skills visible to Codex from inside the project.
 *
 * Claude Code takes them as plugins on the SDK options, so nothing is written
 * for it. Codex discovers skills from `.agents/skills/` under its working
 * directory, so each one is symlinked there — symlinks rather than copies
 * because 20MB per project adds up, and because an app update should change
 * what the agent reads without touching every project. The folder is in the
 * scaffold's `.gitignore`: the links point into this machine's app.
 *
 * Four sources feed it now (`../skills/sources.ts` owns the precedence), and
 * `.agents/skills` is flat, so a name can belong to only one of them. A link
 * whose target moved between sources is re-pointed rather than left stale.
 *
 * Re-run on every open, so a project made by an older build picks up the
 * current packs, links to an app that has since moved are repaired, and a
 * skill the user has just switched off disappears.
 */
export async function linkSkillsIntoProject(projectDir: string, engine?: string): Promise<void> {
  const wanted = new Map((await resolveSkills({ projectDir, engine })).map((s) => [s.id, s.dir]));
  const target = path.join(projectDir, ".agents", "skills");
  await fs.mkdir(target, { recursive: true });

  // Only links we made are touched: a skill the user dropped in themselves
  // (a real directory) is theirs to keep.
  for (const entry of await fs.readdir(target, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isSymbolicLink()) continue;
    const link = path.join(target, entry.name);
    const current = await fs.readlink(link).catch(() => null);
    if (wanted.get(entry.name) !== current) await fs.rm(link, { force: true });
  }

  for (const [id, dir] of wanted) {
    const link = path.join(target, id);
    const exists = await fs.lstat(link).catch(() => null);
    if (exists) continue;
    await fs.symlink(dir, link, "dir").catch(() => {});
  }
}
