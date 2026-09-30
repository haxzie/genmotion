#!/usr/bin/env node
// Published builds run the bundled CLI. Inside the GenMotion monorepo there is
// no build, so the TypeScript source runs through tsx instead.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dist = new URL("../dist/main.js", import.meta.url);
if (existsSync(fileURLToPath(dist)) && !process.env.GENMOTION_FROM_SOURCE) {
  await import(dist.href);
} else {
  // Both hooks, as `tsx` itself installs them: workspace packages mix ESM
  // sources with CJS dependencies.
  (await import("tsx/cjs/api")).register();
  (await import("tsx/esm/api")).register();
  await import(new URL("../src/main.ts", import.meta.url).href);
}
