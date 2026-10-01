/**
 * Prebuilds the browser host bundles into `<outDir>/` so a published package
 * never needs to bundle them at runtime.
 *
 *   node scripts/build-browser.mjs dist/browser
 */
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] ?? path.join(here, "..", "dist", "browser"));
const entries = { "three-host": "three-host.ts", "react-host": "react-host.tsx" };

await fs.mkdir(outDir, { recursive: true });
for (const [name, file] of Object.entries(entries)) {
  await build({
    entryPoints: [path.join(here, "..", "src", "browser", file)],
    outfile: path.join(outDir, `${name}.js`),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    minify: true,
    legalComments: "none",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
}
console.log(`browser hosts → ${path.relative(process.cwd(), outDir)}`);
