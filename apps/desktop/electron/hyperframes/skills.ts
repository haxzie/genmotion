import path from "node:path";
import fs from "node:fs/promises";
import { skillsDir } from "./vendor";

/**
 * Make the skill pack visible to Codex from inside the project.
 *
 * Claude Code takes the pack as a plugin on the SDK options, so nothing is
 * written for it. Codex discovers skills from `.agents/skills/` under its
 * working directory, so each skill is symlinked there — symlinks rather than
 * copies because 20MB per project adds up, and because an app update should
 * change what the agent reads without touching every project. The folder is
 * in the scaffold's `.gitignore`: the links point into this machine's app.
 *
 * Re-run on every open, so a project made by an older build picks up the
 * current pack, and links to an app that has since moved are repaired.
 */
export async function linkSkillsIntoProject(projectDir: string): Promise<void> {
  const source = skillsDir();
  const target = path.join(projectDir, ".agents", "skills");
  await fs.mkdir(target, { recursive: true });

  const wanted = new Set(
    (await fs.readdir(source, { withFileTypes: true }).catch(() => []))
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  );

  // Only links we made are touched: a skill the user dropped in themselves
  // (a real directory) is theirs to keep.
  for (const entry of await fs.readdir(target, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isSymbolicLink()) continue;
    const link = path.join(target, entry.name);
    const current = await fs.readlink(link).catch(() => null);
    if (!wanted.has(entry.name) || current !== path.join(source, entry.name)) {
      await fs.rm(link, { force: true });
    }
  }

  for (const name of wanted) {
    const link = path.join(target, name);
    const exists = await fs.lstat(link).catch(() => null);
    if (exists) continue;
    await fs.symlink(path.join(source, name), link, "dir").catch(() => {});
  }
}
