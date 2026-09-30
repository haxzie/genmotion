import { build } from "esbuild";

/**
 * Bundles a host entry into one self-contained IIFE: three, react, the player
 * and the scene evaluators all inlined, so the page needs nothing from the
 * network. Shared by the prebuild script and the from-source fallback.
 */
export async function buildBrowserBundle(entry: string, options: { minify?: boolean } = {}): Promise<string> {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    minify: options.minify ?? false,
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  const code = result.outputFiles[0]?.text;
  if (!code) throw new Error(`esbuild produced no output for ${entry}`);
  return code;
}
