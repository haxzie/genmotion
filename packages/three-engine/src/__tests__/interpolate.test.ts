import { describe, expect, it } from "vitest";
import { Easing, interpolate } from "../interpolate";

describe("interpolate", () => {
  it("maps a value inside the range", () => {
    expect(interpolate(5, [0, 10], [0, 100])).toBe(50);
  });

  it("clamps below the first input", () => {
    expect(interpolate(-5, [0, 10], [0, 100])).toBe(0);
  });

  it("clamps above the last input", () => {
    expect(interpolate(15, [0, 10], [0, 100])).toBe(100);
  });

  it("supports multi-segment ranges", () => {
    expect(interpolate(10, [0, 10, 20], [0, 1, 0])).toBe(1);
    expect(interpolate(15, [0, 10, 20], [0, 1, 0])).toBe(0.5);
  });

  it("applies an easing function to the segment progress", () => {
    const halfway = interpolate(5, [0, 10], [0, 100], Easing.easeIn);
    expect(halfway).toBe(Easing.easeIn(0.5) * 100);
  });

  it("rejects mismatched or too-short ranges", () => {
    expect(() => interpolate(5, [0], [0])).toThrow();
    expect(() => interpolate(5, [0, 10], [0, 1, 2])).toThrow();
  });
});

describe("Easing", () => {
  it("is the identity at 0 and 1 for the built-ins", () => {
    for (const easing of Object.values(Easing)) {
      expect(easing(0)).toBeCloseTo(0);
      expect(easing(1)).toBeCloseTo(1);
    }
  });
});
