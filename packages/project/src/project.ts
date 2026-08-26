import path from "node:path";
import fs from "node:fs/promises";
import type { AudioClipData, ProjectData, SceneData } from "@genmotion/shared";
import {
  ASSETS_DIR,
  CACHE_DIR,
  COMPONENTS_DIR,
  MANIFEST_FILE,
  SCENES_DIR,
  manifestPath,
} from "./paths";
import {
  formatManifestError,
  projectManifestSchema,
  sceneNameFromFile,
  type ProjectManifest,
} from "./schema";
import {
  DEFAULT_VERSIONS,
  renderAgentsMd,
  renderGitignore,
  renderNpmrc,
  renderPackageJson,
  renderStarterScene,
  renderTsconfig,
  type ScaffoldVersions,
} from "./scaffold";

export class ProjectError extends Error {}

/** Read and validate `project.json`. */
export async function readManifest(projectDir: string): Promise<ProjectManifest> {
  const file = manifestPath(projectDir);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    throw new ProjectError(`No ${MANIFEST_FILE} in ${projectDir}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new ProjectError(
      `${MANIFEST_FILE} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const parsed = projectManifestSchema.safeParse(json);
  if (!parsed.success) {
    throw new ProjectError(
      `${MANIFEST_FILE} is invalid:\n${formatManifestError(parsed.error)}`,
    );
  }
  return parsed.data;
}

/**
 * Write `project.json` atomically. The watcher and the agent both read this
 * file; a half-written manifest would surface as a parse error in the UI.
 */
export async function writeManifest(
  projectDir: string,
  manifest: ProjectManifest,
): Promise<void> {
  const file = manifestPath(projectDir);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

export interface CreateProjectInput {
  dir: string;
  name?: string;
  fps?: number;
  width?: number;
  height?: number;
  /** Shared scene-authoring guide, embedded into the project's AGENTS.md. */
  authoringGuide?: string;
  versions?: ScaffoldVersions;
  /** Skip the starter scene (used when importing an existing project). */
  empty?: boolean;
}

/**
 * Scaffold a new project folder: a real npm/TypeScript package with a manifest,
 * an AGENTS.md the user's own coding agent can read, and one scene that plays
 * immediately — before anything is installed, since every runtime module a
 * starter scene imports is supplied by the host.
 */
export async function createProject(
  input: CreateProjectInput,
): Promise<ProjectManifest> {
  const dir = path.resolve(input.dir);
  const name = input.name?.trim() || path.basename(dir);

  if (await exists(manifestPath(dir))) {
    throw new ProjectError(`${dir} already contains a ${MANIFEST_FILE}`);
  }

  for (const sub of [SCENES_DIR, COMPONENTS_DIR, ASSETS_DIR, CACHE_DIR]) {
    await fs.mkdir(path.join(dir, sub), { recursive: true });
  }

  const starter = `${SCENES_DIR}/01-intro.tsx`;
  const manifest = projectManifestSchema.parse({
    name,
    fps: input.fps ?? 30,
    width: input.width ?? 1920,
    height: input.height ?? 1080,
    scenes: input.empty
      ? []
      : [{ file: starter, durationInFrames: (input.fps ?? 30) * 5 }],
    audio: [],
  });

  await Promise.all([
    writeManifest(dir, manifest),
    fs.writeFile(
      path.join(dir, "package.json"),
      renderPackageJson(name, input.versions ?? DEFAULT_VERSIONS),
      "utf8",
    ),
    fs.writeFile(path.join(dir, "tsconfig.json"), renderTsconfig(), "utf8"),
    fs.writeFile(path.join(dir, ".npmrc"), renderNpmrc(), "utf8"),
    fs.writeFile(path.join(dir, ".gitignore"), renderGitignore(), "utf8"),
    fs.writeFile(
      path.join(dir, "AGENTS.md"),
      renderAgentsMd({ projectName: name, authoringGuide: input.authoringGuide }),
      "utf8",
    ),
    input.empty
      ? Promise.resolve()
      : fs.writeFile(path.join(dir, starter), renderStarterScene(), "utf8"),
  ]);

  return manifest;
}

export interface LoadedProject extends ProjectData {
  /** Scene files listed in the manifest that aren't on disk. */
  missing: string[];
}

/**
 * Read the whole project into the shape the editor UI and the player already
 * speak. Scene ids are their project-relative paths — stable, meaningful, and
 * the same handle the agent uses.
 */
export async function loadProject(
  projectDir: string,
  options: { assetUrlPrefix?: string } = {},
): Promise<LoadedProject> {
  const dir = path.resolve(projectDir);
  const manifest = await readManifest(dir);
  const assetUrlPrefix = options.assetUrlPrefix ?? "gm-asset://";
  const assetUrl = (file: string) =>
    assetUrlPrefix + file.split("/").map(encodeURIComponent).join("/");

  const missing: string[] = [];
  const scenes: SceneData[] = [];
  for (const [index, entry] of manifest.scenes.entries()) {
    const code = await fs
      .readFile(path.resolve(dir, entry.file), "utf8")
      .catch(() => null);
    if (code === null) {
      missing.push(entry.file);
      continue;
    }
    scenes.push({
      id: entry.file,
      name: entry.name ?? sceneNameFromFile(entry.file),
      code,
      durationInFrames: entry.durationInFrames,
      order: index,
      audioUrl: entry.audio ? assetUrl(entry.audio) : null,
      audioVolume: entry.audioVolume ?? 1,
    });
  }

  const audioClips: AudioClipData[] = manifest.audio.map((clip) => ({
    id: clip.id,
    track: clip.track,
    url: assetUrl(clip.file),
    name: clip.name ?? (clip.file.split("/").pop() ?? clip.file),
    startFrame: clip.startFrame,
    durationInFrames: clip.durationInFrames,
    startFrom: clip.startFrom,
    volume: clip.volume,
  }));

  return {
    id: dir,
    name: manifest.name,
    fps: manifest.fps,
    width: manifest.width,
    height: manifest.height,
    scenes,
    audioClips,
    missing,
  };
}

async function exists(file: string): Promise<boolean> {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false);
}
