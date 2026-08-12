import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FrameContext, VideoConfigContext } from "../context";
import { Camera, Layer, Overlay } from "../components/camera";
import { Easing } from "../easing";

/**
 * The determinism trap a camera is uniquely prone to: caching a measured or
 * previous-frame value makes frame N depend on which frames were rendered
 * before it. The export renderer sweeps forwards, but the editor scrubs to
 * arbitrary frames — so the two would silently disagree.
 *
 * This walks a full composition forwards, then backwards, then at random, and
 * requires byte-identical markup every time.
 */
const KEYFRAMES = [
  { at: 0, x: 0.5, y: 0.5, zoom: 1 },
  { at: 60, x: 0.68, y: 0.5, zoom: 1, ease: Easing.inOutCubic },
  { at: 130, x: 0.68, y: 0.42, zoom: 2.6 },
  { at: 200, x: 0.5, y: 0.5, zoom: 1, path: "smooth" as const },
];

const DURATION = 220;

const render = (frame: number) =>
  renderToStaticMarkup(
    <VideoConfigContext.Provider
      value={{ fps: 30, width: 1920, height: 1080, durationInFrames: DURATION }}
    >
      <FrameContext.Provider value={frame}>
        <Camera
          world={2}
          keyframes={KEYFRAMES}
          drift={{ amount: 6, speed: 0.3 }}
          shake={{ at: 150, amount: 18, duration: 12 }}
        >
          <Layer z={7131}>
            <span>bg</span>
          </Layer>
          <Layer>
            <span>mid</span>
          </Layer>
          <Overlay>
            <span>hud</span>
          </Overlay>
        </Camera>
      </FrameContext.Provider>
    </VideoConfigContext.Provider>,
  );

describe("scrubbing a camera composition", () => {
  const forwards = new Map<number, string>();
  for (let f = 0; f < DURATION; f++) forwards.set(f, render(f));

  it("renders identically when scrubbed backwards", () => {
    for (let f = DURATION - 1; f >= 0; f--) {
      expect(render(f)).toBe(forwards.get(f));
    }
  });

  it("renders identically under random access", () => {
    for (const f of [173, 4, 199, 61, 130, 12, 88, 0, 219]) {
      expect(render(f)).toBe(forwards.get(f));
    }
  });

  it("actually moves the camera across the composition", () => {
    // Guard against the above passing trivially because nothing animates.
    expect(new Set(forwards.values()).size).toBeGreaterThan(DURATION / 2);
  });
});
