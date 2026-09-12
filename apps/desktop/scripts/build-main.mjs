import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

/**
 * The main process bundles everything it needs, including esbuild's JavaScript,
 * so the packaged app ships no `node_modules` at all — pnpm's symlinked layout
 * is more than electron-builder's packer can follow. Only `electron` (provided
 * by the runtime) and `fsevents` (an optional native module chokidar does
 * without) stay external. esbuild's platform executable is copied to
 * `dist/bin/esbuild` separately and located via ESBUILD_BINARY_PATH.
 */
export const mainBuildOptions = {
  absWorkingDir: root,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outExtension: { ".js": ".cjs" },
  external: ["electron", "fsevents", "@anthropic-ai/claude-agent-sdk"],
  plugins: [esbuildShim()],
  sourcemap: true,
  logLevel: "info",
};

/**
 * One esbuild in the bundle, ours, with its sync API switched off.
 *
 * `@hyperframes/core` depends on an older esbuild and calls `transformSync`
 * to strip comments from a composition's scripts. Two problems, both fatal in
 * a bundled main process: its own copy would drive the 0.28 binary at
 * `ESBUILD_BINARY_PATH` with 0.25's JavaScript (a version mismatch), and the
 * sync API itself starts a worker thread from `__filename` — which, once
 * bundled, is `main.cjs`, so the worker boots the whole Electron main process
 * again and the caller blocks on it forever.
 *
 * So every `esbuild` import resolves to a shim over the app's copy whose sync
 * entry points throw. The one caller in core catches and keeps the script as
 * written; everything of ours uses the async API, which spawns the binary as
 * a child process and is unaffected.
 */
function esbuildShim() {
  const real = require.resolve("esbuild");
  return {
    name: "esbuild-shim",
    setup(build) {
      build.onResolve({ filter: /^esbuild$/ }, () => ({ path: "esbuild", namespace: "esbuild-shim" }));
      build.onLoad({ filter: /.*/, namespace: "esbuild-shim" }, () => ({
        resolveDir: root,
        contents: `
          const real = require(${JSON.stringify(real)});
          const unavailable = (name) => () => {
            throw new Error(\`esbuild.\${name} is unavailable in the main process; use the async API\`);
          };
          module.exports = {
            ...real,
            transformSync: unavailable("transformSync"),
            buildSync: unavailable("buildSync"),
            formatMessagesSync: unavailable("formatMessagesSync"),
            analyzeMetafileSync: unavailable("analyzeMetafileSync"),
          };
        `,
      }));
    },
  };
}

export const entries = [
  { entryPoints: ["electron/main.ts"], outfile: "dist/main/main.cjs" },
  { entryPoints: ["electron/preload.ts"], outfile: "dist/main/preload.cjs" },
];

/**
 * Which deployment a packaged build signs in against.
 *
 * `electron/auth.ts` reads these from `process.env`, which is right in dev —
 * `scripts/dev.mjs` hands them to the child from the root `.env`, so changing
 * one is a relaunch away. A packaged app has no such environment: launched
 * from Finder it sees an empty `process.env` and falls back to the hosted API.
 * So a build meant for a local stack has to carry the URLs in the bundle.
 *
 * Only defined when actually set, so an ordinary release build keeps the
 * runtime lookup — and with it the hosted defaults — exactly as before.
 */
function cloudDefines() {
  return Object.fromEntries(
    ["GM_CLOUD_API_URL", "GM_CLOUD_WEB_URL"]
      .filter((name) => process.env[name])
      .map((name) => [`process.env.${name}`, JSON.stringify(process.env[name])]),
  );
}

export async function buildMain() {
  const define = cloudDefines();
  for (const [key, value] of Object.entries(define)) {
    console.log(`baking ${key.replace("process.env.", "")}=${JSON.parse(value)}`);
  }
  await Promise.all(
    entries.map((entry) => esbuild.build({ ...mainBuildOptions, ...entry, define })),
  );
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  await buildMain();
}
