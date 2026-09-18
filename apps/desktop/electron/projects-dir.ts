import path from "node:path";
import fs from "node:fs/promises";
import { app } from "electron";

/**
 * Where projects live. The app owns this folder so creating a video never
 * involves a save dialog — you type what you want and it exists.
 *
 * `GM_PROJECTS_ROOT` points it elsewhere, for the same reason the templates
 * package honours `GM_TEMPLATES_DIR`: a test needs an empty workspace, and
 * `app.getPath("home")` does not follow `$HOME` on macOS.
 */
export function projectsRoot(): string {
  return process.env.GM_PROJECTS_ROOT ?? path.join(app.getPath("home"), ".genmotion", "projects");
}

async function exists(file: string): Promise<boolean> {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false);
}

/** A filesystem-safe folder for `name`, suffixed if it's taken. */
export async function allocateProjectDir(name: string): Promise<string> {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "untitled";
  const root = projectsRoot();
  await fs.mkdir(root, { recursive: true });
  for (let n = 0; n < 500; n++) {
    const dir = path.join(root, n === 0 ? slug : `${slug}-${n + 1}`);
    if (!(await exists(dir))) return dir;
  }
  return path.join(root, `${slug}-${Date.now()}`);
}

/**
 * Whether the projects folder holds any project at all.
 *
 * Direct children only — that is where the app puts them — and only ones
 * with a manifest: an empty folder left by a failed create is not a project.
 */
export async function hasAnyProject(): Promise<boolean> {
  const entries = await fs.readdir(projectsRoot(), { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await exists(path.join(projectsRoot(), entry.name, "project.json"))) return true;
  }
  return false;
}
