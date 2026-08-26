import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * esbuild's JavaScript is bundled into the main process, but it drives a
 * platform executable that has to stay a real file. Copy it into `dist/bin` so
 * it lives inside the app directory: electron-builder refuses to pack anything
 * reached by following a symlink out of the app, which is exactly what shipping
 * pnpm's `node_modules/esbuild` would do.
 */
export async function copyEsbuildBinary() {
  const require = createRequire(path.join(root, "package.json"));
  // esbuild's own package.json points at lib/main.js; the binary is a sibling
  // of the package root, under the platform-specific optional dependency.
  const libMain = require.resolve("esbuild");
  const pkgRoot = path.resolve(path.dirname(libMain), "..");
  const platformPkg = `@esbuild/${process.platform}-${process.arch}`;
  const source = require.resolve(`${platformPkg}/bin/esbuild`, { paths: [pkgRoot] });

  const target = path.join(root, "dist/bin/esbuild");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
  await fs.chmod(target, 0o755);
  return target;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(await copyEsbuildBinary());
}

/**
 * ffmpeg encodes exported frames. Same reasoning as the esbuild binary: it has
 * to be a real, executable file outside the asar.
 */
export async function copyFfmpegBinary() {
  const require = createRequire(path.join(root, "package.json"));
  const source = require("ffmpeg-static");
  if (typeof source !== "string") throw new Error("ffmpeg-static did not resolve to a path");
  const target = path.join(root, "dist/bin/ffmpeg");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
  await fs.chmod(target, 0o755);
  return target;
}
