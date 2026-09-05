import { WATERMARK_SVG_SOURCE } from "./watermark-svg.generated";

/**
 * The Free-plan export badge — the GenMotion lockup burned into the
 * bottom-right of every rendered frame.
 *
 * It is drawn as a DOM layer on the render page rather than as an ffmpeg
 * overlay filter, so it costs no extra encode pass and lands identically
 * whatever the render pipeline: `apps/renderer`'s hosted Playwright page,
 * `apps/desktop`'s offscreen `BrowserWindow`, MP4/WebM/GIF, all of it — every
 * one screenshots the same DOM. The badge is a fixed-position sibling of the
 * composition root, so scene code can neither cover it nor be reflowed by it.
 *
 * The artwork is an embedded string (`watermark-svg.generated.ts`, built by
 * `scripts/generate-watermark.mjs`) rather than a file read at runtime: one of
 * this package's two consumers bundles into a single file with esbuild, where
 * an `import.meta.url`-relative path resolves against the *bundle's* location,
 * not this module's — a problem a plain string constant doesn't have.
 */

/** Lockup width, in px, for a composition whose shorter edge is 1080. */
const BASE_WIDTH = 300;

interface Lockup {
  svg: string;
  width: number;
  height: number;
}

let cached: Lockup | null = null;

/**
 * Prepare the artwork, memoized after the first call.
 *
 * The asset is a Figma export whose ids (`mask0_854_166`, …) end up in the
 * same document as arbitrary user scene code. Prefixing every id and every
 * `url(#…)` reference makes a collision — which would silently break the alpha
 * mask and blank the badge — impossible.
 */
function lockup(): Lockup {
  if (cached) return cached;
  const source = WATERMARK_SVG_SOURCE;
  const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(source);
  cached = {
    svg: source
      .replace(/\bid="([^"]+)"/g, 'id="gm-wm-$1"')
      .replace(/url\(#([^)]+)\)/g, "url(#gm-wm-$1)"),
    width: Number(viewBox?.[1] ?? 1920),
    height: Number(viewBox?.[2] ?? 360),
  };
  return cached;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Badge scale for a composition. Driven by the *shorter* edge so a 1080×1920
 * vertical video and a 1920×1080 landscape one get the same visual weight, and
 * bounded so tiny or very large canvases stay sane.
 */
export function watermarkScale(width: number, height: number): number {
  return clamp(Math.min(width, height) / 1080, 0.5, 2);
}

/** The lockup at an explicit pixel width, preserving its aspect ratio. */
function lockupSvg(width: number): string {
  const art = lockup();
  const height = Math.round((width * art.height) / art.width);
  return art.svg.replace(/<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/\swidth="[^"]*"/, "")
      .replace(/\sheight="[^"]*"/, "")
      .replace("<svg", `<svg width="${width}" height="${height}" style="display:block"`),
  );
}

/**
 * Markup for the badge, sized for a `width`×`height` composition. A single root
 * element with fully inline styles — the render page carries no stylesheet of
 * its own, and inline styles can't be overridden by scene CSS.
 *
 * The artwork carries its own translucency (a hatched fill with an outlined
 * stroke), so it needs no backing plate: it reads as an etched mark over both
 * dark and light footage.
 */
export function watermarkHtml(width: number, height: number): string {
  const s = watermarkScale(width, height);
  const px = (n: number) => `${Math.round(n * s)}px`;

  const container = [
    "position:fixed",
    `right:${px(40)}`,
    `bottom:${px(32)}`,
    "z-index:2147483647",
    "display:block",
    "line-height:0",
    "pointer-events:none",
    // The composition is arbitrary user code; keep its cascade out of the badge.
    "filter:none",
    "transform:none",
    "opacity:1",
  ].join(";");

  return (
    `<div id="gm-watermark" style="${container}">` + lockupSvg(Math.round(BASE_WIDTH * s)) + `</div>`
  );
}
