/**
 * Builds a publishable workspace package into `dist/`.
 *
 * Inside the monorepo every package exports its TypeScript source, so nothing
 * needs building to develop. A published package instead serves `dist/`: its
 * `publishConfig.exports` (which pnpm swaps in on publish) points at the files
 * this writes — one ESM module and one bundled `.d.ts` per export entry.
 *
 *   node ../../scripts/build-package.mjs      (run from the package folder)
 */
import path from "node:path";
import fs from "node:fs/promises";
import { build } from "tsup";

const cwd = process.cwd();
const pkg = JSON.parse(await fs.readFile(path.join(cwd, "package.json"), "utf8"));

const exportsField = typeof pkg.exports === "string" ? { ".": pkg.exports } : pkg.exports ?? {};
// Only what the published package exposes: a workspace-only entry (server
// code the monorepo imports from source) stays out of `dist/`.
const published = new Set(Object.keys(pkg.publishConfig?.exports ?? { ".": null }));
const entry = {};
for (const [key, target] of Object.entries(exportsField)) {
  if (!published.has(key)) continue;
  if (typeof target !== "string" || !/^\.\/src\/.+\.tsx?$/.test(target)) continue;
  const name = key === "." ? "index" : key.replace(/^\.\//, "");
  entry[name] = target;
}
if (Object.keys(entry).length === 0) {
  console.error(`${pkg.name}: no ./src/*.ts exports to build`);
  process.exit(1);
}

await fs.rm(path.join(cwd, "dist"), { recursive: true, force: true });
await build({
  entry,
  outDir: "dist",
  format: ["esm"],
  target: "es2022",
  platform: pkg.browser === false ? "node" : "neutral",
  dts: true,
  sourcemap: true,
  splitting: true,
  clean: false,
  treeshake: true,
  silent: true,
  // Every dependency and peer stays an import, so consumers dedupe `three`.
  external: [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})].flatMap((d) => [d, new RegExp(`^${d}/`)]),
  tsconfig: path.join(cwd, "tsconfig.json"),
});

console.log(`${pkg.name}: ${Object.keys(entry).map((e) => `dist/${e}.js`).join(", ")}`);
