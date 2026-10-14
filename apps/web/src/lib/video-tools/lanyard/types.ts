/**
 * Shared vocabulary for the 3D lanyard drop generator.
 *
 * The other free generators fetch a number and hand it to a template. This one
 * has no source at all: the two card images are read off the visitor's own
 * disk, decoded into textures, and never leave the browser. That is why there
 * is no `/api/tools/lanyard-drop-video` route to go with the page, and why the
 * copy can promise outright that nothing is uploaded.
 */

/* ---------------------------------------------------------------- card shape */

export const CARD_SHAPE_IDS = ["portrait", "square", "landscape"] as const;

export type CardShapeId = (typeof CARD_SHAPE_IDS)[number];

export interface CardShape {
  label: string;
  /** Width ÷ height of the printed card. */
  ratio: number;
  /** `ratio` as people write it, for the upload guidance. */
  ratioLabel: string;
  /** What we ask people to upload. Both faces are sampled to this ratio. */
  recommended: { width: number; height: number };
  /** The real-world object this matches, so the choice is recognisable. */
  hint: string;
}

/**
 * The three shapes a badge actually comes in.
 *
 * `ratio` drives the 3D card's geometry, and `recommended` is the size shown
 * beside the upload field. Both are deliberately round numbers at a ratio
 * within a percent of the physical card: an ID badge is 2.125 × 3.375 in,
 * which is 0.6296, and 5:8 (0.625) is close enough that nobody can see the
 * difference while being a size people can type into an export dialog.
 */
export const CARD_SHAPES: Record<CardShapeId, CardShape> = {
  portrait: {
    label: "Portrait",
    ratio: 5 / 8,
    ratioLabel: "5:8",
    recommended: { width: 1250, height: 2000 },
    hint: "Conference and office ID badge, 2.1 × 3.4 in",
  },
  square: {
    label: "Square",
    ratio: 1,
    ratioLabel: "1:1",
    recommended: { width: 1600, height: 1600 },
    hint: "Square event pass or sticker badge",
  },
  landscape: {
    label: "Landscape",
    ratio: 8 / 5,
    ratioLabel: "8:5",
    recommended: { width: 2000, height: 1250 },
    hint: "Press pass or credit-card shaped badge",
  },
};

/**
 * Below this fraction of the recommended long edge we warn that the card will
 * look soft. The card fills a little over half the frame, so a 1080p export
 * magnifies the art by roughly 1.5× before anything else: half the recommended
 * size is about where the softness becomes visible on a phone.
 */
export const MIN_ART_FRACTION = 0.5;

/** Hard ceiling on an upload, enough for a 300dpi print file. */
export const MAX_ART_BYTES = 12 * 1024 * 1024;

/** The long edge the art is sampled to before it becomes a texture. */
export const TEXTURE_LONG_EDGE = 2048;

export const ACCEPTED_ART_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** Closest shape to an uploaded image, so the first drop picks the geometry. */
export function shapeForRatio(ratio: number): CardShapeId {
  let best: CardShapeId = "portrait";
  let bestDistance = Infinity;
  for (const id of CARD_SHAPE_IDS) {
    // Compared in log space: a 2:1 image is equally wrong for a 1:1 card
    // whichever way round it is.
    const distance = Math.abs(Math.log(ratio / CARD_SHAPES[id].ratio));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = id;
    }
  }
  return best;
}

/* -------------------------------------------------------------------- styles */

export const LANYARD_STYLE_IDS = ["studio", "daylight", "neon"] as const;

export type LanyardStyleId = (typeof LANYARD_STYLE_IDS)[number];

export interface LanyardStyle {
  label: string;
  /** Clear colour behind everything. */
  background: string;
  /** The wall the badge throws its shadow onto. */
  wall: string;
  /** A soft bloom on that wall, so a dark card still separates from it. */
  glow: [string, string];
  /** Default strap colour; the visitor can override it. */
  strap: string;
  /** Key / fill / rim / ambient intensities, over the key's colour. */
  lights: { key: string; keyIntensity: number; fill: string; rim: string; ambient: number };
  /** Plain card back, used when only a front is uploaded. */
  plainBack: [string, string];
}

export const LANYARD_STYLES: Record<LanyardStyleId, LanyardStyle> = {
  studio: {
    label: "Studio",
    background: "#060707",
    wall: "#0d0f0f",
    glow: ["rgba(108,219,169,0.22)", "rgba(74,168,145,0.08)"],
    strap: "#151918",
    lights: { key: "#ffffff", keyIntensity: 2.1, fill: "#dfe6ff", rim: "#ffffff", ambient: 0.75 },
    plainBack: ["#1b1f1e", "#0b0d0d"],
  },
  daylight: {
    label: "Daylight",
    background: "#edeef2",
    wall: "#e2e4ea",
    glow: ["rgba(255,255,255,0.5)", "rgba(190,196,210,0.14)"],
    strap: "#1b2f6b",
    lights: { key: "#ffffff", keyIntensity: 2.4, fill: "#ffffff", rim: "#dfe6f5", ambient: 1.5 },
    plainBack: ["#ffffff", "#dfe2ea"],
  },
  neon: {
    label: "Neon",
    background: "#05040e",
    wall: "#0c0820",
    glow: ["rgba(255,79,216,0.26)", "rgba(95,123,255,0.12)"],
    strap: "#2a1a54",
    lights: { key: "#fff3f8", keyIntensity: 1.9, fill: "#5f7bff", rim: "#ff4fd8", ambient: 0.6 },
    plainBack: ["#1d1a3a", "#0b0a1c"],
  },
};

/**
 * 16 seconds at 30fps, the length of the template this is ported from.
 *
 * Longer than the metric generators' six, and deliberately so: the shot is a
 * drop, a bounce, a swing, a full turn onto the card's back and a settle before
 * the badge is yanked back out of frame, and the beats stop reading if they are
 * crushed together.
 */
export const LANYARD_FPS = 30;
export const LANYARD_DURATION_IN_FRAMES = 480;

/* --------------------------------------------------------------------- input */

/** One decoded card face, ready to be sampled into a texture. */
export interface CardArt {
  /** An object URL or a `data:` URI. Never a remote URL. */
  url: string;
  /** Intrinsic pixels, used for the "too small" and "wrong ratio" nudges. */
  width: number;
  height: number;
  /** Shown back to the visitor so they can tell the two faces apart. */
  name: string;
}

export interface LanyardConfig {
  shape: CardShapeId;
  front: CardArt | null;
  /** Optional: a missing back becomes a plain card in the style's palette. */
  back: CardArt | null;
  style: LanyardStyleId;
  /** Webbing colour, as a hex string. */
  strap: string;
}
