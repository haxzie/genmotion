import { describe, it, expect } from "vitest";
import { watermarkHtml, watermarkScale } from "../watermark";

// The badge is the only thing a Free export carries that the user didn't
// author, so its rules are worth pinning: it must not vanish on a small canvas,
// must not dominate a large one, must weigh the same in portrait and landscape,
// and its svg must survive sharing a document with arbitrary scene markup.

describe("watermarkScale", () => {
  it("is 1 at 1080p, in either orientation", () => {
    expect(watermarkScale(1920, 1080)).toBe(1);
    expect(watermarkScale(1080, 1920)).toBe(1);
  });

  it("tracks the shorter edge", () => {
    expect(watermarkScale(2560, 1440)).toBeCloseTo(1440 / 1080);
    expect(watermarkScale(1280, 720)).toBeCloseTo(720 / 1080);
  });

  it("clamps so tiny and huge canvases stay sane", () => {
    expect(watermarkScale(320, 240)).toBe(0.5);
    expect(watermarkScale(7680, 4320)).toBe(2);
  });
});

describe("watermarkHtml", () => {
  it("renders one root element wrapping the lockup", () => {
    const html = watermarkHtml(1920, 1080);
    expect(html.startsWith('<div id="gm-watermark"')).toBe(true);
    expect(html.endsWith("</div>")).toBe(true);
    expect(html).toContain("<svg");
    expect(html).toContain('viewBox="0 0 1920 360"');
  });

  it("pins itself to the bottom-right above any scene content", () => {
    const html = watermarkHtml(1920, 1080);
    expect(html).toContain("position:fixed");
    expect(html).toContain("right:40px");
    expect(html).toContain("bottom:32px");
    expect(html).toContain("z-index:2147483647");
    expect(html).toContain("pointer-events:none");
  });

  it("sizes the lockup to the canvas, keeping its aspect ratio", () => {
    // 1080p → the 300px base width; 360/1920 of that is 56px tall.
    expect(watermarkHtml(1920, 1080)).toContain(
      '<svg width="300" height="56"',
    );
    // Half scale → half the box, both axes.
    expect(watermarkHtml(960, 540)).toContain('<svg width="150" height="28"');
  });

  it("is identical for portrait and landscape of the same shorter edge", () => {
    expect(watermarkHtml(1080, 1920)).toBe(watermarkHtml(1920, 1080));
  });

  it("namespaces every svg id so scene markup can't collide with it", () => {
    const html = watermarkHtml(1920, 1080);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]!);
    // Including the wrapper div, every id in the fragment is ours.
    expect(ids.length).toBeGreaterThan(1);
    for (const id of ids) {
      expect(id === "gm-watermark" || id.startsWith("gm-wm-")).toBe(true);
    }
    // The asset's raw Figma ids must not survive un-prefixed.
    expect(html).not.toMatch(/\bid="(mask|clip|path)[^"]*_\d+_\d+"/);
  });

  it("keeps every url(#…) reference pointing at a declared id", () => {
    // A dangling reference silently breaks the alpha mask and blanks the badge,
    // which no snapshot of the markup would catch.
    const html = watermarkHtml(1920, 1080);
    const ids = new Set(
      [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]!),
    );
    const refs = [...html.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]!);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ids.has(ref)).toBe(true);
  });
});
