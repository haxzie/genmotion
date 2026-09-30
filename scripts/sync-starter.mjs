/**
 * Regenerates `examples/three-starter` — the self-contained starter repo —
 * from `genmotion init`, so it is always exactly what a new user gets. CI
 * runs this and fails on a diff (`--check`).
 *
 *   node scripts/sync-starter.mjs           rewrite the example
 *   node scripts/sync-starter.mjs --check   fail if it has drifted
 */
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "examples", "three-starter");
const check = process.argv.includes("--check");

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "gm-starter-"));
const out = path.join(tmp, "three-starter");
const init = spawnSync(
  process.execPath,
  [path.join(root, "packages", "cli", "bin", "genmotion.js"), "init", out, "--yes", "--name", "Three.js starter", "--json"],
  { encoding: "utf8", env: { ...process.env, GENMOTION_FROM_SOURCE: "1" } },
);
if (init.status !== 0) {
  console.error(init.stdout, init.stderr);
  process.exit(1);
}

// What the starter repo has that a scaffold doesn't: CI that renders the video.
await fs.mkdir(path.join(out, ".github", "workflows"), { recursive: true });
await fs.writeFile(
  path.join(out, ".github", "workflows", "render.yml"),
  `# Checks and renders the video on every push; the MP4 is attached to the run.
name: Render
on:
  push:
  workflow_dispatch:

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npx genmotion check
      - run: npx genmotion render
      - uses: actions/upload-artifact@v4
        with:
          name: video
          path: exports/
`,
);
// Empty folders don't survive git.
for (const dir of ["assets", "components"]) await fs.writeFile(path.join(out, dir, ".gitkeep"), "");
await fs.rm(path.join(out, ".genmotion"), { recursive: true, force: true });

if (check) {
  const diff = spawnSync("diff", ["-r", target, out], { encoding: "utf8" });
  await fs.rm(tmp, { recursive: true, force: true });
  if (diff.status !== 0) {
    console.error(`examples/three-starter is out of date — run node scripts/sync-starter.mjs\n${diff.stdout}`);
    process.exit(1);
  }
  console.log("examples/three-starter is up to date");
} else {
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(out, target, { recursive: true });
  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`wrote ${path.relative(root, target)}`);
}
