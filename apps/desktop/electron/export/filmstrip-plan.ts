import { createHash } from "node:crypto";
import { FILMSTRIP_TILE_HEIGHT, TIMELINE_PX_PER_SECOND } from "../shared";

/**
 * The arithmetic behind a scene's filmstrip: how many tiles, how wide, and
 * which moments they show. Kept apart from `filmstrip.ts` so it can be tested
 * as the plain numbers it is — that file opens a `BrowserWindow`.
 */

/**
 * Tile width bounds, in CSS pixels. A tile is the card's height times the
 * composition's aspect, so a 16:9 video gets a ~78px tile and a 9:16 one
 * would get ~25px — too narrow to read as a picture, and three times the
 * captures for the same strip. Below the floor the tile is widened and the
 * frame cropped to fit; above the ceiling, narrowed and cropped likewise.
 */
const MIN_TILE_WIDTH = 32;
const MAX_TILE_WIDTH = 120;

/**
 * Tiles per scene, at most. A ten-minute scene at 60px/s would otherwise ask
 * for ~460 captures; past this the tiles widen so the count holds, and the
 * strip samples the scene more coarsely rather than taking much longer.
 */
const MAX_TILES = 240;

/** Device pixels per CSS pixel the strip is drawn at — retina. */
export const FILMSTRIP_SCALE = 2;

export interface FilmstripPlan {
  /** CSS pixels. */
  tileWidth: number;
  tileHeight: number;
  count: number;
  /**
   * Seconds into the scene at which each tile is sampled — the centre of the
   * span it covers, so the picture under any point is never more than half a
   * tile away from that point in time.
   */
  times: number[];
}

export function planFilmstrip(durationSeconds: number, aspect: number): FilmstripPlan {
  const tileHeight = FILMSTRIP_TILE_HEIGHT;
  const natural = Math.round(tileHeight * (Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9));
  let tileWidth = Math.min(MAX_TILE_WIDTH, Math.max(MIN_TILE_WIDTH, natural));

  const stripWidth = Math.max(0, durationSeconds) * TIMELINE_PX_PER_SECOND;
  // Ceil: the strip must reach the card's right edge. The last tile may hang
  // past it and be clipped, which beats a sliver of bare card.
  let count = Math.max(1, Math.ceil(stripWidth / tileWidth));
  if (count > MAX_TILES) {
    count = MAX_TILES;
    tileWidth = Math.ceil(stripWidth / count);
  }

  const tileSeconds = tileWidth / TIMELINE_PX_PER_SECOND;
  // Never sample past the end: the last tile's centre can lie beyond the
  // scene when the strip overhangs, and a seek past the end shows either the
  // next scene or nothing.
  const last = Math.max(0, durationSeconds - 1 / 1000);
  const times = Array.from({ length: count }, (_, i) => Math.min(last, (i + 0.5) * tileSeconds));
  return { tileWidth, tileHeight, count, times };
}

/**
 * Where to crop a `sourceWidth × sourceHeight` picture so it covers a
 * `tileWidth × tileHeight` tile — scaled until both sides reach the tile,
 * then centred. All in the same pixel unit.
 */
export function coverCrop(
  source: { width: number; height: number },
  tile: { width: number; height: number },
): { resize: { width: number; height: number }; crop: { x: number; y: number } } {
  const scale = Math.max(tile.width / source.width, tile.height / source.height);
  const width = Math.max(tile.width, Math.round(source.width * scale));
  const height = Math.max(tile.height, Math.round(source.height * scale));
  return {
    resize: { width, height },
    crop: { x: Math.floor((width - tile.width) / 2), y: Math.floor((height - tile.height) / 2) },
  };
}

/**
 * Lay BGRA tiles side by side into one BGRA bitmap.
 *
 * Every tile is `tileWidth × tileHeight` pixels, four bytes each. Pure buffer
 * copying, one row at a time — there is no image library in the main process
 * and `NativeImage` has no compositing, but the tiles are small enough that
 * this is nothing.
 */
export function compositeStrip(tiles: Buffer[], tileWidth: number, tileHeight: number): Buffer {
  const rowBytes = tileWidth * 4;
  const stripRowBytes = rowBytes * tiles.length;
  const strip = Buffer.alloc(stripRowBytes * tileHeight);
  tiles.forEach((tile, index) => {
    if (tile.length < rowBytes * tileHeight) {
      throw new Error(`filmstrip tile ${index} is ${tile.length} bytes; expected ${rowBytes * tileHeight}`);
    }
    for (let y = 0; y < tileHeight; y++) {
      tile.copy(strip, y * stripRowBytes + index * rowBytes, y * rowBytes, (y + 1) * rowBytes);
    }
  });
  return strip;
}

/** Content key for a strip: same inputs, same file. Short enough for a file name. */
export function filmstripKey(parts: unknown[]): string {
  const hash = createHash("sha1");
  for (const part of parts) hash.update(JSON.stringify(part)).update("\0");
  return hash.digest("hex").slice(0, 16);
}

/**
 * A scene id (a file path) as a file-name stem. Readable, for anyone looking
 * in the cache folder, with a short hash so `a.b.tsx` and `a-b.tsx` — the
 * same once punctuation is folded — do not prune each other's strips.
 */
export function filmstripSlug(sceneId: string): string {
  const readable = sceneId.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "scene";
  return `${readable}-${createHash("sha1").update(sceneId).digest("hex").slice(0, 6)}`;
}
