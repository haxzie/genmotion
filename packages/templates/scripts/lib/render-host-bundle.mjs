/**
 * Bundles `render-host-entry.tsx` into one browser-ready IIFE — the same
 * `window.__gmInit`/`window.__gm` contract the desktop export window and
 * `apps/renderer` drive. Shared by `poster.mjs` (one frame) and
 * `render-video.mjs` (every frame), so there is exactly one place that knows
 * how to build it.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));

export async function hostBundle() {
  const result = await build({
    entryPoints: [path.join(here, "..", "render-host-entry.tsx")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  return result.outputFiles[0].text;
}
