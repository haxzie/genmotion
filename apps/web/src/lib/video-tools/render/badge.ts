/**
 * The GenMotion badge burned into every free-tool video.
 *
 * Deliberately composited onto the export canvas rather than added to the
 * composition DOM: templates never see it, so no template can move, cover, or
 * restyle it, and it can't affect layout. The geometry mirrors
 * `apps/renderer/src/watermark.ts` so a tool video and a Free-plan product
 * export carry the badge at the same size and inset.
 */

/** Lockup width, in px, for a composition whose shorter edge is 1080. */
const BASE_WIDTH = 300;
const MARGIN_RIGHT = 40;
const MARGIN_BOTTOM = 32;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Badge scale for a composition. Driven by the *shorter* edge so a 1080×1920
 * vertical video and a 1920×1080 landscape one get the same visual weight.
 * Kept in sync with `watermarkScale` in the renderer.
 */
function badgeScale(width: number, height: number): number {
  return clamp(Math.min(width, height) / 1080, 0.5, 2);
}

export interface Badge {
  image: CanvasImageSource;
  width: number;
  height: number;
}

/**
 * Load the lockup once per page and rasterize it at the requested width.
 *
 * The SVG is given explicit width/height attributes before being turned into an
 * image: an SVG sized only by `viewBox` has no intrinsic dimensions in some
 * browsers, and `drawImage` then produces nothing.
 */
async function loadBadge(width: number): Promise<Badge> {
  const source = await fetch("/genmotion-watermark.svg").then((r) => {
    if (!r.ok) throw new Error(`badge fetch failed: ${r.status}`);
    return r.text();
  });

  const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(source);
  const artWidth = Number(viewBox?.[1] ?? 1920);
  const artHeight = Number(viewBox?.[2] ?? 360);
  const height = Math.round((width * artHeight) / artWidth);

  const sized = source
    .trim()
    .replace(/<svg\b[^>]*>/, (tag) =>
      tag
        .replace(/\swidth="[^"]*"/, "")
        .replace(/\sheight="[^"]*"/, "")
        .replace("<svg", `<svg width="${width}" height="${height}"`),
    );

  const blob = new Blob([sized], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // Bake it into a bitmap so the per-frame draw is a plain blit rather than a
    // re-rasterization of a 60KB SVG 180 times.
    const bitmap = await createImageBitmap(img);
    return { image: bitmap, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Memoized per page, keyed by rendered width — the three aspect ratios all share
 * a shorter edge of 1080, so in practice this holds a single entry.
 */
const cache = new Map<number, Promise<Badge>>();

export function getBadge(compWidth: number, compHeight: number): Promise<Badge> {
  const width = Math.round(BASE_WIDTH * badgeScale(compWidth, compHeight));
  let badge = cache.get(width);
  if (!badge) {
    badge = loadBadge(width);
    cache.set(width, badge);
  }
  return badge;
}

/** Draw the badge into the bottom-right of an already-painted frame. */
export function drawBadge(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  badge: Badge,
  compWidth: number,
  compHeight: number,
): void {
  const scale = badgeScale(compWidth, compHeight);
  const x = compWidth - badge.width - Math.round(MARGIN_RIGHT * scale);
  const y = compHeight - badge.height - Math.round(MARGIN_BOTTOM * scale);
  ctx.drawImage(badge.image, x, y, badge.width, badge.height);
}
