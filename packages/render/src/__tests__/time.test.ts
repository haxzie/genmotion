import { describe, expect, it } from "vitest";
import { chunkRange, parseDuration, parseFrameRange, parseTime, TimeParseError } from "../time";
import { crfFor, encoderArgs } from "../ffmpeg";

describe("parseTime", () => {
  it("reads frames, seconds, milliseconds and percentages", () => {
    expect(parseTime("45", 30, 300)).toBe(45);
    expect(parseTime("45f", 30, 300)).toBe(45);
    expect(parseTime("1.5s", 30, 300)).toBe(45);
    expect(parseTime("500ms", 30, 300)).toBe(15);
    expect(parseTime("50%", 30, 301)).toBe(150);
    expect(parseTime(12, 30, 300)).toBe(12);
  });

  it("clamps to the composition", () => {
    expect(parseTime("100%", 30, 300)).toBe(299);
    expect(parseTime("99s", 30, 300)).toBe(299);
    expect(parseTime("-3", 30, 300)).toBe(0);
  });

  it("rejects what it can't read, with a hint", () => {
    expect(() => parseTime("soon", 30, 300)).toThrow(TimeParseError);
    expect(() => parseTime("soon", 30, 300)).toThrow(/1\.5s/);
  });
});

describe("parseDuration", () => {
  it("converts to at least one frame", () => {
    expect(parseDuration("4s", 30)).toBe(120);
    expect(parseDuration("2500ms", 24)).toBe(60);
    expect(parseDuration("90", 30)).toBe(90);
    expect(parseDuration("0", 30)).toBe(1);
  });
});

describe("parseFrameRange", () => {
  it("is inclusive on both ends, like the flag reads", () => {
    expect(parseFrameRange("0-89", 30, 300)).toEqual({ start: 0, end: 90 });
    expect(parseFrameRange("1s-2s", 30, 300)).toEqual({ start: 30, end: 61 });
  });

  it("runs to the end when the right side is open", () => {
    expect(parseFrameRange("120-", 30, 300)).toEqual({ start: 120, end: 300 });
  });

  it("treats a single value as one frame", () => {
    expect(parseFrameRange("10", 30, 300)).toEqual({ start: 10, end: 11 });
  });

  it("refuses an empty range", () => {
    expect(() => parseFrameRange("90-10", 30, 300)).toThrow(/empty/);
  });
});

describe("chunkRange", () => {
  it("splits into contiguous chunks that cover the range exactly once", () => {
    const chunks = chunkRange({ start: 10, end: 1010 }, 4);
    expect(chunks).toHaveLength(4);
    expect(chunks[0]!.start).toBe(10);
    expect(chunks.at(-1)!.end).toBe(1010);
    for (let i = 1; i < chunks.length; i++) expect(chunks[i]!.start).toBe(chunks[i - 1]!.end);
    const sizes = chunks.map((c) => c.end - c.start);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it("never makes chunks smaller than the minimum", () => {
    expect(chunkRange({ start: 0, end: 50 }, 8)).toHaveLength(2);
    expect(chunkRange({ start: 0, end: 10 }, 8)).toEqual([{ start: 0, end: 10 }]);
  });
});

describe("encoder settings", () => {
  it("maps quality to CRF the way the desktop export does", () => {
    expect(crfFor("mp4", 100)).toBe(16);
    expect(crfFor("mp4", 0)).toBe(32);
    expect(crfFor("mp4", 80)).toBe(19);
  });

  it("keeps yuv420p dimensions even", () => {
    const args = encoderArgs("mp4", { fps: 30, width: 1081, height: 1919, crf: 18 });
    expect(args).toContain("scale=1082:1920:flags=lanczos");
    expect(args).toContain("libx264");
  });

  it("encodes webm with VP9", () => {
    expect(encoderArgs("webm", { fps: 30, width: 1920, height: 1080, crf: 30 })).toContain("libvpx-vp9");
  });
});
