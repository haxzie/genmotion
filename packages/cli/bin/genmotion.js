#!/usr/bin/env node
// Published builds run the bundled CLI. Inside the GenMotion monorepo there is
// no build, so the TypeScript source runs through tsx instead.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dist = new URL("../dist/main.js", import.meta.url);
const source = new URL("../src/main.ts", import.meta.url);
if (existsSync(fileURLToPath(dist)) && !process.env.GENMOTION_FROM_SOURCE) {
  await import(dist.href);
} else if (existsSync(fileURLToPath(source))) {
  // Both hooks, as `tsx` itself installs them: workspace packages mix ESM
  // sources with CJS dependencies.
  (await import("tsx/cjs/api")).register();
  (await import("tsx/esm/api")).register();
  await import(source.href);
} else {
  // Neither a build nor the source: a package published without running its
  // build (0.2.1 went out this way). Say so rather than failing on `tsx`.
  process.stderr.write(
    "genmotion: this copy of @genmotion/cli is missing its build (dist/). Install a fixed version:\n" +
      "  npx @genmotion/cli@latest …   or   npm install -g @genmotion/cli@latest\n",
  );
  process.exit(1);
}
