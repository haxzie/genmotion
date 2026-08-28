/**
 * The self-contained payload a renderer needs to produce one MP4 — everything
 * the render core reads, with no database access. The control-plane API builds
 * this from the DB and hands it to a (possibly remote, credential-less) renderer
 * over HTTP; the local renderer builds the same shape directly from the DB.
 */
export interface RenderAudioSource {
  /** Fetchable URL (the public asset proxy — no credentials needed). */
  url: string;
  /** Milliseconds into the composition where this track starts. */
  delayMs: number;
  volume: number;
  /** Seconds into the source to start from (clips only; trims the head). */
  startFromSec?: number;
  /** Length in seconds to play from the source (clips only; trims the tail). */
  durationSec?: number;
  /** Seconds of ramp in from silence at the start of this source. */
  fadeInSec?: number;
  /** Seconds of ramp out to silence at the end of this source. */
  fadeOutSec?: number;
}

export interface RenderScenePayload {
  id: string;
  name: string;
  code: string;
  durationInFrames: number;
}

export type ExportFormat = "mp4" | "webm" | "gif";

/** The selectable output formats, with their file/label metadata. */
export const EXPORT_FORMATS: {
  id: ExportFormat;
  label: string;
  ext: string;
  mimeType: string;
  note: string;
}[] = [
  { id: "mp4", label: "MP4", ext: "mp4", mimeType: "video/mp4", note: "H.264 · plays everywhere" },
  { id: "webm", label: "WebM", ext: "webm", mimeType: "video/webm", note: "VP9 · smaller, for the web" },
  { id: "gif", label: "GIF", ext: "gif", mimeType: "image/gif", note: "Looping · no audio" },
];

export function exportFormatMeta(format: string) {
  return EXPORT_FORMATS.find((f) => f.id === format) ?? EXPORT_FORMATS[0]!;
}

/**
 * Everything a renderer needs to produce a project's thumbnail — one frame from
 * the first scene — with no DB access. Built by the control-plane, consumed by
 * the (possibly remote) thumbnail renderer.
 */
export interface ThumbnailJobPayload {
  projectId: string;
  fps: number;
  width: number;
  height: number;
  scene: RenderScenePayload;
  /** Frame (within the scene) to capture. */
  frame: number;
}

export interface RenderJobPayload {
  exportJobId: string;
  fps: number;
  width: number;
  height: number;
  /** 0–100; the core maps it to the x264/VP9 CRF + JPEG capture quality. */
  quality: number;
  /** Output container/codec. */
  format: ExportFormat;
  /** Sanitized base name for the output file. */
  filename: string;
  /**
   * Burn the GenMotion badge into the bottom-right of every frame. Set for
   * organizations on the Free plan; the flag is resolved server-side when the
   * export is enqueued, never by the renderer.
   */
  watermark?: boolean;
  /**
   * Capture each frame at this multiple of width×height, then let ffmpeg scale
   * it back down. Defaults to 1.
   *
   * Intuition says a camera zoom needs this — magnify the frame and there is
   * nothing above 1:1 to sample from. Measured, the gain is small: because the
   * export seeks and re-renders every frame, Chromium re-rasterizes vector
   * content (text, borders) at the zoomed scale already. Against a 3× zoom,
   * capturing at 2× scored SSIM 0.99 versus 1× on both a type-heavy frame and
   * one zoomed into a bitmap, for ~40% more wall-clock per frame. So it is an
   * opt-in for the rare frame where edge antialiasing matters, not a default.
   *
   * What actually keeps zoomed content sharp is NOT setting `will-change` on
   * animated elements — that pins the raster scale so a stale texture gets
   * stretched. The motion components handle that themselves.
   */
  supersample?: 1 | 2;
  scenes: RenderScenePayload[];
  audioSources: RenderAudioSource[];
}

/**
 * Fit two fades inside the clip they belong to.
 *
 * Fades longer than the clip would overlap, and an overlap is not a longer
 * fade — it is a clip that never reaches full volume, which nobody asks for by
 * dragging a handle. They are scaled down together so their ratio survives.
 */
export function clampFades(
  fadeInFrames: number,
  fadeOutFrames: number,
  durationInFrames: number,
): { fadeInFrames: number; fadeOutFrames: number } {
  const fadeIn = Math.max(0, Math.floor(fadeInFrames));
  const fadeOut = Math.max(0, Math.floor(fadeOutFrames));
  const total = fadeIn + fadeOut;
  if (total <= durationInFrames) return { fadeInFrames: fadeIn, fadeOutFrames: fadeOut };
  const scale = durationInFrames / total;
  return {
    fadeInFrames: Math.floor(fadeIn * scale),
    fadeOutFrames: Math.floor(fadeOut * scale),
  };
}

/**
 * Resolve scene voiceovers + project audio clips into flat, timed audio sources
 * for the render's ffmpeg mux. Pure — shared by the API (which reads the DB) and
 * the local renderer, so their timing math can never drift apart.
 */
export function buildRenderAudioSources(
  scenes: {
    durationInFrames: number;
    audioUrl?: string | null;
    audioVolume?: number | null;
  }[],
  clips: {
    url: string;
    startFrame: number;
    durationInFrames: number;
    startFrom: number;
    volume: number;
    fadeInFrames?: number;
    fadeOutFrames?: number;
    muted?: boolean;
  }[],
  fps: number,
): RenderAudioSource[] {
  const sources: RenderAudioSource[] = [];

  // Scene voiceover: whole source, delayed to the scene's start.
  let startFrame = 0;
  for (const scene of scenes) {
    if (scene.audioUrl) {
      sources.push({
        url: scene.audioUrl,
        delayMs: (startFrame / fps) * 1000,
        volume: scene.audioVolume ?? 1,
      });
    }
    startFrame += scene.durationInFrames;
  }

  // Project audio clips: trimmed to their window, delayed to their start.
  for (const clip of clips) {
    // A muted clip is dropped rather than mixed at zero: ffmpeg would still
    // decode it, and `amix` still counts it when dividing.
    if (clip.muted) continue;

    const { fadeInFrames, fadeOutFrames } = clampFades(
      clip.fadeInFrames ?? 0,
      clip.fadeOutFrames ?? 0,
      clip.durationInFrames,
    );
    sources.push({
      url: clip.url,
      delayMs: (clip.startFrame / fps) * 1000,
      volume: clip.volume,
      startFromSec: clip.startFrom,
      durationSec: clip.durationInFrames / fps,
      ...(fadeInFrames > 0 ? { fadeInSec: fadeInFrames / fps } : {}),
      ...(fadeOutFrames > 0 ? { fadeOutSec: fadeOutFrames / fps } : {}),
    });
  }

  return sources;
}
