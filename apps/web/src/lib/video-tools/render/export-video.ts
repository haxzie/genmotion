/**
 * The client-side export: a composition → an MP4 the visitor can download,
 * with no server involved.
 *
 * The frame stepping is not reimplemented here. `mountRenderHost` from
 * @genmotion/player is plain browser code — it is the exact barrier the
 * headless renderer drives (sync React commit → fonts ready → media decoded →
 * double rAF), so awaiting `setFrame(n)` gives us a settled, deterministic DOM
 * for frame n. We then rasterize that DOM and hand the canvas to the encoder.
 */

import type { ComponentType } from "react";
import { mountRenderHost } from "@genmotion/player";
import { drawBadge, getBadge } from "./badge";
import { createEncoder } from "./encode";
import { createRasterizer } from "./rasterize";

export interface ExportOptions {
  scene: ComponentType;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  /** Base name for the downloaded file, without extension. */
  filename: string;
  /** 0..1, called roughly once per frame. */
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export class ExportCancelled extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelled";
  }
}

/** Let the browser paint (progress bar, cancel button) between chunks of work. */
const yieldToBrowser = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export async function exportVideo({
  scene,
  width,
  height,
  fps,
  durationInFrames,
  filename,
  onProgress,
  signal,
}: ExportOptions): Promise<ExportResult> {
  const throwIfCancelled = () => {
    if (signal?.aborted) throw new ExportCancelled();
  };
  throwIfCancelled();

  // The host must be laid out for the rasterizer to see it, so it's positioned
  // off-screen rather than hidden — `display:none` or `visibility:hidden` would
  // give us empty frames.
  const container = document.createElement("div");
  container.style.cssText =
    `position:fixed;top:0;left:-99999px;width:${width}px;height:${height}px;pointer-events:none`;
  document.body.appendChild(container);

  let rasterizer: Awaited<ReturnType<typeof createRasterizer>> | null = null;
  let encoder: Awaited<ReturnType<typeof createEncoder>> | null = null;

  try {
    const host = mountRenderHost({
      container,
      scenes: [{ id: "tool", name: filename, durationInFrames, component: scene }],
      fps,
      width,
      height,
    });

    // Frame 0 first: it settles fonts and decodes the avatar, so the rasterizer
    // is built against a DOM that already has everything it needs to embed.
    await host.setFrame(0);
    throwIfCancelled();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Could not create a 2D canvas context");

    const [badge, createdRasterizer, createdEncoder] = await Promise.all([
      getBadge(width, height),
      createRasterizer(container, width, height),
      createEncoder({ canvas, width, height, fps }),
    ]);
    rasterizer = createdRasterizer;
    encoder = createdEncoder;
    throwIfCancelled();

    for (let frame = 0; frame < durationInFrames; frame++) {
      throwIfCancelled();
      await host.setFrame(frame);
      await rasterizer.drawFrame(ctx);
      drawBadge(ctx, badge, width, height);
      await encoder.addFrame(frame);

      onProgress?.((frame + 1) / durationInFrames);
      // Encoding is async but rasterizing is main-thread; without an explicit
      // yield the progress bar wouldn't paint until the export finished.
      if (frame % 5 === 4) await yieldToBrowser();
    }

    const sceneError = host.getLastError();
    if (sceneError) throw new Error(`Template failed while rendering: ${sceneError}`);

    const { blob, ext, mimeType } = await encoder.finish();
    encoder = null;
    return { blob, filename: `${filename}.${ext}`, mimeType };
  } catch (error) {
    // Release encoder resources on the failure and cancel paths; finish() is
    // what normally does it.
    if (encoder) await encoder.cancel().catch(() => {});
    throw error;
  } finally {
    rasterizer?.dispose();
    container.remove();
  }
}

/** Save an exported blob to disk. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
