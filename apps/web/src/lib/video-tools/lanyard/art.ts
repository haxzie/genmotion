/**
 * Turning what the visitor dropped on the page into something the card can
 * wear: decoding a file, sampling it to the card's ratio, and drawing the two
 * stand-ins (the example badge, and the plain back used when only a front is
 * given).
 *
 * Browser-only on purpose. Everything here runs on a canvas in the visitor's
 * tab, which is what lets the page promise that no image is uploaded.
 */

import {
  ACCEPTED_ART_TYPES,
  CARD_SHAPES,
  LANYARD_STYLES,
  MAX_ART_BYTES,
  TEXTURE_LONG_EDGE,
  type CardArt,
  type CardShapeId,
  type LanyardStyleId,
} from "./types";

/** What went wrong with a file, in words a visitor can act on. */
export class ArtRejected extends Error {}

/**
 * Read a dropped file into a `CardArt`.
 *
 * The object URL is kept rather than a data URI: a 10MB badge as base64 is 13MB
 * of string held for as long as the page is open, and nothing here needs the
 * bytes inline — the texture is sampled from a decoded image, and the preview
 * thumbnail is an `<img>`.
 */
export async function readCardArt(file: File): Promise<CardArt> {
  if (!(ACCEPTED_ART_TYPES as readonly string[]).includes(file.type)) {
    throw new ArtRejected("That file isn't an image. Use a PNG, JPG, or WebP.");
  }
  if (file.size > MAX_ART_BYTES) {
    throw new ArtRejected(
      `That image is ${formatBytes(file.size)}. Keep it under ${formatBytes(MAX_ART_BYTES)}.`,
    );
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await decode(url);
    return { url, width: image.naturalWidth, height: image.naturalHeight, name: file.name };
  } catch {
    URL.revokeObjectURL(url);
    throw new ArtRejected("That image couldn't be decoded. Try exporting it again as a PNG.");
  }
}

export function releaseCardArt(art: CardArt | null): void {
  if (art?.url.startsWith("blob:")) URL.revokeObjectURL(art.url);
}

function decode(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode failed"));
    image.src = url;
  });
}

/** Texture pixel dimensions for a card shape, long edge first. */
export function textureSize(shape: CardShapeId): { width: number; height: number } {
  const { ratio } = CARD_SHAPES[shape];
  return ratio >= 1
    ? { width: TEXTURE_LONG_EDGE, height: Math.round(TEXTURE_LONG_EDGE / ratio) }
    : { width: Math.round(TEXTURE_LONG_EDGE * ratio), height: TEXTURE_LONG_EDGE };
}

/**
 * Sample one face onto a canvas at the card's exact ratio.
 *
 * Cover, not contain: a badge with letterbox bars down the sides stops looking
 * like a badge. An off-ratio upload therefore loses its edges, which is what
 * the recommended sizes beside the upload field exist to prevent.
 */
export async function drawFace(
  art: CardArt,
  shape: CardShapeId,
): Promise<HTMLCanvasElement> {
  const image = await decode(art.url);
  const { width, height } = textureSize(shape);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = context2d(canvas);

  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  return canvas;
}

/**
 * The back of a card nobody gave us one for.
 *
 * A flat colour would make the flip look broken, so this is the style's own
 * palette with the faint vertical seam a laminated card has, and nothing else:
 * it should read as the blank side of a badge, not as a second design.
 */
export function drawPlainBack(
  shape: CardShapeId,
  style: LanyardStyleId,
): HTMLCanvasElement {
  const { width, height } = textureSize(shape);
  const [light, dark] = LANYARD_STYLES[style].plainBack;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = context2d(canvas);

  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, light);
  wash.addColorStop(1, dark);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  const seam = ctx.createLinearGradient(0, 0, width, 0);
  seam.addColorStop(0, "rgba(0,0,0,0)");
  seam.addColorStop(0.5, "rgba(0,0,0,0.055)");
  seam.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = seam;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

/**
 * The example badge the page opens on, front and back.
 *
 * Drawn rather than shipped as a file: an asset in `public/` would be another
 * thing to keep in step with the brand, and this has to be redrawn per card
 * shape anyway. It is laid out like the conference badge the scene was built
 * for (lockup, photo, name, role, a row of tiles) because the whole point of
 * the example is to show what the tool is for, and a gradient does not. Nothing
 * random, so it is the same badge every visit.
 */
export function drawSampleArt(
  shape: CardShapeId,
  face: "front" | "back",
): HTMLCanvasElement {
  const { width, height } = textureSize(shape);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = context2d(canvas);
  // One unit is a hundredth of the short edge, so the layout holds its
  // proportions across all three card shapes.
  const u = Math.min(width, height) / 100;

  ground(ctx, width, height, u);
  if (face === "front") sampleFront(ctx, width, height, u);
  else sampleBack(ctx, width, height, u);
  inset(ctx, width, height, u);
  return canvas;
}

/** Brand palette, sampled from the template this scene is ported from. */
const INK = "#0a0c0c";
const TEXT = "#ededef";
const MUTED = "#8a8a93";
const TILES = ["#b9e255", "#6cdba9", "#4aa891", "#7a6af5", "#2c3433"];

function ground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  u: number,
): void {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, width, height);

  // A faint lift behind the top third, so a near-black card still reads as an
  // object rather than a hole in the frame.
  const lift = ctx.createRadialGradient(
    width / 2,
    height * 0.3,
    u * 4,
    width / 2,
    height * 0.3,
    height * 0.8,
  );
  lift.addColorStop(0, "rgba(108,219,169,0.09)");
  lift.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = lift;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  const cell = u * 9;
  for (let y = cell / 2; y < height; y += cell) {
    for (let x = cell / 2; x < width; x += cell) {
      ctx.beginPath();
      ctx.arc(x, y, u * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The GenMotion mark, simplified to the rounded four-point it reads as. */
function mark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const gradient = ctx.createLinearGradient(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2);
  gradient.addColorStop(0, "#c6f91e");
  gradient.addColorStop(1, "#16f5bd");
  ctx.fillStyle = gradient;
  const r = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.22, cy - r * 0.22, cx + r, cy);
  ctx.quadraticCurveTo(cx + r * 0.22, cy + r * 0.22, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.22, cy + r * 0.22, cx - r, cy);
  ctx.quadraticCurveTo(cx - r * 0.22, cy - r * 0.22, cx, cy - r);
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function label(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  colour: string,
  tracking = 0,
): void {
  ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.letterSpacing = `${tracking}px`;
  ctx.fillStyle = colour;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
  ctx.letterSpacing = "0px";
}

function tileRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = TILES[i % TILES.length]!;
    ctx.beginPath();
    ctx.roundRect(x + i * size, y, size - size * 0.04, size - size * 0.04, size * 0.16);
    ctx.fill();
  }
}

function sampleFront(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  u: number,
): void {
  const pad = u * 9;
  mark(ctx, pad + u * 3, pad + u * 3.4, u * 6.4);
  ctx.textAlign = "left";
  label(ctx, "GenMotion", pad + u * 8, pad + u * 3.4, u * 5.4, 600, TEXT, -u * 0.08);

  // The photo plate: a flat block with a head-and-shoulders silhouette, which
  // says "put a face here" without shipping a stock portrait.
  const plate = { x: pad, y: pad + u * 11, w: width - pad * 2, h: u * 38 };
  ctx.fillStyle = "#1b2221";
  ctx.beginPath();
  ctx.roundRect(plate.x, plate.y, plate.w, plate.h, u * 2.4);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(plate.x, plate.y, plate.w, plate.h, u * 2.4);
  ctx.clip();
  ctx.fillStyle = "rgba(237,237,239,0.14)";
  const headY = plate.y + plate.h * 0.4;
  ctx.beginPath();
  ctx.arc(plate.x + plate.w / 2, headY, plate.h * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(plate.x + plate.w / 2, plate.y + plate.h * 1.05, plate.h * 0.34, plate.h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "center";
  const base = height - u * 22;
  label(ctx, "Your name", width / 2, base, u * 9.5, 600, TEXT, -u * 0.18);
  label(ctx, "YOUR ROLE HERE", width / 2, base + u * 8, u * 3.6, 500, MUTED, u * 0.6);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(width * 0.25, base + u * 12.5, width * 0.5, Math.max(1, u * 0.2));
  label(ctx, "@yourhandle", width / 2, base + u * 17, u * 4.2, 400, "#b4b4bc");

  ctx.textAlign = "left";
  tileRow(ctx, 0, height - u * 7, u * 7, Math.ceil(width / (u * 7)));
}

function sampleBack(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  u: number,
): void {
  mark(ctx, width / 2, height * 0.38, Math.min(width, height) * 0.34);
  ctx.textAlign = "center";
  label(ctx, "GenMotion", width / 2, height * 0.56, u * 11, 600, TEXT, -u * 0.22);
  label(ctx, "Add a back image, or leave it plain", width / 2, height * 0.64, u * 3.8, 400, MUTED);

  // The brand's tile staircase, climbing out of the bottom-left corner.
  const size = u * 7;
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    ctx.fillStyle = TILES[i % TILES.length]!;
    ctx.beginPath();
    ctx.roundRect(
      i * size,
      height - size * (1 + Math.floor(i / 2)),
      size - size * 0.04,
      size - size * 0.04,
      size * 0.16,
    );
    ctx.fill();
  }
  ctx.textAlign = "left";
}

/** The hairline border a laminated card has, following its rounding. */
function inset(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  u: number,
): void {
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = u * 0.45;
  ctx.beginPath();
  ctx.roundRect(u * 0.3, u * 0.3, width - u * 0.6, height - u * 0.6, u * 7);
  ctx.stroke();
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a 2D canvas context");
  return ctx;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)}MB`;
}
