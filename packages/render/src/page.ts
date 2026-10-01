import type { Browser, BrowserContext, CDPSession, Page } from "playwright-core";
import { RENDER_PAGE } from "./server";
import type {} from "./browser/bridge";

export type ImageFormat = "jpeg" | "png";

export interface CompositionPageOptions {
  /** Output pixels per composition pixel. */
  scale?: number;
  /** Receives uncaught page errors and console errors as they happen. */
  onPageError?: (message: string) => void;
}

/**
 * One headless tab with the composition mounted, driven a frame at a time.
 * Everything that captures — a full render's workers, `still`, `check`, the
 * MCP server's `capture_frames` — goes through this, so they cannot disagree
 * about what a frame looks like.
 */
export class CompositionPage {
  private constructor(
    private readonly context: BrowserContext,
    readonly page: Page,
    private readonly cdp: CDPSession,
    readonly width: number,
    readonly height: number,
    readonly totalFrames: number,
    private readonly errors: string[],
  ) {}

  static async open(
    browser: Browser,
    serverUrl: string,
    composition: { width: number; height: number },
    options: CompositionPageOptions = {},
  ): Promise<CompositionPage> {
    const scale = options.scale ?? 1;
    const context = await browser.newContext({
      viewport: { width: composition.width, height: composition.height },
      deviceScaleFactor: scale,
      reducedMotion: "reduce",
    });
    const errors: string[] = [];
    try {
      const page = await context.newPage();
      const report = (message: string) => {
        errors.push(message);
        options.onPageError?.(message);
      };
      page.on("pageerror", (err) => report(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") report(msg.text());
      });
      await page.goto(serverUrl + RENDER_PAGE, { waitUntil: "load" });
      const init = await page.evaluate(async () => {
        const res = await fetch("/__gm/composition");
        const comp = await res.json();
        if (comp.error) return { error: comp.error as string };
        if (comp.errors.length) {
          return {
            error: comp.errors.map((e: { file: string; message: string }) => `${e.file}: ${e.message}`).join("\n"),
          };
        }
        if (!comp.scenes.length) return { error: "project.json lists no scenes" };
        const result = window.__gmInit({ scenes: comp.scenes, fps: comp.fps, width: comp.width, height: comp.height });
        if (result.error) return { error: result.error };
        return { totalFrames: window.__gm!.getTotalFrames() };
      });
      if ("error" in init && init.error) throw new Error(init.error);
      const cdp = await context.newCDPSession(page);
      return new CompositionPage(
        context, page, cdp, composition.width, composition.height, (init as { totalFrames: number }).totalFrames, errors,
      );
    } catch (err) {
      await context.close().catch(() => {});
      throw err;
    }
  }

  /** Draws `frame` and waits for the host's readiness barrier. */
  async seek(frame: number): Promise<void> {
    // The hosts keep the last error rather than the current frame's, so only
    // a change across this seek belongs to this frame.
    const { before, after } = await this.page.evaluate(async (f) => {
      const gm = window.__gm!;
      const before = gm.getLastError();
      await gm.setFrame(f);
      return { before, after: gm.getLastError() };
    }, frame);
    if (after && after !== before) throw new SceneRuntimeError(frame, after);
  }

  /**
   * The current frame as an image. `maxWidth` downsamples in the browser, which
   * is how the agent-facing captures stay small without a resize step.
   */
  async capture(options: { format?: ImageFormat; quality?: number; maxWidth?: number } = {}): Promise<Buffer> {
    const format = options.format ?? "jpeg";
    const clipScale = options.maxWidth && options.maxWidth < this.width ? options.maxWidth / this.width : 1;
    const shot = await this.cdp.send("Page.captureScreenshot", {
      format,
      ...(format === "jpeg" ? { quality: options.quality ?? 92 } : {}),
      ...(clipScale !== 1 ? { clip: { x: 0, y: 0, width: this.width, height: this.height, scale: clipScale } } : {}),
      captureBeyondViewport: false,
    });
    return Buffer.from(shot.data, "base64");
  }

  /** Errors the page has logged since it opened. */
  pageErrors(): readonly string[] {
    return this.errors;
  }

  async close(): Promise<void> {
    await this.page.evaluate(() => window.__gm?.dispose?.()).catch(() => {});
    await this.context.close().catch(() => {});
  }
}

export class SceneRuntimeError extends Error {
  constructor(readonly frame: number, message: string) {
    super(`Frame ${frame}: ${message}`);
  }
}
