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
  scenes: RenderScenePayload[];
  audioSources: RenderAudioSource[];
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
    sources.push({
      url: clip.url,
      delayMs: (clip.startFrame / fps) * 1000,
      volume: clip.volume,
      startFromSec: clip.startFrom,
      durationSec: clip.durationInFrames / fps,
    });
  }

  return sources;
}
