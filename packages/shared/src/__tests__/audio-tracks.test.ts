import { describe, expect, it } from "vitest";
import {
  availableFramesAt,
  resolveAudioPlacement,
  MAX_AUDIO_TRACKS,
  type ClipPlacement,
} from "../audio-tracks";

/**
 * Placing a clip on the audio lanes.
 *
 * The rule: a clip arrives at its full length. Lanes are opened rather than
 * clips shortened, and only when every lane already has something in the way
 * does the clip give up the part that doesn't fit.
 */

const clip = (
  track: number,
  startFrame: number,
  durationInFrames: number,
): ClipPlacement => ({ track, startFrame, durationInFrames });

describe("availableFramesAt", () => {
  it("is unbounded on a lane with nothing ahead", () => {
    expect(availableFramesAt([clip(1, 0, 100)], 0, 0)).toBe(Infinity);
  });

  it("stops at the next clip on the lane", () => {
    expect(availableFramesAt([clip(0, 90, 30)], 0, 30)).toBe(60);
  });

  it("ignores clips that end before the start frame", () => {
    expect(availableFramesAt([clip(0, 0, 30)], 0, 30)).toBe(Infinity);
  });

  it("is zero where a clip already covers the start frame", () => {
    expect(availableFramesAt([clip(0, 0, 90)], 0, 30)).toBe(0);
  });

  it("takes the nearest of several clips ahead", () => {
    expect(availableFramesAt([clip(0, 200, 10), clip(0, 90, 10)], 0, 30)).toBe(60);
  });
});

describe("resolveAudioPlacement", () => {
  it("keeps the whole length on an empty timeline", () => {
    expect(resolveAudioPlacement([], 0, 900)).toEqual({
      track: 0,
      durationInFrames: 900,
    });
  });

  it("opens a fresh lane rather than trimming to fit beside a clip", () => {
    // Lane 0 is busy for the whole span; lane 1 is free, so nothing is cut.
    const placement = resolveAudioPlacement([clip(0, 0, 900)], 0, 900);
    expect(placement).toEqual({ track: 1, durationInFrames: 900 });
  });

  it("trims to the gap once every lane is occupied ahead", () => {
    // Every lane has a clip starting at 60, so a clip dropped at 0 gets the 60
    // frames in front of them instead of being refused.
    const existing = Array.from({ length: MAX_AUDIO_TRACKS }, (_, t) =>
      clip(t, 60, 300),
    );
    expect(resolveAudioPlacement(existing, 0, 900)).toEqual({
      track: 0,
      durationInFrames: 60,
    });
  });

  it("picks the lane with the most room when it has to trim", () => {
    const existing = [
      clip(0, 30, 300),
      clip(1, 120, 300),
      clip(2, 60, 300),
      clip(3, 90, 300),
    ];
    expect(resolveAudioPlacement(existing, 0, 900)).toEqual({
      track: 1,
      durationInFrames: 120,
    });
  });

  it("honours a requested lane that can hold the whole clip", () => {
    expect(resolveAudioPlacement([clip(0, 0, 900)], 0, 300, 2)).toEqual({
      track: 2,
      durationInFrames: 300,
    });
  });

  it("trims to the gap on the lane it was dropped on, rather than moving it", () => {
    // Lane 0 is busy from 60 on and lane 1 is wide open, but the clip was put
    // on lane 0 deliberately — it stays there, as much of it as fits.
    expect(resolveAudioPlacement([clip(0, 60, 300)], 0, 900, 0)).toEqual({
      track: 0,
      durationInFrames: 60,
    });
  });

  it("falls back off a requested lane that is playing at the start frame", () => {
    // Nothing to trim to on lane 0, so the clip goes somewhere it fits whole.
    expect(resolveAudioPlacement([clip(0, 0, 300)], 30, 900, 0)).toEqual({
      track: 1,
      durationInFrames: 900,
    });
  });

  it("gives up on a start frame every lane is playing over", () => {
    const existing = Array.from({ length: MAX_AUDIO_TRACKS }, (_, t) =>
      clip(t, 0, 300),
    );
    expect(resolveAudioPlacement(existing, 30, 900)).toBeNull();
  });

  it("never returns a clip shorter than it was asked for when it fits", () => {
    // A short clip slotted into a gap keeps its own length, not the gap's.
    const existing = Array.from({ length: MAX_AUDIO_TRACKS }, (_, t) =>
      clip(t, 300, 300),
    );
    expect(resolveAudioPlacement(existing, 0, 100)).toEqual({
      track: 0,
      durationInFrames: 100,
    });
  });
});
