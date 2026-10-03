import path from "node:path";
import {
  addAudioClip,
  manifestTotalFrames,
  readManifest,
  removeAudioClip,
  updateAudioClip,
  type AudioClipPatch,
} from "@genmotion/project";
import type { AudioEntry } from "@genmotion/project";
import { TimeParseError, parseDuration, parseTime, probeMediaDuration } from "@genmotion/render";
import { downloadAsset } from "./assets";

/**
 * `genmotion audio …` and the `add_audio`/`update_audio`/`remove_audio` MCP
 * tools, as one set of functions over the same string arguments, so a flag
 * and a tool argument accept exactly the same spellings (`2s`, `48`, `500ms`).
 */

export interface AudioArgs {
  /** When it starts on the timeline. */
  at?: string;
  /** How long it plays. Default on add: the rest of the file, or until the video ends. */
  duration?: string;
  /** How far into the file playback begins. */
  from?: string;
  track?: number;
  volume?: number;
  fadeIn?: string;
  fadeOut?: string;
  name?: string;
  muted?: boolean;
}

export interface AudioResult {
  clip: AudioEntry;
  /** The length asked for, when the clip had to be shortened to fit its lane. */
  trimmedFrom?: number;
  /** Set when the source was a URL and was saved into assets/ first. */
  downloaded?: string;
  totalFrames: number;
  fps: number;
}

/** A length that may be zero (fades, offsets). Same spellings as `--duration`. */
function frames(input: string, fps: number): number {
  const text = input.trim();
  if (/^0+(\.0+)?\s*(ms|s|f)?$/i.test(text)) return 0;
  return parseDuration(text, fps);
}

/**
 * An offset into the source file, in seconds. Not snapped to frames: the clip
 * still starts on a frame, but trimming a sound to its transient (`--from 23ms`)
 * is what lands the hit on that frame, and a 33 ms grid can't express it.
 */
function seconds(input: string, fps: number): number {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|f)?$/.exec(input.trim().toLowerCase());
  if (!match) return frames(input, fps) / fps;
  const value = Number(match[1]);
  const unit = match[2] ?? "f";
  return unit === "s" ? value : unit === "ms" ? value / 1000 : value / fps;
}

function volume(value: number): number {
  if (!(value >= 0 && value <= 2)) throw new TimeParseError(`Volume is 0 to 2 (1 is unchanged), got ${value}`);
  return value;
}

function track(value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new TimeParseError(`Track is a lane number from 0, got ${value}`);
  return value;
}

export async function addAudio(projectDir: string, source: string, args: AudioArgs): Promise<AudioResult> {
  const manifest = await readManifest(projectDir);
  const { fps } = manifest;
  const total = manifestTotalFrames(manifest);

  let file = source;
  let downloaded: string | undefined;
  if (/^https?:\/\//i.test(source)) {
    file = (await downloadAsset(projectDir, source)).path;
    downloaded = file;
  }

  const startFrame = args.at ? parseTime(args.at, fps, total) : 0;
  const startFrom = args.from ? seconds(args.from, fps) : 0;
  let durationInFrames: number;
  if (args.duration) {
    durationInFrames = parseDuration(args.duration, fps);
  } else {
    // The whole file from `from` on; the project layer cuts it at the video's
    // end. No ffmpeg (or an unreadable file): run to the end of the video.
    const length = await probeMediaDuration(path.resolve(projectDir, file)).catch(() => null);
    durationInFrames = length && length > startFrom ? Math.ceil((length - startFrom) * fps) : Math.max(1, total - startFrame);
  }

  const result = await addAudioClip(projectDir, {
    file,
    startFrame,
    durationInFrames,
    startFrom,
    ...(args.track !== undefined ? { track: track(args.track) } : {}),
    ...(args.volume !== undefined ? { volume: volume(args.volume) } : {}),
    ...(args.fadeIn ? { fadeInFrames: frames(args.fadeIn, fps) } : {}),
    ...(args.fadeOut ? { fadeOutFrames: frames(args.fadeOut, fps) } : {}),
    ...(args.muted !== undefined ? { muted: args.muted } : {}),
    ...(args.name ? { name: args.name } : {}),
  });
  return {
    clip: result.clip,
    ...(result.trimmedFrom !== undefined ? { trimmedFrom: result.trimmedFrom } : {}),
    ...(downloaded ? { downloaded } : {}),
    totalFrames: total,
    fps,
  };
}

export async function setAudio(projectDir: string, id: string, args: AudioArgs & { file?: string }): Promise<AudioResult> {
  const manifest = await readManifest(projectDir);
  const { fps } = manifest;
  const total = manifestTotalFrames(manifest);
  const patch: AudioClipPatch = {
    ...(args.file ? { file: args.file } : {}),
    ...(args.at ? { startFrame: parseTime(args.at, fps, total) } : {}),
    ...(args.duration ? { durationInFrames: parseDuration(args.duration, fps) } : {}),
    ...(args.from ? { startFrom: seconds(args.from, fps) } : {}),
    ...(args.track !== undefined ? { track: track(args.track) } : {}),
    ...(args.volume !== undefined ? { volume: volume(args.volume) } : {}),
    ...(args.fadeIn ? { fadeInFrames: frames(args.fadeIn, fps) } : {}),
    ...(args.fadeOut ? { fadeOutFrames: frames(args.fadeOut, fps) } : {}),
    ...(args.muted !== undefined ? { muted: args.muted } : {}),
    ...(args.name !== undefined ? { name: args.name } : {}),
  };
  if (Object.keys(patch).length === 0) {
    throw new TimeParseError("Nothing to change: pass --at, --duration, --from, --track, --volume, --fade-in, --fade-out, --name, --mute or --unmute");
  }
  const result = await updateAudioClip(projectDir, id, patch);
  return {
    clip: result.clip,
    ...(result.trimmedFrom !== undefined ? { trimmedFrom: result.trimmedFrom } : {}),
    totalFrames: total,
    fps,
  };
}

export async function removeAudio(projectDir: string, id: string): Promise<{ removed: AudioEntry }> {
  const { clip } = await removeAudioClip(projectDir, id);
  return { removed: clip };
}
