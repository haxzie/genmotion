import path from "node:path";
import fs from "node:fs/promises";
import { BrowserWindow } from "electron";
import { readManifest } from "@genmotion/project";
import type { ProjectSession } from "../project-session";
import { PAGE_SHELL, latestExport } from "./service";

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

/**
 * How far into the scene to sample. Intro animations have settled by 60% but
 * outros generally haven't started, so this lands on the scene's actual
 * content — the same point the hosted renderer picks, for the same reason.
 */
const SAMPLE_AT = 0.6;

/** One capture at a time: each holds an offscreen window the size of the video. */
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

  // An export already owns an offscreen window and the encoder; adding a second
  // composition-sized window mid-render would make the user's export slower to
  // refresh a picture they aren't looking at.
  const running = latestExport();
  if (running && ["queued", "rendering", "encoding", "uploading"].includes(running.status)) {
    return null;
  }

  const manifest = await readManifest(session.dir);
  const entry = manifest.scenes[0];
  if (!entry) {
    // An empty project shouldn't keep showing the last scene it had.
    await fs.rm(target, { force: true });
    return null;
  }

  const built = await session.bundler.bundle(entry.file);
  // A project mid-edit often doesn't build. Keeping the previous image is much
  // better than blanking the card every time a scene is briefly broken.
  if (!built.ok) return null;

  const { fps, width, height } = manifest;
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  try {
    await win.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE_SHELL)}`);
    const hostBundle = await fs.readFile(path.join(__dirname, "render-host.js"), "utf8");
    await win.webContents.executeJavaScript(hostBundle);

    const scenes = [
      {
        id: entry.file,
        name: entry.name ?? entry.file,
        durationInFrames: entry.durationInFrames,
        compiledCode: built.code,
      },
    ];
    const init = (await win.webContents.executeJavaScript(
      `window.__gmInit(${JSON.stringify({ scenes, fps, width, height })})`,
    )) as { error?: string };
    if (init?.error) return null;

    const frame = Math.min(
      entry.durationInFrames - 1,
      Math.max(0, Math.round(entry.durationInFrames * SAMPLE_AT)),
    );
    // Resolves once React has committed and every registered asset reports
    // loaded — without it the capture races the first paint and comes back blank.
    await win.webContents.executeJavaScript(`window.__gm.setFrame(${frame})`);

    const image = await win.webContents.capturePage();
    if (image.isEmpty()) return null;
    const jpeg = image.resize({ width: THUMBNAIL_WIDTH, quality: "good" }).toJPEG(80);

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, jpeg);
    return target;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
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
