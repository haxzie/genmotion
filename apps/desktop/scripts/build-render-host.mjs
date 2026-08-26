import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Bundle the offscreen render page's entry into one IIFE, injected into a blank
 * page at export time. Built here rather than at runtime because the packaged
 * app has no .tsx sources on disk.
 */
export async function buildRenderHost() {
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: ["electron/export/render-host-entry.tsx"],
    outfile: "dist/main/render-host.js",
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome130",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
}

if (import.meta.url === `file://${process.argv[1]}`) await buildRenderHost();
