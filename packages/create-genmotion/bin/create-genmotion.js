#!/usr/bin/env node
// `npm create genmotion my-video` → `genmotion init my-video`. Everything
// after the folder is passed through (--template, --size, --fps, --yes, …).
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const bin = path.join(path.dirname(require.resolve("genmotion/package.json")), "bin", "genmotion.js");
const result = spawnSync(process.execPath, [bin, "init", ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(result.status ?? 1);
