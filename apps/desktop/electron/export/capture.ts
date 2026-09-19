import path from "node:path";
import fs from "node:fs/promises";
import type { NativeImage } from "electron";
import type { ProjectManifest, SceneEntry } from "@genmotion/project";
import type { ProjectSession } from "../project-session";
import { PAGE_SHELL, hasActiveExport } from "./service";
import { openCompositionWindow } from "./hyperframes-window";
import { openOffscreenWindow } from "./offscreen";

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

export function serialize<T>(fn: () => Promise<T>): Promise<T> {
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
  /**
   * SVG content laid over the frame before it is captured, in composition
   * pixels — the user's markup, burned in so the picture the model reads is
   * the one they drew on. Omitted, the frame is captured as-is.
   */
  overlay?: string;
}

/**
 * Lay `overlay` over a page's composition, above everything in it.
 *
 * A script rather than a second capture composited in the main process:
 * Electron has no canvas of its own, and the page is already a browser. The
 * `<svg>` is fixed to the viewport, which in an offscreen window sized to the
 * composition is the composition, so a `viewBox` in composition pixels lands
 * the marks exactly where they were drawn.
 */
function overlayScript(overlay: string, width: number, height: number): string {
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `style="position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;pointer-events:none">` +
    `${overlay}</svg>`;
  return `(() => {
    const host = document.createElement("div");
    host.innerHTML = ${JSON.stringify(markup)};
    document.body.appendChild(host.firstElementChild);
  })()`;
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
  /** As `CaptureInput.overlay`, in the composition's own pixels. */
  overlay?: string,
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
      if (overlay) await page.execute(overlayScript(overlay, page.width, page.height));
      const image = await page.capture();
      if (image.isEmpty()) throw new Error("the capture came back blank");
      return { image, width: page.width, height: page.height, durationSeconds: page.durationSeconds };
    } finally {
      page.close();
    }
  });
}

async function render(session: ProjectSession, input: CaptureInput): Promise<NativeImage> {
  const { manifest, scenes, frame, overlay } = input;

  // An export already owns an offscreen window and the encoder; adding a
  // second composition-sized window mid-render would slow down the thing the
  // user is actually waiting for.
  if (hasActiveExport()) {
    throw new CaptureBusyError("an export is running — try again once it finishes");
  }

  if (scenes.length === 0) throw new Error("there are no scenes to render");

  const compiled = [];
  for (const entry of scenes) {
    const built = await bundleScene(session, entry);
    if (!built.ok) throw new Error(built.error);
    compiled.push(built.scene);
  }

  const host = await openRenderHost({ manifest, scenes: compiled });
  try {
    await host.setFrame(frame);
    if (overlay) await host.execute(overlayScript(overlay, manifest.width, manifest.height));
    const image = await host.capture();
    if (image.isEmpty()) throw new Error("the capture came back blank");
    return image;
  } finally {
    host.close();
  }
}

/** A React scene bundled for the render host — what `__gmInit` mounts. */
export interface CompiledScene {
  id: string;
  name: string;
  durationInFrames: number;
  compiledCode: string;
}

/** Bundle one scene through the session's incremental builder. */
export async function bundleScene(
  session: ProjectSession,
  entry: SceneEntry,
): Promise<{ ok: true; scene: CompiledScene } | { ok: false; error: string }> {
  const built = await session.bundler.bundle(entry.file);
  if (!built.ok) return { ok: false, error: `${entry.file} failed to build: ${built.error.message}` };
  return {
    ok: true,
    scene: {
      id: entry.file,
      name: entry.name ?? entry.file,
      durationInFrames: entry.durationInFrames,
      compiledCode: built.code,
    },
  };
}

/**
 * The React render host in an offscreen window, driven frame by frame — the
 * counterpart of `openCompositionWindow` for a React project. `frame` indexes
 * into the concatenation of the scenes mounted.
 */
export interface RenderHostWindow {
  /**
   * Resolves once React has committed, fonts are ready, and every registered
   * asset reports loaded — without awaiting it the capture races the first
   * paint and comes back blank.
   */
  setFrame(frame: number): Promise<void>;
  /** Whatever the page shows now, at the display's pixel ratio. */
  capture(): Promise<NativeImage>;
  execute(script: string): Promise<unknown>;
  close(): void;
}

export async function openRenderHost(input: {
    manifest: Pick<ProjectManifest, "fps" | "width" | "height">;
    scenes: CompiledScene[];
    /** See `openOffscreenWindow`: below 1 the page is laid out at full size but painted smaller. */
    scale?: number;
}): Promise<RenderHostWindow> {
  const { fps, width, height } = input.manifest;
  const win = openOffscreenWindow({ width, height, scale: input.scale });
  const close = () => {
    if (!win.isDestroyed()) win.destroy();
  };

  try {
    await win.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE_SHELL)}`);
    const hostBundle = await fs.readFile(path.join(__dirname, "render-host.js"), "utf8");
    await win.webContents.executeJavaScript(hostBundle);

    const init = (await win.webContents.executeJavaScript(
      `window.__gmInit(${JSON.stringify({ scenes: input.scenes, fps, width, height })})`,
    )) as { error?: string };
    if (init?.error) throw new Error(init.error);
  } catch (err) {
    close();
    throw err;
  }
  return {
    async setFrame(frame) {
      await win.webContents.executeJavaScript(`window.__gm.setFrame(${frame})`);
    },
    capture: () => win.webContents.capturePage(),
    execute: (script) => win.webContents.executeJavaScript(script),
    close,
  };
}
