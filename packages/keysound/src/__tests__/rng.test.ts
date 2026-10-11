import { describe, expect, it } from "vitest";
import { Rng, seedFrom } from "../rng";

describe("Rng", () => {
  it("matches the reference sequence", () => {
    // The first outputs of SplitMix64 seeded with 0, from the reference
    // implementation. If this changes, every project ever made re-times.
    const rng = new Rng(0n);
    expect(rng.nextU64()).toBe(0xe220a8397b1dcdafn);
    expect(rng.nextU64()).toBe(0x6e789e6aa1b965f4n);
  });

  it("keeps floats inside the unit interval", () => {
    const rng = new Rng("genmotion");
    for (let i = 0; i < 10_000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("seeds from text stably and distinctly", () => {
    expect(seedFrom("a")).toBe(seedFrom("a"));
    expect(seedFrom("a")).not.toBe(seedFrom("b"));
    // Non-ASCII goes through the hand-rolled UTF-8 path.
    expect(seedFrom("é")).not.toBe(seedFrom("e"));
  });

  it("draws normals with roughly the right shape", () => {
    const rng = new Rng("normal");
    const draws = Array.from({ length: 20_000 }, () => rng.normal());
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    const sd = Math.sqrt(draws.reduce((a, b) => a + (b - mean) ** 2, 0) / draws.length);
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(sd).toBeGreaterThan(0.95);
    expect(sd).toBeLessThan(1.05);
  });
});
