/**
 * The export path for a tool that draws its own canvas, rather than a DOM
 * template to be screenshotted.
 *
 * `export-video` exists because the metric templates are React trees: it mounts
 * one through the player's render host and serializes the settled DOM per
 * frame. A WebGL scene cannot go through that pipe at all, since an SVG
 * `<foreignObject>` of a canvas element carries no pixels. So this is the same
 * loop with the middle taken out: ask the source to paint frame n, blit its
 * canvas, stamp the badge, encode.
 *
 * Deliberately a sibling rather than a branch inside `export-video`. Keeping
 * them apart is what stops the 3D tool's bundle from pulling in
 * modern-screenshot and @genmotion/player, neither of which it uses.
 */

import { drawBadge, getBadge } from "./badge";
import { ExportCancelled, downloadBlob, yieldToBrowser, type ExportResult } from "./common";
import { createEncoder } from "./encode";

export { ExportCancelled, downloadBlob };

/** Something that can paint any frame on demand, at a fixed size. */
export interface FrameSource {
  canvas: CanvasImageSource;
  /** Paint `frame`. May be async if the source needs to settle. */
  drawFrame(frame: number): void | Promise<void>;
  dispose(): void;
}

export interface ExportCanvasOptions {
  /** Built once per export, at the export's own resolution. */
  createSource: (size: { width: number; height: number }) => Promise<FrameSource>;
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

export async function exportCanvasVideo({
  createSource,
  width,
  height,
  fps,
  durationInFrames,
  filename,
  onProgress,
  signal,
}: ExportCanvasOptions): Promise<ExportResult> {
  const throwIfCancelled = () => {
    if (signal?.aborted) throw new ExportCancelled();
  };
  throwIfCancelled();

  let source: FrameSource | null = null;
  let encoder: Awaited<ReturnType<typeof createEncoder>> | null = null;

  try {
    source = await createSource({ width, height });
    throwIfCancelled();

    // The composite canvas, not the source's own: the badge has to land on top
    // of the frame, and a WebGL canvas is the wrong surface to draw 2D into.
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Could not create a 2D canvas context");

    const [badge, createdEncoder] = await Promise.all([
      getBadge(width, height),
      createEncoder({ canvas, width, height, fps }),
    ]);
    encoder = createdEncoder;
    throwIfCancelled();

    for (let frame = 0; frame < durationInFrames; frame++) {
      throwIfCancelled();
      await source.drawFrame(frame);
      ctx.drawImage(source.canvas, 0, 0, width, height);
      drawBadge(ctx, badge, width, height);
      await encoder.addFrame(frame);

      onProgress?.((frame + 1) / durationInFrames);
      // Drawing is main-thread; without an explicit yield the progress bar
      // would not paint until the export had finished.
      if (frame % 5 === 4) await yieldToBrowser();
    }

    const { blob, ext, mimeType } = await encoder.finish();
    encoder = null;
    return { blob, filename: `${filename}.${ext}`, mimeType };
  } catch (error) {
    if (encoder) await encoder.cancel().catch(() => {});
    throw error;
  } finally {
    source?.dispose();
  }
}
