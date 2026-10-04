import path from "node:path";
import fs from "node:fs/promises";
import { TemplateError, getTemplate, listTemplates, type TemplateRecord } from "./index";
import {
  SCENES_FILE,
  STILLS_DIR,
  sceneSidecarSchema,
  searchScenes,
  type SceneHit,
  type SceneQuery,
  type SceneReference,
  type SceneSidecar,
  type SceneSummary,
} from "./scene-search";

export * from "./scene-search";

/**
 * The scene library over the catalog on disk: each template's `scenes.json`
 * joined to its manifest, and a scene's code gathered with the local modules
 * it imports.
 */

interface LoadedScene extends SceneSummary {
  build: string;
  /** Searched, never returned: carries style words ("whiteboard") the scene entries don't repeat. */
  templateDescription: string;
}

interface LoadedTemplate {
  record: TemplateRecord;
  sidecar: SceneSidecar;
  scenes: LoadedScene[];
}

/** The file stem a scene id ends in: `scenes/06-circuit.ts` → `06-circuit`. */
export function sceneStem(file: string): string {
  return path.basename(file).replace(/\.[^.]+$/, "");
}

export function sceneStillPath(record: TemplateRecord, file: string): string {
  return path.join(record.dir, STILLS_DIR, `${sceneStem(file)}.jpg`);
}

/** A template's sidecar, or null when it has none yet. Invalid sidecars throw. */
export async function readSceneSidecar(record: TemplateRecord): Promise<SceneSidecar | null> {
  const raw = await fs.readFile(path.join(record.dir, SCENES_FILE), "utf8").catch(() => null);
  if (raw === null) return null;
  const parsed = sceneSidecarSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new TemplateError(`${record.meta.id}/${SCENES_FILE} is invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function loadTemplateScenes(record: TemplateRecord): Promise<LoadedTemplate | null> {
  const sidecar = await readSceneSidecar(record);
  if (!sidecar) return null;
  const { manifest, meta } = record;
  const engine = manifest.engine ?? "react";
  let startFrame = 0;
  const scenes: LoadedScene[] = [];
  for (const [index, entry] of manifest.scenes.entries()) {
    const curated = sidecar.scenes.find((s) => s.file === entry.file);
    if (curated) {
      const hasStill = await fs
        .access(sceneStillPath(record, entry.file))
        .then(() => true)
        .catch(() => false);
      const stem = sceneStem(entry.file);
      scenes.push({
        id: `${meta.id}/${stem}`,
        template: meta.id,
        templateTitle: meta.title,
        templateDescription: meta.description,
        file: entry.file,
        title: curated.title,
        beat: curated.beat,
        alsoFits: curated.alsoFits,
        summary: curated.summary,
        reuse: curated.reuse,
        build: curated.build,
        techniques: curated.techniques,
        mood: curated.mood,
        videoTypes: curated.videoTypes,
        quality: curated.quality,
        standalone: curated.standalone,
        engine,
        width: manifest.width,
        height: manifest.height,
        fps: manifest.fps,
        durationInFrames: entry.durationInFrames,
        startFrame,
        position: index + 1,
        of: manifest.scenes.length,
        stillPath: hasStill ? `/api/templates/scenes/${meta.id}/${stem}/still` : null,
        videoPath: `/api/templates/${meta.id}/video#t=${(startFrame / manifest.fps).toFixed(2)},${((startFrame + entry.durationInFrames) / manifest.fps).toFixed(2)}`,
      });
    }
    startFrame += entry.durationInFrames;
  }
  return { record, sidecar, scenes };
}

let libraryCache: LoadedTemplate[] | null = null;
const cacheable = () => process.env.NODE_ENV === "production";

async function loadLibrary(): Promise<LoadedTemplate[]> {
  if (libraryCache && cacheable()) return libraryCache;
  const records = await listTemplates();
  const loaded = await Promise.all(records.map(loadTemplateScenes));
  libraryCache = loaded.filter((t): t is LoadedTemplate => t !== null);
  return libraryCache;
}

/** Every curated scene in the catalog, filler included. */
export async function listScenes(): Promise<SceneSummary[]> {
  return (await loadLibrary()).flatMap((t) => t.scenes.map(({ build: _build, templateDescription: _d, ...s }) => s));
}

export async function findScenes(query: SceneQuery): Promise<SceneHit[]> {
  return searchScenes(
    (await loadLibrary()).flatMap((t) => t.scenes),
    query,
  );
}

/** Splits `<template>/<stem>`, checking both halves look like ids. */
export function parseSceneId(id: string): { template: string; stem: string } | null {
  const match = /^([a-z0-9][a-z0-9-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(id.trim());
  return match ? { template: match[1]!, stem: match[2]! } : null;
}

const CODE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

/** Every relative specifier a module imports or re-exports. */
function relativeImports(source: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /\bfrom\s+["'](\.{1,2}\/[^"']+)["']/g,
    /\bimport\s+["'](\.{1,2}\/[^"']+)["']/g,
    /\bimport\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) for (const m of source.matchAll(pattern)) found.add(m[1]!);
  return [...found];
}

async function resolveModule(fromAbs: string, specifier: string): Promise<string | null> {
  const base = path.resolve(path.dirname(fromAbs), specifier);
  const candidates = path.extname(base)
    ? [base]
    : [...CODE_EXT.map((ext) => base + ext), ...CODE_EXT.map((ext) => path.join(base, `index${ext}`))];
  for (const candidate of candidates) {
    if (await fs.stat(candidate).then((s) => s.isFile()).catch(() => false)) return candidate;
  }
  return null;
}

/**
 * The scene file and every local module it reaches, scene first, then in the
 * order they were found. Non-code imports (images, fonts, audio) are listed
 * as assets rather than shipped: the agent needs to know a logo SVG is
 * involved, not to receive its bytes. Nothing outside the template folder is
 * followed.
 */
async function gatherCode(record: TemplateRecord, file: string): Promise<{ files: SceneReference["files"]; assets: string[] }> {
  const files: SceneReference["files"] = [];
  const assets = new Set<string>();
  const seen = new Set<string>();
  const queue = [path.join(record.dir, file)];
  while (queue.length) {
    const abs = queue.shift()!;
    if (seen.has(abs)) continue;
    seen.add(abs);
    const rel = path.relative(record.dir, abs);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    const contents = await fs.readFile(abs, "utf8");
    files.push({ path: rel.split(path.sep).join("/"), contents });
    for (const spec of relativeImports(contents)) {
      const ext = path.extname(spec).toLowerCase();
      if (ext && !CODE_EXT.includes(ext)) {
        const assetRel = path.relative(record.dir, path.resolve(path.dirname(abs), spec));
        if (!assetRel.startsWith("..")) assets.add(assetRel.split(path.sep).join("/"));
        continue;
      }
      const resolved = await resolveModule(abs, spec);
      if (resolved) queue.push(resolved);
    }
  }
  return { files, assets: [...assets].sort() };
}

/** One scene with its build notes, its neighbours and its code. Null when unknown. */
export async function getScene(id: string): Promise<SceneReference | null> {
  const parsed = parseSceneId(id);
  if (!parsed) return null;
  const record = await getTemplate(parsed.template).catch(() => null);
  if (!record) return null;
  const loaded = await loadTemplateScenes(record);
  if (!loaded) return null;
  const index = loaded.scenes.findIndex((s) => sceneStem(s.file) === parsed.stem);
  const scene = loaded.scenes[index];
  if (!scene) return null;
  const neighbour = (s: LoadedScene | undefined) => (s ? { id: s.id, title: s.title, beat: s.beat } : null);
  const { files, assets } = await gatherCode(record, scene.file);
  const { templateDescription: _d, ...rest } = scene;
  return {
    ...rest,
    arc: loaded.sidecar.arc,
    previous: neighbour(loaded.scenes[index - 1]),
    next: neighbour(loaded.scenes[index + 1]),
    files,
    assets,
  };
}

/** Absolute path of a scene's filmstrip, or null when it hasn't been captured. */
export async function getSceneStill(id: string): Promise<string | null> {
  const parsed = parseSceneId(id);
  if (!parsed) return null;
  const record = await getTemplate(parsed.template).catch(() => null);
  if (!record) return null;
  const file = record.manifest.scenes.find((s) => sceneStem(s.file) === parsed.stem)?.file;
  if (!file) return null;
  const still = sceneStillPath(record, file);
  return (await fs.access(still).then(() => true).catch(() => false)) ? still : null;
}
