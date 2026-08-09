/**
 * Canvas frames → an encoded video file, entirely in the browser.
 *
 * Uses WebCodecs via mediabunny, which also picks the container. H.264/MP4 is
 * preferred because it plays everywhere a user might drop the file (Slack,
 * X, iMessage, Premiere); VP9/WebM is the fallback for browsers without an
 * H.264 encoder, notably Firefox.
 *
 * mediabunny is imported dynamically by the caller so none of it ships in the
 * marketing page's initial bundle.
 */

import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  WebMOutputFormat,
  getFirstEncodableVideoCodec,
  type VideoCodec,
} from "mediabunny";

/** Preference order: H.264 first, then the WebM codecs. */
const CODEC_PREFERENCE: VideoCodec[] = ["avc", "vp9", "vp8"];

export interface Encoder {
  /** Encode whatever is currently painted on the canvas as frame `index`. */
  addFrame(index: number): Promise<void>;
  /** Finish the file and hand back the bytes. */
  finish(): Promise<{ blob: Blob; ext: string; mimeType: string }>;
  /** Tear down encoders without producing a file (cancel path). */
  cancel(): Promise<void>;
}

export interface EncoderOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  width: number;
  height: number;
  fps: number;
}

export async function createEncoder({
  canvas,
  width,
  height,
  fps,
}: EncoderOptions): Promise<Encoder> {
  const codec = await getFirstEncodableVideoCodec(CODEC_PREFERENCE, { width, height });
  if (!codec) {
    throw new Error("This browser can't encode video. Try Chrome, Edge, or Safari 16.4+.");
  }

  const isMp4 = codec === "avc";
  const target = new BufferTarget();
  const output = new Output({
    // 'in-memory' moves the moov atom to the front so the file is seekable
    // immediately — the same reason the server render passes -movflags +faststart.
    format: isMp4 ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
    target,
  });

  const source = new CanvasSource(canvas, {
    codec,
    quality: QUALITY_HIGH,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const frameDuration = 1 / fps;

  return {
    async addFrame(index) {
      // Awaited so encoder/writer backpressure actually throttles the frame
      // loop instead of queueing 180 frames of raw RGBA into memory.
      await source.add(index / fps, frameDuration);
    },
    async finish() {
      await output.finalize();
      const buffer = target.buffer;
      if (!buffer) throw new Error("Encoding finished without producing a file");
      const mimeType = isMp4 ? "video/mp4" : "video/webm";
      return { blob: new Blob([buffer], { type: mimeType }), ext: isMp4 ? "mp4" : "webm", mimeType };
    },
    async cancel() {
      await output.cancel();
    },
  };
}
