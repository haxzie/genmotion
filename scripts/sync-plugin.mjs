/**
 * Regenerates the Claude Code plugin's skills (`plugins/genmotion/skills/`)
 * from their sources, so the plugin can never drift from the pack the CLI
 * and the desktop app ship:
 *
 * - every skill in `packages/skills/plugin/skills/`, copied as is;
 * - `make-video`, the plugin's entry skill, rendered by the CLI's own
 *   `renderProjectSkill` for an agent that has only the MCP server.
 *
 *   node scripts/sync-plugin.mjs           rewrite the plugin's skills
 *   node scripts/sync-plugin.mjs --check   fail if they have drifted
 */
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "plugins", "genmotion", "skills");
const pack = path.join(root, "packages", "skills", "plugin", "skills");
const check = process.argv.includes("--check");

// The renderer is TypeScript inside the CLI package; load it through the
// CLI's own tsx, the same way its bin runs from source.
const require = createRequire(path.join(root, "packages", "cli", "package.json"));
(await import(pathToFileURL(require.resolve("tsx/cjs/api")).href)).register();
(await import(pathToFileURL(require.resolve("tsx/esm/api")).href)).register();
const { renderProjectSkill } = await import(pathToFileURL(path.join(root, "packages", "cli", "src", "agents.ts")).href);

const out = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "gm-plugin-")), "skills");
await fs.cp(pack, out, { recursive: true });
await fs.mkdir(path.join(out, "make-video"), { recursive: true });
await fs.writeFile(
  path.join(out, "make-video", "SKILL.md"),
  renderProjectSkill({ name: "make-video", surfaces: ["mcp"], standalone: true }),
);

if (check) {
  const diff = spawnSync("diff", ["-r", target, out], { encoding: "utf8" });
  await fs.rm(path.dirname(out), { recursive: true, force: true });
  if (diff.status !== 0) {
    console.error(`plugins/genmotion/skills is out of date — run node scripts/sync-plugin.mjs\n${diff.stdout}`);
    process.exit(1);
  }
  console.log("plugins/genmotion/skills is up to date");
} else {
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(out, target, { recursive: true });
  await fs.rm(path.dirname(out), { recursive: true, force: true });
  console.log(`wrote ${path.relative(root, target)}`);
}
