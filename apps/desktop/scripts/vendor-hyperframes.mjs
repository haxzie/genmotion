import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Copy what a HyperFrames project needs from this app next to the compiled
 * main process: both skill packs (Claude Code plugin folders the agent is
 * pointed at), the generated skill catalog, and `gsap.min.js` (served to
 * compositions in place of the CDN).
 *
 * Real files, not symlinks, for the same reason as the agent SDK: a packaged
 * app has no `node_modules`, and electron-builder will not follow a symlink
 * out of the app. In development `electron/hyperframes/vendor.ts` resolves
 * them straight from the workspace instead.
 *
 * Two packs: `@genmotion/hyperframes` carries the authoring skills vendored
 * from upstream, `@genmotion/skills` carries the creative ones we write. Each
 * copy clears only its own target — one pack must never wipe the other.
 */
export async function vendorHyperframes() {
  const require = createRequire(path.join(root, "package.json"));
  const vendor = path.join(root, "dist/vendor");
  await fs.mkdir(vendor, { recursive: true });

  const copies = [
    ["@genmotion/hyperframes", "plugin", "hyperframes-plugin"],
    ["@genmotion/skills", "plugin", "genmotion-plugin"],
    ["@genmotion/skills", "generated", "genmotion-skills-meta"],
  ];
  for (const [pkg, sub, name] of copies) {
    const source = path.join(path.dirname(require.resolve(`${pkg}/package.json`)), sub);
    const target = path.join(vendor, name);
    await fs.rm(target, { recursive: true, force: true });
    await fs.cp(source, target, { recursive: true, dereference: true });
  }

  await fs.copyFile(require.resolve("gsap/dist/gsap.min.js"), path.join(vendor, "gsap.min.js"));
  return vendor;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(await vendorHyperframes());
}
