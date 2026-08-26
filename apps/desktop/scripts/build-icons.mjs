import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));

/** The sizes an .iconset needs; macOS picks per display density. */
const ICONSET = [
  [16, "icon_16x16.png"],
  [32, "icon_16x16@2x.png"],
  [32, "icon_32x32.png"],
  [64, "icon_32x32@2x.png"],
  [128, "icon_128x128.png"],
  [256, "icon_128x128@2x.png"],
  [256, "icon_256x256.png"],
  [512, "icon_256x256@2x.png"],
  [512, "icon_512x512.png"],
  [1024, "icon_512x512@2x.png"],
];

const CANVAS = 1024;

/**
 * Rasterise the app icons.
 *
 * Two possible sources. `build/icon-master.png` wins when it exists: artwork
 * that was drawn rather than described, which a vector can only approximate.
 * Otherwise `build/icon.svg` is re-rendered at every size — the better path
 * when it is available, because fine strokes turn to mush at 16px if they are
 * resampled from one bitmap instead of drawn again.
 *
 * A master is used exactly as supplied, filling the whole canvas. The inset and
 * corner radius macOS icons normally carry belong to the artwork here, not to
 * this script; `icon.svg` still carries its own.
 */
export async function buildIcons() {
  const sharp = require("sharp");
  const master = path.join(root, "build/icon-master.png");
  const raster = await fs.readFile(master).catch(() => null);
  const svg = raster ? null : await fs.readFile(path.join(root, "build/icon.svg"));

  const render = (size) =>
    raster
      ? sharp(raster).resize(size, size, { fit: "cover" }).png().toBuffer()
      : sharp(svg, { density: (72 * size) / CANVAS }).resize(size, size).png().toBuffer();

  // Cross-platform: electron-builder derives Windows and Linux icons from this.
  await fs.writeFile(path.join(root, "build/icon.png"), await render(1024));

  if (process.platform === "darwin") {
    const iconset = path.join(root, "build/icon.iconset");
    await fs.rm(iconset, { recursive: true, force: true });
    await fs.mkdir(iconset, { recursive: true });
    for (const [size, name] of ICONSET) {
      await fs.writeFile(path.join(iconset, name), await render(size));
    }
    await run("iconutil", ["-c", "icns", iconset, "-o", path.join(root, "build/icon.icns")]);
    await fs.rm(iconset, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildIcons();
  console.log("icons built");
}
