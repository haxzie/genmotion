/**
 * Builds the published CLI: one ESM bundle with every `@genmotion/*`
 * workspace package inlined (none of them need publishing for the CLI to
 * work), the runtime dependencies left as imports, and the browser host
 * bundles the renderer loads next to it in `dist/browser/`.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const runtime = Object.keys(pkg.dependencies ?? {});

await fs.rm(path.join(root, "dist"), { recursive: true, force: true });

await build({
  entryPoints: [path.join(root, "src", "main.ts")],
  outfile: path.join(root, "dist", "main.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  jsx: "automatic",
  sourcemap: true,
  legalComments: "none",
  // Runtime deps stay imports; everything else (the workspace packages) is inlined.
  external: runtime.flatMap((d) => [d, `${d}/*`]),
  // Inlined CommonJS still calls `require`; give the ESM bundle one.
  banner: {
    js: 'import { createRequire as __gmCreateRequire } from "node:module"; const require = __gmCreateRequire(import.meta.url);',
  },
  logLevel: "warning",
});

const hosts = spawnSync(process.execPath, [path.join(root, "..", "render", "scripts", "build-browser.mjs"), path.join(root, "dist", "browser")], {
  stdio: "inherit",
});
if (hosts.status !== 0) process.exit(hosts.status ?? 1);

const size = (await fs.stat(path.join(root, "dist", "main.js"))).size;
console.log(`genmotion → dist/main.js (${(size / 1024).toFixed(0)} KB)`);
