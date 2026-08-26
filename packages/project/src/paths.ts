import path from "node:path";

/** The manifest the app and the agent both edit. */
export const MANIFEST_FILE = "project.json";
/** Scene modules — one default-exported React component each. */
export const SCENES_DIR = "scenes";
/** Agent-authored modules shared across scenes. */
export const COMPONENTS_DIR = "components";
/** Images, audio, video referenced by scenes. */
export const ASSETS_DIR = "assets";
/** App-owned state the user never edits by hand. */
export const INTERNAL_DIR = ".genmotion";

export const CHAT_FILE = `${INTERNAL_DIR}/chat.jsonl`;
export const SESSION_FILE = `${INTERNAL_DIR}/session.json`;
export const THUMBNAIL_FILE = `${INTERNAL_DIR}/thumb.jpg`;
export const CACHE_DIR = `${INTERNAL_DIR}/cache`;

export const manifestPath = (projectDir: string) =>
  path.join(projectDir, MANIFEST_FILE);

/** Absolute path for a project-relative path recorded in the manifest. */
export const resolveInProject = (projectDir: string, relative: string) =>
  path.resolve(projectDir, relative);

/** Manifest-shaped (relative, forward-slashed) path for an absolute one. */
export function toProjectPath(projectDir: string, absolute: string): string {
  return path.relative(projectDir, absolute).split(path.sep).join("/");
}

/**
 * Whether `candidate` stays inside `projectDir`. The manifest is agent-written,
 * so every path out of it is checked before it reaches the filesystem —
 * `../../.ssh/id_rsa` must never resolve to a read.
 */
export function isInsideProject(projectDir: string, candidate: string): boolean {
  const rel = path.relative(projectDir, path.resolve(projectDir, candidate));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/** True for files under `node_modules` — used to separate first-party code from dependencies. */
export const isDependencyPath = (p: string) => p.split(path.sep).includes("node_modules");
