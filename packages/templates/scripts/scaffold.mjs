/**
 * Write the scaffold files (package.json, tsconfig, dotfiles) into every
 * catalog folder, so each template is a project the app can open directly.
 *
 * They come from `@genmotion/project`'s own renderers rather than being typed
 * out here, so a template folder can never drift from what `createProject`
 * would have produced. Re-run after bumping DEFAULT_VERSIONS.
 *
 *   node --experimental-strip-types scripts/scaffold.mjs
 */
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  renderPackageJson,
  renderTsconfig,
  renderNpmrc,
  renderGitignore,
  renderAgentsMd,
} from "@genmotion/project";
import { SCENE_AUTHORING_GUIDE } from "@genmotion/ai/prompt";

const catalog = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "catalog");

for (const entry of await fs.readdir(catalog, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
  const dir = path.join(catalog, entry.name);
  const { name } = JSON.parse(await fs.readFile(path.join(dir, "project.json"), "utf8"));
  const meta = JSON.parse(await fs.readFile(path.join(dir, "template.json"), "utf8"));

  // The template's own AGENTS.md travels with a remix, so it is the first thing
  // the user's coding agent reads about the piece it inherited. Standard rules
  // from the scaffold, with what this particular video is on the front.
  const agents = renderAgentsMd({ projectName: name, authoringGuide: SCENE_AUTHORING_GUIDE })
    .replace(
      "A GenMotion video project.",
      `${meta.description}\n\nStarted from the **${meta.title}** template. A GenMotion video project.`,
    );

  await Promise.all([
    fs.writeFile(path.join(dir, "AGENTS.md"), agents, "utf8"),
    fs.writeFile(path.join(dir, "package.json"), renderPackageJson(name), "utf8"),
    fs.writeFile(path.join(dir, "tsconfig.json"), renderTsconfig(), "utf8"),
    fs.writeFile(path.join(dir, ".npmrc"), renderNpmrc(), "utf8"),
    fs.writeFile(path.join(dir, ".gitignore"), renderGitignore(), "utf8"),
  ]);
  console.log(`scaffolded ${entry.name}`);
}
