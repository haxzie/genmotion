import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Copy what a HyperFrames project needs from this app next to the compiled
 * main process: the skill pack (a Claude Code plugin folder the agent is
 * pointed at) and `gsap.min.js` (served to compositions in place of the CDN).
 *
 * Real files, not symlinks, for the same reason as the agent SDK: a packaged
 * app has no `node_modules`, and electron-builder will not follow a symlink
 * out of the app. In development `electron/hyperframes/vendor.ts` resolves
 * both straight from the workspace instead.
 */
export async function vendorHyperframes() {
  const require = createRequire(path.join(root, "package.json"));
  const vendor = path.join(root, "dist/vendor");
  await fs.mkdir(vendor, { recursive: true });

  const pluginSource = path.join(
    path.dirname(require.resolve("@genmotion/hyperframes/package.json")),
    "plugin",
  );
  const pluginTarget = path.join(vendor, "hyperframes-plugin");
  await fs.rm(pluginTarget, { recursive: true, force: true });
  await fs.cp(pluginSource, pluginTarget, { recursive: true, dereference: true });

  await fs.copyFile(require.resolve("gsap/dist/gsap.min.js"), path.join(vendor, "gsap.min.js"));
  return vendor;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(await vendorHyperframes());
}
