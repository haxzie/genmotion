import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild } from "vite";
import { buildMain } from "./build-main.mjs";
import { copyEsbuildBinary, copyFfmpegBinary } from "./copy-esbuild-binary.mjs";
import { buildRenderHost } from "./build-render-host.mjs";
import { buildIcons } from "./build-icons.mjs";
import { vendorAgentSdk } from "./vendor-agent-sdk.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await buildMain();
await copyEsbuildBinary();
await copyFfmpegBinary();
await buildRenderHost();
await buildIcons();
await vendorAgentSdk();
await viteBuild({ root, configFile: path.join(root, "vite.config.ts") });

console.log("desktop build complete");
