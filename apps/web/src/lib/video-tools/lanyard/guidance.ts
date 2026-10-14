/**
 * What to tell someone about the image they just dropped.
 *
 * Kept out of the component because it is the useful half of this tool's
 * interface: a badge is a printed object with a fixed shape, and the two
 * mistakes everyone makes are uploading a screenshot at a quarter of the
 * resolution the card needs and uploading a 16:9 slide that loses its sides to
 * the crop. Both are worth saying out loud, with the numbers to fix them,
 * before someone exports a soft or beheaded badge.
 */

import {
  CARD_SHAPES,
  MAX_ART_BYTES,
  MIN_ART_FRACTION,
  type CardArt,
  type CardShapeId,
} from "./types";

export interface ArtAdvice {
  tone: "ok" | "warn";
  message: string;
}

const px = (n: number) => n.toLocaleString("en-US");

/** The line under an empty upload field. */
export function uploadHint(shape: CardShapeId): string {
  const { recommended, ratioLabel } = CARD_SHAPES[shape];
  return `${px(recommended.width)} × ${px(recommended.height)} px (${ratioLabel}), PNG, JPG or WebP under ${Math.round(MAX_ART_BYTES / 1024 / 1024)}MB.`;
}

/** The smallest size that still holds up at 1080p, for the "too small" nudge. */
export function minimumSize(shape: CardShapeId): { width: number; height: number } {
  const { recommended } = CARD_SHAPES[shape];
  return {
    width: Math.round(recommended.width * MIN_ART_FRACTION),
    height: Math.round(recommended.height * MIN_ART_FRACTION),
  };
}

/**
 * Everything worth saying about one uploaded face: nothing, or one note per
 * problem. Returns at most one `ok` line, and only when there is no problem.
 */
export function adviseArt(art: CardArt, shape: CardShapeId): ArtAdvice[] {
  const { recommended, ratio, ratioLabel } = CARD_SHAPES[shape];
  const advice: ArtAdvice[] = [];

  const minimum = minimumSize(shape);
  if (art.width < minimum.width || art.height < minimum.height) {
    advice.push({
      tone: "warn",
      message: `At ${px(art.width)} × ${px(art.height)} this will look soft once the card fills the frame. Aim for ${px(recommended.width)} × ${px(recommended.height)}, or ${px(minimum.width)} × ${px(minimum.height)} at the very least.`,
    });
  }

  // The card is filled, not fitted, so an off-ratio upload loses its edges
  // rather than growing bars. Report the loss as a percentage of the axis it
  // comes off, which is the number that tells you whether your logo survives.
  const artRatio = art.width / art.height;
  const lost = artRatio > ratio ? 1 - ratio / artRatio : 1 - artRatio / ratio;
  if (lost > 0.04) {
    const axis = artRatio > ratio ? "sides" : "top and bottom";
    advice.push({
      tone: "warn",
      message: `This is ${artRatio.toFixed(2)}:1 and the card is ${ratioLabel}, so about ${Math.round(lost * 100)}% of the ${axis} will be cropped. Re-export at ${ratioLabel}, or switch the card shape above.`,
    });
  }

  if (advice.length === 0) {
    advice.push({ tone: "ok", message: `${px(art.width)} × ${px(art.height)} px, a clean fit.` });
  }
  return advice;
}
