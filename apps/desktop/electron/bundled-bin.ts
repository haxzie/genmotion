import path from "node:path";
import { existsSync } from "node:fs";

/**
 * Absolute path to an executable this app ships itself — ffmpeg today,
 * esbuild the same way (see `esbuild-binary.ts`, which needs its own copy of
 * this fallback before anything imports esbuild).
 *
 * `dist/bin/<name>` in dev; once packaged, code cannot execute from inside the
 * asar, so electron-builder unpacks `dist/bin/**` next to it
 * (`Contents/Resources/app.asar.unpacked/dist/bin/<name>` on macOS) — see
 * `electron-builder.yml`'s `asarUnpack`. Both entry points bundle into the same
 * `main.cjs`, so `__dirname` here is that file's directory either way.
 */
export function bundledBinary(name: string): string {
  const packed = path.join(__dirname, "../bin", name);
  const unpacked = packed.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  return existsSync(unpacked) ? unpacked : packed;
}

/** The directory holding this app's bundled executables — for PATH, not exec. */
export function bundledBinDir(): string {
  return path.dirname(bundledBinary("ffmpeg"));
}
