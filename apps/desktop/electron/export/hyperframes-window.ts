import type { NativeImage } from "electron";
import { previewUrl } from "../local-server";
import type { ProjectSession } from "../project-session";
import { openOffscreenWindow } from "./offscreen";

/**
 * A HyperFrames composition in an offscreen window, driven frame by frame.
 *
 * The page is the same document the preview iframe shows, loaded from the
 * loopback server so its relative asset paths and range requests work. What
 * differs is who drives it: instead of the runtime's play/pause bridge, this
 * speaks the seek protocol the HyperFrames engine itself uses —
 * `window.__hf.seek(t)` then `__hfWaitForSeekCompletion()`, which resolves
 * once GSAP has stepped, every `<video>` has reached its frame and pending
 * media work has settled. That is the determinism barrier; capturing before
 * it resolves is how a frame comes back a frame behind.
 */
export interface CompositionWindow {
  durationSeconds: number;
  width: number;
  height: number;
  /** Seek and settle. */
  seek(timeSeconds: number): Promise<void>;
  /** Whatever the page shows now, at the display's pixel ratio. */
  capture(): Promise<NativeImage>;
  /**
   * Effective gain of every mixable `<audio>` at the current time — what a
   * volume tween on the timeline has set it to — keyed by element id.
   */
  audioLevels(): Promise<Record<string, number>>;
  /** Run script in the page — for the watermark, which lives outside the composition. */
  execute(script: string): Promise<unknown>;
  close(): void;
}

/** How long the page gets to expose `__hf` and load its media. */
const READY_TIMEOUT_MS = 30_000;

/**
 * How long one seek gets to settle before this gives up on it.
 *
 * `__hfWaitForSeekCompletion` resolves once every media element the runtime
 * tracks reaches the target frame — normally milliseconds. A composition
 * heavy enough to make that never happen (a stalled decode, a scene with
 * enough filters/layers to starve the renderer) would otherwise hang this
 * `await` forever with no signal, unlike every other failure here, which
 * throws something worth telling someone.
 */
const SEEK_TIMEOUT_MS = 15_000;

/**
 * The seek protocol, built over the runtime's player.
 *
 * The runtime does not expose `window.__hf` on its own — HyperFrames' renderer
 * installs it from `window.__player` once that exists, and this is that
 * bridge, minus the virtual-time plumbing a Puppeteer capture needs.
 * `duration` reads 0 until the runtime reports `__renderReady` and every
 * sub-composition's timeline has registered, which is what the ready poll
 * below waits on; `seek` is the deterministic `renderSeek`, not the live one.
 */
const BRIDGE_SCRIPT = `(() => {
  const declaredDuration = () => {
    const root = document.querySelector("[data-composition-id]");
    if (!root) return 0;
    const d = Number(root.getAttribute("data-duration"));
    if (Number.isFinite(d) && d > 0) return d;
    let maxEnd = 0;
    for (const el of document.querySelectorAll("[data-composition-src]")) {
      const start = Number(el.getAttribute("data-start")) || 0;
      const dur = Number(el.getAttribute("data-duration")) || 0;
      if (dur > 0) maxEnd = Math.max(maxEnd, start + dur);
    }
    return maxEnd;
  };
  const bridge = () => {
    const p = window.__player;
    if (!p || typeof p.renderSeek !== "function" || typeof p.getDuration !== "function") return false;
    const hf = window.__hf || {};
    Object.defineProperty(hf, "duration", {
      configurable: true,
      enumerable: true,
      get() {
        if (window.__hfTimelinesBuilding) return 0;
        if (!window.__renderReady) return 0;
        const d = p.getDuration();
        return d > 0 ? d : declaredDuration();
      },
    });
    hf.seek = (t) => p.renderSeek(t);
    window.__hf = hf;
    return true;
  };
  if (bridge()) return;
  const iv = setInterval(() => { if (bridge()) clearInterval(iv); }, 50);
})()`;

const READY_SCRIPT = `(async () => {
  const deadline = Date.now() + ${READY_TIMEOUT_MS};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ready = () =>
    !!(window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0);
  while (!ready()) {
    if (Date.now() > deadline) {
      const root = document.querySelector("[data-composition-id]");
      const hasTimeline = !!(window.__timelines && Object.keys(window.__timelines).length);
      throw new Error(
        "the composition never became seekable — " +
          (root ? "" : "no [data-composition-id] root; ") +
          (hasTimeline ? "" : "no timeline registered on window.__timelines; ") +
          (window.__player ? "" : "the runtime never started; ") +
          (window.__renderReady ? "" : "the runtime never reported ready; ") +
          "check the composition's scripts"
      );
    }
    await sleep(40);
  }
  // Sub-composition timelines register after their scripts run; the runtime
  // flags the window while any is still building.
  while (window.__hfTimelinesBuilding) {
    if (Date.now() > deadline) throw new Error("a sub-composition's timeline never registered");
    await sleep(40);
  }
  if (window.__player && typeof window.__player.pause === "function") window.__player.pause();
  await (document.fonts && document.fonts.ready);
  const media = Array.from(document.querySelectorAll("video, audio, img"));
  while (Date.now() < deadline) {
    const pending = media.filter((el) => {
      if (el.tagName === "VIDEO" || el.tagName === "AUDIO") {
        return el.readyState < 2 && !el.error && !!(el.src || el.querySelector("source"));
      }
      const src = el.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return false;
      return !(el.complete);
    });
    if (pending.length === 0) break;
    await sleep(60);
  }
  await Promise.all(
    Array.from(document.images).map((img) => (img.decode ? img.decode().catch(() => {}) : null)),
  );
  return { duration: window.__hf.duration };
})()`;

/** Seek, settle, and report the audio gains — one round trip per frame. */
const seekScript = (t: number) => `(async () => {
  window.__hf.seek(${t});
  if (typeof window.__hfWaitForSeekCompletion === "function") await window.__hfWaitForSeekCompletion();
  const levels = {};
  for (const el of document.querySelectorAll("audio[id][src]")) levels[el.id] = el.muted ? 0 : el.volume;
  return levels;
})()`;

export async function openCompositionWindow(
  session: ProjectSession,
  size: {
    width: number;
    height: number;
    /** See `openOffscreenWindow`: below 1 the page is laid out at full size but painted smaller. */
    scale?: number;
  },
): Promise<CompositionWindow> {
  const { width, height } = size;
  const win = openOffscreenWindow(size);
  // The page has real `<audio>` elements, and an offscreen window is still
  // wired to the speakers. The mix comes from ffmpeg, not from here.
  win.webContents.setAudioMuted(true);

  const close = () => {
    if (!win.isDestroyed()) win.destroy();
  };

  try {
    const pageErrors: string[] = [];
    win.webContents.on("console-message", (event) => {
      if (event.level === "error") pageErrors.push(event.message);
    });
    await win.webContents.loadURL(
      previewUrl(session, { revision: session.hyperframes.state().revision, render: true }),
    );
    let ready: { duration: number };
    try {
      await win.webContents.executeJavaScript(BRIDGE_SCRIPT);
      ready = (await win.webContents.executeJavaScript(READY_SCRIPT)) as { duration: number };
    } catch (err) {
      // What the page itself said is usually the real reason — a script that
      // threw before it registered its timeline, a 404 for the runtime.
      const said = pageErrors.slice(-3).join(" · ");
      throw new Error(`${err instanceof Error ? err.message : String(err)}${said ? ` (page: ${said})` : ""}`);
    }
    // Filled in by each `seek`; `audioLevels` reads it without another round trip.
    let lastLevels: Record<string, number> = {};
    return {
      durationSeconds: ready.duration,
      width,
      height,
      async seek(timeSeconds) {
        let timer: ReturnType<typeof setTimeout>;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  `seek to ${timeSeconds.toFixed(2)}s never settled within ${SEEK_TIMEOUT_MS / 1000}s — the composition's media or filters may be too heavy for this frame to render`,
                ),
              ),
            SEEK_TIMEOUT_MS,
          );
        });
        try {
          lastLevels = (await Promise.race([
            win.webContents.executeJavaScript(seekScript(timeSeconds)),
            timeout,
          ])) as Record<string, number>;
        } finally {
          clearTimeout(timer!);
        }
      },
      capture: () => win.webContents.capturePage(),
      audioLevels: async () => lastLevels,
      execute: (script) => win.webContents.executeJavaScript(script),
      close,
    };
  } catch (err) {
    close();
    throw err instanceof Error ? err : new Error(String(err));
  }
}
