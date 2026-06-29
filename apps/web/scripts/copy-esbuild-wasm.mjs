import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const wasmPath = require.resolve("esbuild-wasm/esbuild.wasm");
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "esbuild.wasm");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(wasmPath, dest);
console.log("Copied esbuild.wasm →", dest);
