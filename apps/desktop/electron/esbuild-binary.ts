import path from "node:path";
import { existsSync } from "node:fs";

/**
 * Point esbuild at the executable we ship.
 *
 * Must run before anything imports esbuild — `main.ts` imports this module
 * first for that reason. In the packaged app the binary is unpacked out of the
 * asar (code cannot be executed from inside an archive); in development esbuild
 * finds its own binary through node_modules and this is a no-op.
 */
if (!process.env.ESBUILD_BINARY_PATH) {
  const packed = path.join(__dirname, "../bin/esbuild");
  const unpacked = packed.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  if (existsSync(unpacked)) {
    process.env.ESBUILD_BINARY_PATH = unpacked;
  } else if (existsSync(packed)) {
    process.env.ESBUILD_BINARY_PATH = packed;
  }
}
