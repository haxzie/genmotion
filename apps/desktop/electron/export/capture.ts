import path from "node:path";
import fs from "node:fs/promises";
import { BrowserWindow, type NativeImage } from "electron";
import type { ProjectManifest, SceneEntry } from "@genmotion/project";
import type { ProjectSession } from "../project-session";
import { PAGE_SHELL, hasActiveExport } from "./service";
import { openCompositionWindow } from "./hyperframes-window";

/**
 * One frame of a composition, rendered offscreen.
 *
 * The same path an export runs per frame — `PAGE_SHELL`, the prebuilt render
 * host, `__gmInit`, `setFrame`, `capturePage` — so what comes back is what
 * ships rather than an approximation of it. Extracted here because two callers
 * want it: the project card (`thumbnail.ts`) and the agent's `capture_frames`
 * tool, which is how the model gets to see the video it just wrote.
 */

/** Something else already owns the composition-sized window. */
export class CaptureBusyError extends Error {}

/**
 * One capture at a time.
 *
 * Each holds an offscreen window the size of the video, so two at once means
 * two full compositions in memory. Callers wanting different frames must take
 * turns rather than collapse into one, which is why this is a queue and not
 * the shared in-flight promise `captureThumbnail` keeps on top of it.
 */
let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  // Swallow here only — `next` still rejects for the caller.
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export interface CaptureInput {
  /** Where the frame space comes from: fps and the pixel size to render at. */
  manifest: Pick<ProjectManifest, "fps" | "width" | "height">;
  /** Scenes to mount, in order. `frame` indexes into their concatenation. */
  scenes: SceneEntry[];
  frame: number;
}

/**
 * Render `frame` and hand back the raw capture.
 *
 * Sizing is the caller's: `capturePage` returns the frame at the display's
 * device pixel ratio, which is 2× the composition on a Retina screen, and what
 * to do with that differs between a card and a picture for a model to read.
 *
 * Throws rather than returning null, because every failure here has a cause
 * worth telling someone: an export holding the window, a scene that doesn't
 * build, a capture that came back blank.
 */
export function captureFrame(session: ProjectSession, input: CaptureInput): Promise<NativeImage> {
  return serialize(() => render(session, input));
}

/**
 * One frame of a HyperFrames composition, at `timeSeconds`.
 *
 * The same offscreen page the export drives — opened, seeked once, captured,
 * closed. Returns the size it rendered at alongside the picture, because the
 * composition's own `data-width`/`data-height` decide that, not the manifest.
 */
export function captureCompositionFrame(
  session: ProjectSession,
  timeSeconds: number,
): Promise<{ image: NativeImage; width: number; height: number; durationSeconds: number }> {
  return serialize(async () => {
    if (hasActiveExport()) {
      throw new CaptureBusyError("an export is running — try again once it finishes");
    }
    const compiled = session.hyperframes.current;
    if (!compiled) {
      throw new Error(session.hyperframes.compileError ?? "the composition does not compile");
    }
    const page = await openCompositionWindow(session, {
      width: compiled.width,
      height: compiled.height,
    });
    try {
      const t = Math.max(0, Math.min(timeSeconds, Math.max(0, page.durationSeconds - 1 / 1000)));
      await page.seek(t);
      const image = await page.capture();
      if (image.isEmpty()) throw new Error("the capture came back blank");
      return { image, width: page.width, height: page.height, durationSeconds: page.durationSeconds };
    } finally {
      page.close();
    }
  });
}

async function render(session: ProjectSession, input: CaptureInput): Promise<NativeImage> {
  const { manifest, scenes, frame } = input;

  // An export already owns an offscreen window and the encoder; adding a
  // second composition-sized window mid-render would slow down the thing the
  // user is actually waiting for.
  if (hasActiveExport()) {
    throw new CaptureBusyError("an export is running — try again once it finishes");
  }

  if (scenes.length === 0) throw new Error("there are no scenes to render");

  const compiled = [];
  for (const entry of scenes) {
    const built = await session.bundler.bundle(entry.file);
    if (!built.ok) throw new Error(`${entry.file} failed to build: ${built.error.message}`);
    compiled.push({
      id: entry.file,
      name: entry.name ?? entry.file,
      durationInFrames: entry.durationInFrames,
      compiledCode: built.code,
    });
  }

  const { fps, width, height } = manifest;
  // Offscreen rather than merely hidden: a hidden window stops painting, and
  // the capture comes back blank.
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

    const init = (await win.webContents.executeJavaScript(
      `window.__gmInit(${JSON.stringify({ scenes: compiled, fps, width, height })})`,
    )) as { error?: string };
    if (init?.error) throw new Error(init.error);

    // Resolves once React has committed, fonts are ready, and every registered
    // asset reports loaded — without awaiting it the capture races the first
    // paint and comes back blank.
    await win.webContents.executeJavaScript(`window.__gm.setFrame(${frame})`);

    const image = await win.webContents.capturePage();
    if (image.isEmpty()) throw new Error("the capture came back blank");
    return image;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}
