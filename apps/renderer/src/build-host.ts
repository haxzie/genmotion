import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

let cached: string | null = null;

/** Bundle the render-host entry (React + player + evaluator) into one IIFE string. */
export async function buildRenderHostBundle(): Promise<string> {
  if (cached) return cached;
  const result = await build({
    entryPoints: [join(here, "render-host-entry.tsx")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    minify: false,
    logLevel: "silent",
  });
  cached = result.outputFiles[0]!.text;
  return cached;
}
