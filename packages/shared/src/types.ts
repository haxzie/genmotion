export interface VideoConfig {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
}

export interface SceneData {
  id: string;
  name: string;
  code: string;
  durationInFrames: number;
  order: number;
  /** Scene-level voiceover/music track, played from the scene's first frame. */
  audioUrl?: string | null;
  audioVolume?: number;
}

/**
 * Project-level audio placed on the timeline, independent of scenes (music,
 * ambience, sfx). `track` is the lane (0..MAX_AUDIO_TRACKS-1). The clip plays
 * `url` from global `startFrame` for `durationInFrames`, seeking `startFrom`
 * seconds into the source.
 */
export interface AudioClipData {
  id: string;
  track: number;
  assetId?: string | null;
  url: string;
  name: string;
  startFrame: number;
  durationInFrames: number;
  startFrom: number;
  volume: number;
}

export interface ProjectData {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  scenes: SceneData[];
  audioClips: AudioClipData[];
}

export type AssetKind = "image" | "video" | "audio" | "export";

export interface AssetData {
  id: string;
  url: string;
  kind: AssetKind;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  filename: string;
}

export type ExportStatus =
  | "queued"
  | "rendering"
  | "encoding"
  | "uploading"
  | "done"
  | "failed"
  | "cancelled";

export interface ExportJobData {
  id: string;
  projectId: string;
  status: ExportStatus;
  progress: number;
  totalFrames: number;
  outputUrl?: string | null;
  error?: string | null;
}

export interface CompileError {
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
}
