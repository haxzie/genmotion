import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import type * as AgentSdk from "@anthropic-ai/claude-agent-sdk";

export type AgentSdkModule = typeof AgentSdk;

let cached: Promise<AgentSdkModule> | null = null;

/**
 * Load the Claude Agent SDK at runtime instead of bundling it.
 *
 * The SDK is ESM and resolves paths from `import.meta.url`; compiled into the
 * main process's CJS bundle those lookups collapse and it fails at the first
 * call. So the package is copied next to the app at build time and imported
 * from disk, where its own paths are real again.
 */
export function loadAgentSdk(): Promise<AgentSdkModule> {
  cached ??= resolveEntry().then((entry) => {
    // A computed specifier: esbuild leaves this alone rather than trying to
    // inline the module.
    const dynamicImport = new Function("url", "return import(url)") as (
      url: string,
    ) => Promise<AgentSdkModule>;
    return dynamicImport(entry);
  });
  return cached;
}

async function resolveEntry(): Promise<string> {
  // Packaged: vendored beside the compiled main process, unpacked from the asar
  // because Node's ESM loader can't read an archive.
  const vendored = path.join(__dirname, "../vendor/claude-agent-sdk/sdk.mjs");
  const unpacked = vendored.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  for (const candidate of [unpacked, vendored]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }

  // Development: the workspace copy in node_modules.
  const require = createRequire(__filename);
  return pathToFileURL(require.resolve("@anthropic-ai/claude-agent-sdk")).href;
}
