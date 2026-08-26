import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Copy the Claude Agent SDK next to the compiled main process.
 *
 * It can't be bundled — it's ESM that locates files through `import.meta.url` —
 * so it ships as real files and is imported from disk at runtime. See
 * electron/agent/load-sdk.ts.
 */
export async function vendorAgentSdk() {
  const require = createRequire(path.join(root, "package.json"));
  const entry = require.resolve("@anthropic-ai/claude-agent-sdk");
  const source = path.dirname(entry);
  const target = path.join(root, "dist/vendor/claude-agent-sdk");

  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(path.dirname(target), { recursive: true });
  // `recursive` follows the pnpm symlink into the store and copies real files.
  await fs.cp(source, target, { recursive: true, dereference: true });
  return target;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(await vendorAgentSdk());
}
