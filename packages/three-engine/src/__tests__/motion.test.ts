import { describe, expect, it } from "vitest";
import { clamp01, lerp, prog, between, hash1, hash2, track, springValue, springIn } from "../motion";
import { Easing, trunc, bezier } from "../interpolate";

describe("clamp01 / lerp", () => {
  it("clamps", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(9)).toBe(1);
  });
  it("lerps", () => expect(lerp(10, 20, 0.25)).toBe(12.5));
});

describe("prog and between read their third argument differently, on purpose", () => {
  it("prog takes a duration", () => {
    expect(prog(10, 10, 20)).toBe(0);
    expect(prog(20, 10, 20)).toBe(0.5);
    expect(prog(30, 10, 20)).toBe(1);
  });
  it("between takes an end frame", () => {
    expect(between(10, 10, 20)).toBe(0);
    expect(between(15, 10, 20)).toBe(0.5);
    expect(between(20, 10, 20)).toBe(1);
  });
  it("both clamp outside their window", () => {
    expect(prog(-50, 10, 20)).toBe(0);
    expect(prog(999, 10, 20)).toBe(1);
    expect(between(999, 10, 20)).toBe(1);
  });
  it("a zero duration is a hard cut, not a division by zero", () => {
    expect(prog(9, 10, 0)).toBe(0);
    expect(prog(10, 10, 0)).toBe(1);
  });
  it("applies the easing", () => {
    expect(prog(20, 10, 20, Easing.outCubic)).toBeCloseTo(0.875, 6);
  });
});

describe("hash1 — the deterministic stand-in for Math.random", () => {
  it("is stable across calls", () => {
    expect(hash1(7)).toBe(hash1(7));
    expect(hash2(3, 4)).toBe(hash2(3, 4));
  });
  it("stays inside [0, 1)", () => {
    for (let i = -500; i < 500; i++) {
      const v = hash1(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("decorrelates neighbours", () => {
    const vals = Array.from({ length: 200 }, (_, i) => hash1(i));
    expect(new Set(vals).size).toBe(200);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    expect(mean).toBeGreaterThan(0.4);
    expect(mean).toBeLessThan(0.6);
  });
});

describe("track", () => {
  it("passes through every key exactly", () => {
    const t = track([[0, 0], [10, 5], [20, 1]]);
    expect(t(0)).toBeCloseTo(0, 10);
    expect(t(10)).toBeCloseTo(5, 10);
    expect(t(20)).toBeCloseTo(1, 10);
  });
  it("clamps outside its range", () => {
    const t = track([[10, 2], [20, 8]]);
    expect(t(-99)).toBe(2);
    expect(t(99)).toBe(8);
  });
  it("never overshoots between keys (monotone)", () => {
    const t = track([[0, 0], [10, 10], [20, 10], [30, 0]]);
    for (let f = 0; f <= 30; f += 0.25) {
      expect(t(f)).toBeGreaterThanOrEqual(-1e-9);
      expect(t(f)).toBeLessThanOrEqual(10 + 1e-9);
    }
  });
  it("handles a single key", () => expect(track([[5, 3]])(999)).toBe(3));
});

describe("springValue is a pure function of t, so it survives a seek", () => {
  it("starts at 0 and settles at 1", () => {
    expect(springValue(0)).toBe(0);
    expect(springValue(-1)).toBe(0);
    expect(springValue(5)).toBeCloseTo(1, 3);
  });
  it("gives the same value however you arrive at it", () => {
    const forwards = [0.1, 0.2, 0.3, 0.4].map((t) => springValue(t))[3];
    const backwards = [0.4].map((t) => springValue(t))[0];
    expect(forwards).toBe(backwards);
  });
  it("springIn converts frames to seconds", () => {
    expect(springIn(30, 0, 30)).toBeCloseTo(springValue(1), 10);
  });
});

describe("easings", () => {
  it("all start at 0 and end at 1", () => {
    for (const [name, fn] of Object.entries(Easing)) {
      expect(fn(0), name).toBeCloseTo(0, 6);
      expect(fn(1), name).toBeCloseTo(1, 6);
    }
  });
  it("trunc still rises on its last frame", () => {
    const e = trunc(Easing.outQuart, 0.85);
    expect(e(1)).toBeCloseTo(1, 10);
    expect(e(1) - e(0.98)).toBeGreaterThan(0);
  });
  it("bezier matches linear when it is linear", () => {
    const e = bezier(0.25, 0.25, 0.75, 0.75);
    for (const t of [0.1, 0.33, 0.5, 0.9]) expect(e(t)).toBeCloseTo(t, 3);
  });
});
