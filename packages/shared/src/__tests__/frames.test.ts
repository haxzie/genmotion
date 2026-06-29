import { describe, expect, it } from "vitest";
import {
  framesToTimecode,
  globalToLocal,
  localToGlobal,
  sceneStartFrames,
  totalDurationInFrames,
} from "../frames";

const scenes = [
  { id: "a", durationInFrames: 120 },
  { id: "b", durationInFrames: 90 },
  { id: "c", durationInFrames: 60 },
];

describe("sceneStartFrames", () => {
  it("returns cumulative starts", () => {
    expect(sceneStartFrames(scenes)).toEqual([0, 120, 210]);
  });
});

describe("totalDurationInFrames", () => {
  it("sums durations", () => {
    expect(totalDurationInFrames(scenes)).toBe(270);
    expect(totalDurationInFrames([])).toBe(0);
  });
});

describe("globalToLocal", () => {
  it("maps frames to owning scenes", () => {
    expect(globalToLocal(scenes, 0)).toEqual({ sceneIndex: 0, localFrame: 0 });
    expect(globalToLocal(scenes, 119)).toEqual({ sceneIndex: 0, localFrame: 119 });
    expect(globalToLocal(scenes, 120)).toEqual({ sceneIndex: 1, localFrame: 0 });
    expect(globalToLocal(scenes, 209)).toEqual({ sceneIndex: 1, localFrame: 89 });
    expect(globalToLocal(scenes, 210)).toEqual({ sceneIndex: 2, localFrame: 0 });
  });

  it("clamps past the end to the last frame", () => {
    expect(globalToLocal(scenes, 1000)).toEqual({ sceneIndex: 2, localFrame: 59 });
  });

  it("returns null for empty scene lists", () => {
    expect(globalToLocal([], 10)).toBeNull();
  });

  it("round-trips with localToGlobal", () => {
    for (const frame of [0, 50, 120, 150, 269]) {
      const local = globalToLocal(scenes, frame)!;
      expect(localToGlobal(scenes, local.sceneIndex, local.localFrame)).toBe(frame);
    }
  });
});

describe("framesToTimecode", () => {
  it("formats mm:ss.ff", () => {
    expect(framesToTimecode(0, 30)).toBe("00:00.00");
    expect(framesToTimecode(95, 30)).toBe("00:03.05");
    expect(framesToTimecode(1830, 30)).toBe("01:01.00");
  });
});
