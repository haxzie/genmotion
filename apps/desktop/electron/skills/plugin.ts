import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { app } from "electron";
import { resolveLooseSkills } from "./sources";

/**
 * Wrap the user's own skills as a Claude Code plugin.
 *
 * Claude Code takes skills as plugins, and a plugin is a directory holding
 * `.claude-plugin/plugin.json` beside a `skills/` folder. The user's skills
 * live in `<userData>/skills/<id>` and a project's in `<project>/skills/<id>`,
 * neither of which has that shape, so this builds the shape around them:
 * a throwaway folder of symlinks, rebuilt whenever the set changes.
 *
 * Symlinks rather than copies for the same reason Codex gets symlinks: the
 * real folder stays the one the user edits, and editing it takes effect on the
 * next turn without a reinstall.
 *
 * Codex needs none of this — it reads `.agents/skills/` directly (see
 * `../hyperframes/skills.ts`).
 */

function wrapperRoot(projectDir?: string): string {
  const key = projectDir ? createHash("sha256").update(projectDir).digest("hex").slice(0, 12) : "user";
  return path.join(app.getPath("userData"), "skill-plugins", key);
}

/**
 * Build (or refresh) the wrapper and return its path, or null when the user
 * has no skills of their own — an empty plugin is one more thing for the CLI
 * to scan and report.
 */
export async function userSkillPlugin(projectDir?: string): Promise<string | null> {
  const skills = await resolveLooseSkills(projectDir);
  const root = wrapperRoot(projectDir);
  if (skills.length === 0) {
    await fs.rm(root, { recursive: true, force: true });
    return null;
  }

  const skillsDir = path.join(root, "skills");
  await fs.rm(skillsDir, { recursive: true, force: true });
  await fs.mkdir(skillsDir, { recursive: true });
  await fs.mkdir(path.join(root, ".claude-plugin"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".claude-plugin", "plugin.json"),
    `${JSON.stringify(
      {
        name: "your-skills",
        version: "0.0.0",
        description: "Skills you imported, or that came with this project. Not written by GenMotion.",
        author: { name: "you" },
      },
      null,
      2,
    )}\n`,
  );

  for (const skill of skills) {
    await fs.symlink(skill.dir, path.join(skillsDir, skill.id), "dir").catch(() => {});
  }
  return root;
}

/** The ids in the wrapper, so the prompt can name them as not ours. */
export async function userSkillIds(projectDir?: string): Promise<string[]> {
  return (await resolveLooseSkills(projectDir)).map((s) => s.id);
}
