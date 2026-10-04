import path from "node:path";
import fs from "node:fs/promises";
import { COMPONENTS_DIR, MANIFEST_FILE, SCENES_DIR } from "./paths";
import { ProjectError, readManifest, writeManifest } from "./project";

/**
 * Forking a library scene into a project: the scene file, every module it
 * imports and every asset those import, copied in and registered.
 *
 * Why copy instead of describe: agents shown a template scene and told to
 * "borrow the idea" rebuilt it from scratch in one pass and lost what made it
 * good — the camera curve, the motion blur, the grain, the timing tuned over
 * many passes. Forking keeps all of that; the agent's job becomes re-skinning
 * (copy, brand colours, logos, data), which is the part it does well.
 *
 * A template's own files are namespaced under the template's id
 * (`components/<template>/…`, `assets/<template>/…`), so two forks from
 * different templates never collide and two from the same template share
 * their components — including any re-skin already done to them.
 */

export interface SceneForkFile {
  /** Template-relative, forward-slashed. */
  path: string;
  encoding: "text" | "base64";
  contents: string;
}

export interface SceneFork {
  /** `<template>/<scene stem>`. */
  id: string;
  template: string;
  engine: "three" | "react" | "hyperframes";
  fps: number;
  width: number;
  height: number;
  title: string;
  durationInFrames: number;
  /** The scene file first, then its imports. */
  files: SceneForkFile[];
}

export interface ForkSceneInput {
  projectDir: string;
  fork: SceneFork;
  /** Scene name in project.json. Defaults to the fork's title. */
  name?: string;
  /** Insert after this scene (file or name). Appends when omitted. */
  after?: string;
  /** Replace the project scene with this file (or name) instead of adding one. */
  replace?: string;
}

export interface ForkedScene {
  file: string;
  name: string;
  durationInFrames: number;
  /** Files written. */
  written: string[];
  /** Already present and identical. */
  unchanged: string[];
  /**
   * Already present and different — kept as they are, because the usual
   * reason is that the agent re-skinned a shared component for an earlier
   * fork from this template, and overwriting would undo it.
   */
  kept: string[];
  /** The replaced scene's file, deleted because nothing references it any more. */
  removed: string[];
  warnings: string[];
}

const CODE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const P = path.posix;

function stemOf(file: string): string {
  return P.basename(file).replace(/\.[^.]+$/, "");
}

/** Where a template file lands in the project. */
function destinationOf(original: string, sceneFile: string, newSceneFile: string, template: string): string {
  if (original === sceneFile) return newSceneFile;
  const [top, ...rest] = original.split("/");
  // Another scene file imported as a module (a shared constant, a handoff
  // pose) becomes a component: it must not land in scenes/ looking like a
  // scene nobody registered.
  if (top === SCENES_DIR) return P.join(COMPONENTS_DIR, template, "from-scenes", ...rest);
  return P.join(top!, template, ...rest);
}

/** Resolve a relative specifier against the fork's own file list. */
function resolveIn(files: Set<string>, fromFile: string, specifier: string): string | null {
  const base = P.normalize(P.join(P.dirname(fromFile), specifier));
  const candidates = P.extname(base) && files.has(base)
    ? [base]
    : [base, ...CODE_EXT.map((e) => base + e), ...CODE_EXT.map((e) => P.join(base, `index${e}`))];
  return candidates.find((c) => files.has(c)) ?? null;
}

const SPECIFIER = /(\bfrom\s+|\bimport\s+|\bimport\(\s*)(["'])(\.{1,2}\/[^"']+)\2/g;

/** Rewrite every relative import in `source` for the file's new home. */
export function rewriteImports(
  source: string,
  originalFile: string,
  newFile: string,
  files: Set<string>,
  destination: (original: string) => string,
): string {
  return source.replace(SPECIFIER, (match, lead: string, quote: string, specifier: string) => {
    const target = resolveIn(files, originalFile, specifier);
    if (!target) return match;
    let next = P.relative(P.dirname(newFile), destination(target));
    if (!next.startsWith(".")) next = `./${next}`;
    // Keep the specifier's own style: extensionless stays extensionless.
    if (!P.extname(specifier) && CODE_EXT.includes(P.extname(next))) next = next.slice(0, -P.extname(next).length);
    return `${lead}${quote}${next}${quote}`;
  });
}

async function exists(file: string): Promise<boolean> {
  return fs.stat(file).then(() => true, () => false);
}

export async function forkScene(input: ForkSceneInput): Promise<ForkedScene> {
  const { projectDir, fork } = input;
  const manifest = await readManifest(projectDir);
  const engine = manifest.engine ?? "react";
  if (engine === "hyperframes" || fork.engine === "hyperframes") {
    throw new ProjectError("Forking scenes works for Three.js and React projects, not HyperFrames.");
  }
  if (engine !== fork.engine) {
    throw new ProjectError(
      `${fork.id} is a ${fork.engine} scene and this project is ${engine}. Its code won't run here; borrow its idea and timing instead, or pick a ${engine} scene (search with engine=${engine}).`,
    );
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(fork.template)) throw new ProjectError(`Not a template id: ${fork.template}`);

  const sceneFile = fork.files[0]?.path;
  if (!sceneFile) throw new ProjectError(`${fork.id} carries no files`);
  for (const f of fork.files) {
    const normal = P.normalize(f.path);
    if (normal !== f.path || normal.startsWith("..") || P.isAbsolute(normal) || normal.split("/")[0]?.startsWith(".")) {
      throw new ProjectError(`${fork.id} carries an unsafe path: ${f.path}`);
    }
  }

  // Numbered after the project's highest scene, like `addScene`.
  const highest = manifest.scenes.reduce((max, s) => {
    const n = Number(/^(\d+)-/.exec(P.basename(s.file))?.[1]);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const ext = P.extname(sceneFile);
  const stem = stemOf(sceneFile).replace(/^\d+-/, "");
  // A replacement takes the replaced scene's number, so the files still sort
  // in timeline order.
  const replacedNumber = input.replace
    ? Number(/^(\d+)-/.exec(P.basename(manifest.scenes.find((s) => s.file === input.replace || s.name === input.replace)?.file ?? ""))?.[1])
    : NaN;
  let n = Number.isFinite(replacedNumber) ? replacedNumber : highest + 1;
  let newSceneFile = `${SCENES_DIR}/${String(n).padStart(2, "0")}-${stem}${ext}`;
  while (manifest.scenes.some((s) => s.file === newSceneFile) || (await exists(path.join(projectDir, newSceneFile)))) {
    n++;
    newSceneFile = `${SCENES_DIR}/${String(n).padStart(2, "0")}-${stem}${ext}`;
  }

  // Check where it goes before writing anything, so a bad --after leaves no strays.
  for (const target of [input.after, input.replace]) {
    if (target && !manifest.scenes.some((s) => s.file === target || s.name === target)) {
      throw new ProjectError(`No scene "${target}" in ${MANIFEST_FILE}. Scenes: ${manifest.scenes.map((s) => s.file).join(", ")}`);
    }
  }

  const names = new Set(fork.files.map((f) => f.path));
  const destination = (original: string) => destinationOf(original, sceneFile, newSceneFile, fork.template);
  const result: ForkedScene = { file: newSceneFile, name: "", durationInFrames: 0, written: [], unchanged: [], kept: [], removed: [], warnings: [] };

  for (const f of fork.files) {
    const target = destination(f.path);
    const bytes =
      f.encoding === "text"
        ? Buffer.from(CODE_EXT.includes(P.extname(f.path)) ? rewriteImports(f.contents, f.path, target, names, destination) : f.contents, "utf8")
        : Buffer.from(f.contents, "base64");
    const absolute = path.join(projectDir, target);
    const existing = await fs.readFile(absolute).catch(() => null);
    if (existing) {
      (existing.equals(bytes) ? result.unchanged : result.kept).push(target);
      continue;
    }
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, bytes);
    result.written.push(target);
  }

  // Frames are the template's; a different fps keeps the same seconds.
  const durationInFrames = Math.max(1, Math.round((fork.durationInFrames * manifest.fps) / fork.fps));
  if (manifest.fps !== fork.fps) {
    result.warnings.push(
      `The scene was made at ${fork.fps}fps and this project runs at ${manifest.fps}fps. Its length is converted, but any timing it keeps in raw frames will run ${manifest.fps > fork.fps ? "faster" : "slower"}; check it.`,
    );
  }
  if (manifest.width !== fork.width || manifest.height !== fork.height) {
    result.warnings.push(
      `The scene was laid out for ${fork.width}x${fork.height} and this project is ${manifest.width}x${manifest.height}. Positions and type sizes are in its pixels: re-frame it (camera, layout constants) and look at the frames.`,
    );
  }

  const name = input.name ?? fork.title;
  const entry = { file: newSceneFile, durationInFrames, name };
  if (input.replace) {
    const at = manifest.scenes.findIndex((s) => s.file === input.replace || s.name === input.replace);
    if (at === -1) throw new ProjectError(`No scene "${input.replace}" in ${MANIFEST_FILE}`);
    const [old] = manifest.scenes.splice(at, 1, entry);
    // Replacing means the old scene is gone; a file nothing references is
    // just a stray that later looks like a scene someone forgot to register.
    if (old && !manifest.scenes.some((s) => s.file === old.file)) {
      await fs.rm(path.join(projectDir, old.file), { force: true });
      result.removed.push(old.file);
    }
  } else {
    let index = manifest.scenes.length;
    if (input.after) {
      const at = manifest.scenes.findIndex((s) => s.file === input.after || s.name === input.after);
      if (at === -1) throw new ProjectError(`No scene "${input.after}" in ${MANIFEST_FILE}`);
      index = at + 1;
    }
    manifest.scenes.splice(index, 0, entry);
  }
  await writeManifest(projectDir, manifest);
  return { ...result, name, durationInFrames };
}
