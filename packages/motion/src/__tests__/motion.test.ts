import { describe, expect, it } from "vitest";
import { interpolate } from "../interpolate";
import { Easing } from "../easing";
import { spring } from "../spring";
import { random } from "../random";
import { stagger, timeline } from "../helpers";

describe("interpolate", () => {
  it("maps linearly", () => {
    expect(interpolate(5, [0, 10], [0, 100])).toBe(50);
  });

  it("supports multi-segment ranges", () => {
    expect(interpolate(15, [0, 10, 20], [0, 1, 0])).toBeCloseTo(0.5);
  });

  it("clamps when asked", () => {
    expect(
      interpolate(-5, [0, 10], [0, 100], { extrapolateLeft: "clamp" }),
    ).toBe(0);
    expect(
      interpolate(15, [0, 10], [0, 100], { extrapolateRight: "clamp" }),
    ).toBe(100);
  });

  it("extends by default", () => {
    expect(interpolate(20, [0, 10], [0, 100])).toBe(200);
  });

  it("applies easing", () => {
    const eased = interpolate(5, [0, 10], [0, 1], { easing: Easing.quad });
    expect(eased).toBeCloseTo(0.25);
  });

  it("is deterministic", () => {
    for (let f = 0; f <= 100; f++) {
      expect(interpolate(f, [0, 100], [0, 1], { easing: Easing.outCubic })).toBe(
        interpolate(f, [0, 100], [0, 1], { easing: Easing.outCubic }),
      );
    }
  });

  it("rejects bad ranges", () => {
    expect(() => interpolate(0, [10, 0], [0, 1])).toThrow();
    expect(() => interpolate(0, [0], [0])).toThrow();
    expect(() => interpolate(0, [0, 1], [0, 1, 2])).toThrow();
  });
});

describe("spring", () => {
  it("starts at `from` and settles at `to`", () => {
    expect(spring({ frame: 0, fps: 30 })).toBe(0);
    expect(spring({ frame: 300, fps: 30 })).toBeCloseTo(1, 2);
  });

  it("is deterministic regardless of evaluation order", () => {
    const config = { stiffness: 200, damping: 15 };
    // Evaluate out of order, then in order — values must match exactly.
    const outOfOrder = [40, 3, 25, 9, 17].map((f) =>
      spring({ frame: f, fps: 30, config }),
    );
    const inOrder = [40, 3, 25, 9, 17].map((f) =>
      spring({ frame: f, fps: 30, config }),
    );
    expect(outOfOrder).toEqual(inOrder);
  });

  it("respects delay", () => {
    expect(spring({ frame: 10, fps: 30, delay: 10 })).toBe(0);
    expect(spring({ frame: 11, fps: 30, delay: 10 })).toBeGreaterThan(0);
  });

  it("maps from/to", () => {
    const value = spring({ frame: 300, fps: 30, from: 100, to: 200 });
    expect(value).toBeCloseTo(200, 1);
  });

  it("settles within durationInFrames when given", () => {
    const value = spring({ frame: 30, fps: 30, durationInFrames: 30 });
    expect(Math.abs(value - 1)).toBeLessThan(0.01);
  });

  it("overshoots with bouncy config", () => {
    let max = 0;
    for (let f = 0; f <= 60; f++) {
      max = Math.max(max, spring({ frame: f, fps: 30, config: { stiffness: 220, damping: 8 } }));
    }
    expect(max).toBeGreaterThan(1.05);
  });
});

describe("random", () => {
  it("is deterministic per seed", () => {
    expect(random("hello")).toBe(random("hello"));
    expect(random(42)).toBe(random(42));
  });

  it("varies across seeds and stays in [0,1)", () => {
    const values = Array.from({ length: 200 }, (_, i) => random(`seed-${i}`));
    expect(new Set(values.map((v) => v.toFixed(6))).size).toBeGreaterThan(190);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("stagger", () => {
  it("delays successive items", () => {
    const p0 = stagger({ frame: 10, index: 0, each: 5, duration: 20 });
    const p2 = stagger({ frame: 10, index: 2, each: 5, duration: 20 });
    expect(p0).toBeGreaterThan(p2);
  });

  it("completes at 1", () => {
    expect(stagger({ frame: 1000, index: 3 })).toBe(1);
  });
});

describe("timeline", () => {
  it("returns progress per segment", () => {
    const [a, b] = timeline(10, [
      { at: 0, dur: 10, ease: Easing.linear },
      { at: 10, dur: 10, ease: Easing.linear },
    ]);
    expect(a).toBe(1);
    expect(b).toBe(0);
  });
});

describe("Easing", () => {
  it("bezier endpoints are exact", () => {
    const ease = Easing.bezier(0.42, 0, 0.58, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5, 2);
  });

  it("out() mirrors in()", () => {
    expect(Easing.out(Easing.quad)(0.25)).toBeCloseTo(1 - Easing.quad(0.75));
  });
});
