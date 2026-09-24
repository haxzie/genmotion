import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

/**
 * Where this app keeps what a HyperFrames project borrows from it.
 *
 * Packaged: `dist/vendor/…`, copied by `scripts/vendor-hyperframes.mjs` and
 * unpacked from the asar (electron-builder's `asarUnpack`) because the agent
 * CLI reads the skill files as real paths. Development: the workspace copies,
 * so editing a skill or bumping gsap needs no rebuild.
 */
function vendored(name: string): string | null {
  const packed = path.join(__dirname, "../vendor", name);
  const unpacked = packed.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  for (const candidate of [unpacked, packed]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** A vendored folder, or the workspace package it was copied from. */
function packOrPackage(vendorName: string, pkg: string, sub: string): string {
  const shipped = vendored(vendorName);
  if (shipped) return shipped;
  const require = createRequire(__filename);
  return path.join(path.dirname(require.resolve(`${pkg}/package.json`)), sub);
}

/** The HyperFrames pack, as a Claude Code plugin folder. Vendored from upstream. */
export function pluginDir(): string {
  return packOrPackage("hyperframes-plugin", "@genmotion/hyperframes", "plugin");
}

/**
 * GenMotion's own pack, as a second plugin folder.
 *
 * Separate from the one above because that one is wiped and re-copied whenever
 * `@genmotion/hyperframes` syncs a new upstream tag; anything we wrote there
 * would not survive a version bump.
 */
export function genmotionPluginDir(): string {
  return packOrPackage("genmotion-plugin", "@genmotion/skills", "plugin");
}

/** The generated skill catalog and embeddings, beside the pack. */
export function skillMetaDir(): string {
  return packOrPackage("genmotion-skills-meta", "@genmotion/skills", "generated");
}

/** `skills/` inside a plugin — what Codex is pointed at, one symlink per skill. */
export function skillsDir(): string {
  return path.join(pluginDir(), "skills");
}

export function genmotionSkillsDir(): string {
  return path.join(genmotionPluginDir(), "skills");
}

let gsap: Promise<string> | null = null;

/** `gsap.min.js`, read once — served to every composition in place of the CDN. */
export function gsapSource(): Promise<string> {
  gsap ??= (async () => {
    const shipped = vendored("gsap.min.js");
    if (shipped) return fs.readFile(shipped, "utf8");
    const require = createRequire(__filename);
    return fs.readFile(require.resolve("gsap/dist/gsap.min.js"), "utf8");
  })();
  return gsap;
}
