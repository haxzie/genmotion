import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createProject, readManifest } from "../project";
import { addAudioClip, manifestTotalFrames, removeAudioClip, updateAudioClip } from "../audio";

let dir: string;
let total: number;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-audio-"));
  const manifest = await createProject({ dir, name: "Audio", engine: "three" });
  total = manifestTotalFrames(manifest);
  await fs.mkdir(path.join(dir, "assets"), { recursive: true });
  await fs.writeFile(path.join(dir, "assets", "music.mp3"), "");
  await fs.writeFile(path.join(dir, "assets", "whoosh.mp3"), "");
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("timeline audio", () => {
  it("adds a clip, cut at the video's end, and writes it to project.json", async () => {
    const { clip, trimmedFrom } = await addAudioClip(dir, { file: "./assets/music.mp3", startFrame: 0, durationInFrames: total * 3, fadeOutFrames: 15 });
    expect(clip).toMatchObject({ file: "assets/music.mp3", track: 0, startFrame: 0, durationInFrames: total, fadeOutFrames: 15, volume: 1 });
    expect(clip.id).toMatch(/^music-[0-9a-f]{4}$/);
    expect(trimmedFrom).toBeUndefined();
    expect((await readManifest(dir)).audio).toEqual([clip]);
  });

  it("puts an overlapping clip on the next free lane, and refuses when all are busy", async () => {
    for (let i = 0; i < 4; i++) {
      const { clip } = await addAudioClip(dir, { file: "assets/whoosh.mp3", startFrame: 10, durationInFrames: 20 });
      expect(clip.track).toBe(i);
    }
    await expect(addAudioClip(dir, { file: "assets/whoosh.mp3", startFrame: 15, durationInFrames: 5 })).rejects.toThrow(/All 4 audio tracks/);
  });

  it("shortens a clip that runs into the next one on its lane, and says so", async () => {
    await addAudioClip(dir, { file: "assets/whoosh.mp3", startFrame: 60, durationInFrames: 10, track: 0 });
    const { clip, trimmedFrom } = await addAudioClip(dir, { file: "assets/music.mp3", startFrame: 0, durationInFrames: 100, track: 0 });
    expect(clip).toMatchObject({ track: 0, durationInFrames: 60 });
    expect(trimmedFrom).toBe(100);
  });

  it("updates by id or name, and won't move a clip onto a busy lane it was told to use", async () => {
    await addAudioClip(dir, { file: "assets/music.mp3", startFrame: 0, durationInFrames: total, track: 0 });
    const { clip } = await addAudioClip(dir, { file: "assets/whoosh.mp3", startFrame: 30, durationInFrames: 10, name: "Whoosh" });
    expect(clip.track).toBe(1);
    const moved = await updateAudioClip(dir, "Whoosh", { startFrame: 50, volume: 0.5, muted: true });
    expect(moved.clip).toMatchObject({ id: clip.id, startFrame: 50, track: 1, volume: 0.5, muted: true });
    await expect(updateAudioClip(dir, clip.id, { track: 0 })).rejects.toThrow(/Track 0 already has a clip/);
    await expect(updateAudioClip(dir, clip.id, { volume: 3 })).rejects.toThrow(/Invalid audio clip/);
  });

  it("removes a clip and rejects files outside the project or missing", async () => {
    const { clip } = await addAudioClip(dir, { file: "assets/music.mp3", startFrame: 0, durationInFrames: 30 });
    await removeAudioClip(dir, clip.id);
    expect((await readManifest(dir)).audio).toEqual([]);
    await expect(removeAudioClip(dir, clip.id)).rejects.toThrow(/No audio clip/);
    await expect(addAudioClip(dir, { file: "../elsewhere.mp3", startFrame: 0, durationInFrames: 30 })).rejects.toThrow(/outside the project/);
    await expect(addAudioClip(dir, { file: "assets/nope.mp3", startFrame: 0, durationInFrames: 30 })).rejects.toThrow(/No file at/);
    await expect(addAudioClip(dir, { file: "assets/music.mp3", startFrame: total, durationInFrames: 30 })).rejects.toThrow(/past the end/);
  });
});
