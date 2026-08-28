import { describe, expect, it } from "vitest";
import { mediaTargetTime } from "../components/media";

/**
 * Where a <Video> seeks for a given composition frame.
 *
 * The invariant is not a value, it's a position: the sample point must sit
 * strictly INSIDE the frame's interval, never on a boundary. A boundary seek is
 * ambiguous — floating point decides which side of it the decoder lands on —
 * and measured against the real render path that cost every third exported
 * frame, which came back as its predecessor. Anything that walks this back to
 * the leading edge should fail here.
 */

/** Distance from the sample point to the nearest edge of its own frame, in frames. */
function marginInFrames(frame: number, fps: number, opts = {}): number {
  const t = mediaTargetTime({ frame, fps, ...opts });
  const start = frame / fps;
  const end = (frame + 1) / fps;
  return Math.min(t - start, end - t) * fps;
}

describe("mediaTargetTime", () => {
  it("never lands on a frame boundary", () => {
    for (const fps of [24, 25, 30, 50, 60]) {
      for (let frame = 0; frame < 300; frame++) {
        const t = mediaTargetTime({ frame, fps });
        expect(t * fps).not.toBe(Math.floor(t * fps));
      }
    }
  });

  it("keeps a wide margin from both edges of the frame", () => {
    // Half a frame is the ideal; anything under a quarter is drifting back
    // towards the ambiguity this exists to avoid.
    for (const fps of [24, 30, 60]) {
      for (let frame = 0; frame < 300; frame++) {
        expect(marginInFrames(frame, fps)).toBeGreaterThan(0.25);
      }
    }
  });

  it("puts every composition frame in its own source frame at matching fps", () => {
    // The export bug in one assertion: 90 composition frames over a 30fps
    // source must resolve to 90 different source frames.
    const fps = 30;
    const indices = new Set(
      Array.from({ length: 90 }, (_, frame) =>
        Math.floor(mediaTargetTime({ frame, fps }) * fps),
      ),
    );
    expect(indices.size).toBe(90);
  });

  it("advances monotonically", () => {
    let previous = -Infinity;
    for (let frame = 0; frame < 200; frame++) {
      const t = mediaTargetTime({ frame, fps: 30, startFrom: 1.25 });
      expect(t).toBeGreaterThan(previous);
      previous = t;
    }
  });

  it("offsets from startFrom, and scales the offset by playbackRate", () => {
    expect(mediaTargetTime({ frame: 0, fps: 30, startFrom: 2 })).toBeCloseTo(
      2 + 0.5 / 30,
      10,
    );
    // At double speed a composition frame covers two source frames, so the
    // half-frame nudge doubles with it and stays mid-interval.
    expect(
      mediaTargetTime({ frame: 10, fps: 30, playbackRate: 2 }),
    ).toBeCloseTo((10.5 / 30) * 2, 10);
  });

  it("holds the invariant at fps that don't divide cleanly", () => {
    // 29.97 and friends: the boundary is irrational-ish in binary, which is
    // exactly where a leading-edge seek is least predictable.
    for (const fps of [23.976, 29.97, 59.94]) {
      for (let frame = 0; frame < 200; frame++) {
        expect(marginInFrames(frame, fps)).toBeGreaterThan(0.25);
      }
    }
  });
});
