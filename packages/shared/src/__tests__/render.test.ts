import { describe, expect, it } from "vitest";
import { buildRenderAudioSources } from "../render";

describe("buildRenderAudioSources", () => {
  it("plays a whole voiceover from the scene's start", () => {
    const sources = buildRenderAudioSources(
      [
        { durationInFrames: 30, audioUrl: null },
        { durationInFrames: 60, audioUrl: "vo.mp3", audioVolume: 0.8 },
      ],
      [],
      30,
    );
    expect(sources).toEqual([{ url: "vo.mp3", delayMs: 1000, volume: 0.8 }]);
  });

  it("windows a split scene's voiceover to each half", () => {
    const sources = buildRenderAudioSources(
      [
        { durationInFrames: 40, audioUrl: "vo.mp3", startFrom: 0 },
        { durationInFrames: 60, audioUrl: "vo.mp3", startFrom: 40 },
      ],
      [],
      30,
    );
    expect(sources).toEqual([
      { url: "vo.mp3", delayMs: 0, volume: 1, startFromSec: 0, durationSec: 40 / 30 },
      { url: "vo.mp3", delayMs: (40 / 30) * 1000, volume: 1, startFromSec: 40 / 30, durationSec: 2 },
    ]);
  });
});
