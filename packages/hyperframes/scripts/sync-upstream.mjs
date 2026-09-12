import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

/**
 * Vendor the HyperFrames skill pack from upstream into `plugin/skills`.
 *
 * Pulled at the tag matching the `@hyperframes/core` this package depends on,
 * so the skills and the compiler describe the same release. Re-run after
 * bumping the dependency; the tag lands in `plugin/upstream.json` so a reviewer
 * can see what changed and where it came from.
 *
 * A few upstream skills are dropped (see `EXCLUDED` — mirrored in
 * `src/skills.ts`): they exist only to drive the CLI or Figma, neither of
 * which the desktop app has, and an agent that reads them will try.
 */
const EXCLUDED = new Set(["hyperframes-cli", "figma", "remotion-to-hyperframes"]);
const REPO = "heygen-com/hyperframes";

const version = require("@hyperframes/core/package.json").version;
const tag = process.argv[2] ?? `v${version}`;
const tarball = `https://codeload.github.com/${REPO}/tar.gz/refs/tags/${tag}`;

const work = await fs.mkdtemp(path.join(root, ".sync-"));
try {
  const archive = path.join(work, "src.tgz");
  const res = await fetch(tarball);
  if (!res.ok || !res.body) throw new Error(`GET ${tarball} → ${res.status}`);
  await pipeline(res.body, createWriteStream(archive));
  await run("tar", ["xzf", archive, "-C", work]);
  const [extracted] = (await fs.readdir(work)).filter((n) => n !== "src.tgz");
  const source = path.join(work, extracted, "skills");
  const target = path.join(root, "plugin", "skills");

  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
  const kept = [];
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (!entry.isDirectory() || EXCLUDED.has(entry.name)) continue;
    await fs.cp(path.join(source, entry.name), path.join(target, entry.name), { recursive: true });
    kept.push(entry.name);
  }
  // Apache-2.0 asks that the licence travel with the copy.
  await fs.copyFile(path.join(work, extracted, "LICENSE"), path.join(root, "plugin", "LICENSE"));
  await fs.writeFile(
    path.join(root, "plugin", "upstream.json"),
    `${JSON.stringify({ repo: REPO, tag, syncedAt: new Date().toISOString(), skills: kept.sort() }, null, 2)}\n`,
  );
  console.log(`synced ${kept.length} skills from ${REPO}@${tag}`);
} finally {
  await fs.rm(work, { recursive: true, force: true });
}
