/**
 * Bundles a render-host entry into one browser-ready IIFE — the same
 * `window.__gmInit`/`window.__gm` contract the desktop export window and
 * `apps/renderer` drive. Shared by `poster.mjs` (one frame) and
 * `render-video.mjs` (every frame), so there is exactly one place that knows
 * how to build it.
 *
 * One entry per engine, exactly as the desktop export keeps two bundles: a
 * three-engine scene evaluates against `three` + `@genmotion/three-engine`
 * and mounts a `WebGLRenderer`, where a react scene evaluates against react
 * and mounts the player. Nothing is shared between the two but the bridge.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));

const ENTRIES = {
  react: "render-host-entry.tsx",
  three: "render-host-entry-three.ts",
};

const cache = new Map();

/**
 * The host bundle for a project's engine. Cached, since a run over the whole
 * catalog otherwise rebuilds the same IIFE once per template.
 */
export async function hostBundle(engine = "react") {
  const entry = ENTRIES[engine];
  if (!entry) throw new Error(`No render host for engine "${engine}"`);

  const cached = cache.get(engine);
  if (cached) return cached;

  const result = await build({
    entryPoints: [path.join(here, "..", entry)],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  cache.set(engine, code);
  return code;
}
