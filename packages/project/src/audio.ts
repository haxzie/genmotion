import path from "node:path";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { MAX_AUDIO_TRACKS, resolveAudioPlacement } from "@genmotion/shared";
import { MANIFEST_FILE } from "./paths";
import { ProjectError, readManifest, writeManifest } from "./project";
import { audioEntrySchema, type AudioEntry, type ProjectManifest } from "./schema";

/**
 * Timeline audio as operations rather than JSON surgery.
 *
 * An agent that hand-edits `project.json` has to invent a clip id, pick a lane
 * nothing else is playing on, and keep every number inside the schema; it gets
 * one of those wrong often enough that audio was effectively unavailable
 * outside the desktop app. These are the same rules the desktop timeline
 * applies (lanes from `resolveAudioPlacement`), behind three calls.
 */

export interface AudioClipInput {
  /** Project-relative path of a file already in the project, e.g. `assets/music.mp3`. */
  file: string;
  startFrame: number;
  /** How long it plays on the timeline. */
  durationInFrames: number;
  /** Preferred lane (0-based). Another free lane is used when this one is busy. */
  track?: number;
  /** Seconds into the source file where playback begins. */
  startFrom?: number;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  muted?: boolean;
  name?: string;
}

export type AudioClipPatch = Partial<Omit<AudioClipInput, "file">> & { file?: string };

export interface AudioClipResult {
  clip: AudioEntry;
  /** Set when the clip had to be shortened to fit before the next clip on its lane. */
  trimmedFrom?: number;
  manifest: ProjectManifest;
}

/** The video's length: where clips stop being heard. */
export function manifestTotalFrames(manifest: ProjectManifest): number {
  return manifest.scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
}

async function editableManifest(projectDir: string): Promise<ProjectManifest> {
  const manifest = await readManifest(projectDir);
  if (manifest.engine === "hyperframes") {
    throw new ProjectError("HyperFrames audio lives in index.html as <audio> elements, not in project.json");
  }
  return manifest;
}

async function checkFile(projectDir: string, file: string): Promise<string> {
  const rel = file.replace(/\\/g, "/").replace(/^\.\//, "");
  const abs = path.resolve(projectDir, rel);
  if (path.relative(projectDir, abs).startsWith("..") || path.isAbsolute(rel)) {
    throw new ProjectError(`${file} is outside the project. Copy it into assets/ first`);
  }
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat?.isFile()) throw new ProjectError(`No file at ${rel}`);
  return path.relative(projectDir, abs).split(path.sep).join("/");
}

function idFor(manifest: ProjectManifest, file: string, name?: string): string {
  const base =
    (name ?? path.basename(file, path.extname(file)))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "audio";
  const taken = new Set(manifest.audio.map((a) => a.id));
  let id: string;
  do id = `${base}-${randomBytes(2).toString("hex")}`;
  while (taken.has(id));
  return id;
}

/** Where a clip at this time and length goes, or why it can't. */
function place(
  others: AudioEntry[],
  startFrame: number,
  durationInFrames: number,
  track: number | undefined,
): { track: number; durationInFrames: number } {
  const placed = resolveAudioPlacement(others, startFrame, durationInFrames, track);
  if (!placed) {
    throw new ProjectError(
      `All ${MAX_AUDIO_TRACKS} audio tracks already have a clip playing at frame ${startFrame}. Move or shorten one first`,
    );
  }
  return placed;
}

function validated(clip: AudioEntry): AudioEntry {
  const parsed = audioEntrySchema.safeParse(clip);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ProjectError(`Invalid audio clip: ${issue?.path.join(".") || "clip"} ${issue?.message ?? ""}`.trim());
  }
  return parsed.data;
}

export async function addAudioClip(projectDir: string, input: AudioClipInput): Promise<AudioClipResult> {
  const manifest = await editableManifest(projectDir);
  const file = await checkFile(projectDir, input.file);
  const startFrame = Math.max(0, Math.round(input.startFrame));
  const total = manifestTotalFrames(manifest);
  // Past the last frame nothing is heard; a clip that runs on would only look
  // longer than it sounds on the timeline.
  let wanted = Math.max(1, Math.round(input.durationInFrames));
  if (total > 0) {
    if (startFrame >= total) throw new ProjectError(`Frame ${startFrame} is past the end of the video (${total} frames)`);
    wanted = Math.min(wanted, total - startFrame);
  }
  const placed = place(manifest.audio, startFrame, wanted, input.track);

  const clip = validated({
    id: idFor(manifest, file, input.name),
    file,
    track: placed.track,
    startFrame,
    durationInFrames: placed.durationInFrames,
    startFrom: Math.max(0, input.startFrom ?? 0),
    volume: input.volume ?? 1,
    fadeInFrames: Math.max(0, Math.round(input.fadeInFrames ?? 0)),
    fadeOutFrames: Math.max(0, Math.round(input.fadeOutFrames ?? 0)),
    muted: input.muted ?? false,
    ...(input.name ? { name: input.name } : {}),
  });
  manifest.audio.push(clip);
  await writeManifest(projectDir, manifest);
  return {
    clip,
    ...(placed.durationInFrames < wanted ? { trimmedFrom: wanted } : {}),
    manifest,
  };
}

function findClip(manifest: ProjectManifest, id: string): number {
  const at = manifest.audio.findIndex((a) => a.id === id || a.name === id);
  if (at === -1) {
    const ids = manifest.audio.map((a) => a.id).join(", ") || "none";
    throw new ProjectError(`No audio clip "${id}" in ${MANIFEST_FILE} (clips: ${ids})`);
  }
  return at;
}

export async function updateAudioClip(projectDir: string, id: string, patch: AudioClipPatch): Promise<AudioClipResult> {
  const manifest = await editableManifest(projectDir);
  const at = findClip(manifest, id);
  const current = manifest.audio[at]!;
  const next: AudioEntry = { ...current };

  if (patch.file !== undefined) next.file = await checkFile(projectDir, patch.file);
  if (patch.startFrom !== undefined) next.startFrom = Math.max(0, patch.startFrom);
  if (patch.volume !== undefined) next.volume = patch.volume;
  if (patch.fadeInFrames !== undefined) next.fadeInFrames = Math.max(0, Math.round(patch.fadeInFrames));
  if (patch.fadeOutFrames !== undefined) next.fadeOutFrames = Math.max(0, Math.round(patch.fadeOutFrames));
  if (patch.muted !== undefined) next.muted = patch.muted;
  if (patch.name !== undefined) next.name = patch.name;

  let trimmedFrom: number | undefined;
  const moves = patch.startFrame !== undefined || patch.durationInFrames !== undefined || patch.track !== undefined;
  if (moves) {
    const startFrame = Math.max(0, Math.round(patch.startFrame ?? current.startFrame));
    const total = manifestTotalFrames(manifest);
    let wanted = Math.max(1, Math.round(patch.durationInFrames ?? current.durationInFrames));
    if (total > 0) {
      if (startFrame >= total) throw new ProjectError(`Frame ${startFrame} is past the end of the video (${total} frames)`);
      wanted = Math.min(wanted, total - startFrame);
    }
    const others = manifest.audio.filter((_, i) => i !== at);
    const placed = place(others, startFrame, wanted, patch.track ?? current.track);
    // An explicit lane is a request about where, not a hint: don't quietly
    // move the clip somewhere the caller didn't ask for.
    if (patch.track !== undefined && placed.track !== patch.track) {
      throw new ProjectError(`Track ${patch.track} already has a clip playing at frame ${startFrame}. Pick another track, or omit --track`);
    }
    next.startFrame = startFrame;
    next.track = placed.track;
    next.durationInFrames = placed.durationInFrames;
    if (placed.durationInFrames < wanted) trimmedFrom = wanted;
  }

  const clip = validated(next);
  manifest.audio[at] = clip;
  await writeManifest(projectDir, manifest);
  return { clip, ...(trimmedFrom !== undefined ? { trimmedFrom } : {}), manifest };
}

export async function removeAudioClip(projectDir: string, id: string): Promise<{ clip: AudioEntry; manifest: ProjectManifest }> {
  const manifest = await editableManifest(projectDir);
  const at = findClip(manifest, id);
  const [clip] = manifest.audio.splice(at, 1);
  await writeManifest(projectDir, manifest);
  return { clip: clip!, manifest };
}
