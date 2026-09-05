import path from "node:path";
import fs from "node:fs/promises";
import { readManifest } from "@genmotion/project";
import type { ProjectSession } from "../project-session";
import { captureFrame } from "./capture";
import { SAMPLE_AT } from "./frame-target";

/**
 * A project's card image, rendered locally.
 *
 * One frame of the first scene, through the very same offscreen-window path an
 * export uses — so the card shows the composition exactly as it will render,
 * not an approximation of it. It is cached in the project folder rather than
 * app storage so it travels with the project and disappears with it.
 */

/** Project-relative; inside `.genmotion/`, which the watcher already ignores. */
const THUMBNAIL_FILE = path.join(".genmotion", "thumbnail.jpg");

/** Wide enough for a retina card at the dashboard's column width. */
const THUMBNAIL_WIDTH = 640;

/** One card at a time — `captureFrame` queues the window, this dedupes the work. */
let capturing: Promise<string | null> | null = null;

export function thumbnailPath(projectDir: string): string {
  return path.join(projectDir, THUMBNAIL_FILE);
}

/**
 * Capture unless something already has. Returns the file path, or null when
 * there is nothing to draw.
 */
export function captureThumbnail(session: ProjectSession): Promise<string | null> {
  // Sharing the in-flight promise rather than queueing: a burst of edits should
  // produce one capture, and the next `refreshThumbnail` will catch what the
  // burst changed.
  capturing ??= run(session).finally(() => {
    capturing = null;
  });
  return capturing;
}

/**
 * Capture only if the cached image has fallen behind the project.
 *
 * Cheap enough to call on every open: it stats the manifest and the scene files
 * and does nothing when the picture is already current.
 */
export async function refreshThumbnail(session: ProjectSession): Promise<void> {
  const cached = await fs.stat(thumbnailPath(session.dir)).catch(() => null);
  if (cached) {
    const manifest = await readManifest(session.dir).catch(() => null);
    if (!manifest) return;
    const sources = ["project.json", ...manifest.scenes.map((s) => s.file)];
    const times = await Promise.all(
      sources.map((file) =>
        fs
          .stat(path.resolve(session.dir, file))
          .then((s) => s.mtimeMs)
          .catch(() => 0),
      ),
    );
    if (Math.max(0, ...times) <= cached.mtimeMs) return;
  }
  await captureThumbnail(session);
}

async function run(session: ProjectSession): Promise<string | null> {
  const target = thumbnailPath(session.dir);

  const manifest = await readManifest(session.dir);
  const entry = manifest.scenes[0];
  if (!entry) {
    // An empty project shouldn't keep showing the last scene it had.
    await fs.rm(target, { force: true });
    return null;
  }

  const frame = Math.min(
    entry.durationInFrames - 1,
    Math.max(0, Math.round(entry.durationInFrames * SAMPLE_AT)),
  );

  let image;
  try {
    // Only the first scene: the card is one picture, and mounting the rest
    // would compile the whole video to throw it away.
    image = await captureFrame(session, { manifest, scenes: [entry], frame });
  } catch {
    // An export owns the window, or the project is mid-edit and doesn't build.
    // Keeping the previous image is much better than blanking the card every
    // time a scene is briefly broken.
    return null;
  }

  const jpeg = image.resize({ width: THUMBNAIL_WIDTH, quality: "good" }).toJPEG(80);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, jpeg);
  return target;
}

/**
 * The cached image as a data URL, for a project that isn't open.
 *
 * The start screen lists folders with no session behind them, so there is no
 * `gm-asset://` origin to serve them from; inlining keeps the card a plain
 * `<img>`. At 640px wide these run tens of kilobytes, and the list is capped at
 * twelve.
 */
export async function readThumbnail(projectDir: string): Promise<string | null> {
  const jpeg = await fs.readFile(thumbnailPath(projectDir)).catch(() => null);
  if (!jpeg?.byteLength) return null;
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}
