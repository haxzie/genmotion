import { describe, expect, it } from "vitest";
import {
  compositeStrip,
  coverCrop,
  filmstripKey,
  filmstripSlug,
  planFilmstrip,
} from "../filmstrip-plan";
import { FILMSTRIP_TILE_HEIGHT, TIMELINE_PX_PER_SECOND } from "../../shared";

describe("planFilmstrip", () => {
  it("covers the scene's width on the timeline, sampling tile centres", () => {
    const plan = planFilmstrip(10, 16 / 9);
    expect(plan.tileHeight).toBe(FILMSTRIP_TILE_HEIGHT);
    expect(plan.tileWidth).toBe(Math.round(FILMSTRIP_TILE_HEIGHT * (16 / 9)));
    // The strip reaches (or overhangs) the card's right edge.
    expect(plan.count * plan.tileWidth).toBeGreaterThanOrEqual(10 * TIMELINE_PX_PER_SECOND);
    expect((plan.count - 1) * plan.tileWidth).toBeLessThan(10 * TIMELINE_PX_PER_SECOND);
    expect(plan.times).toHaveLength(plan.count);
    const tileSeconds = plan.tileWidth / TIMELINE_PX_PER_SECOND;
    expect(plan.times[0]).toBeCloseTo(tileSeconds / 2);
    expect(plan.times[1]).toBeCloseTo(tileSeconds * 1.5);
  });

  it("never samples past the end of the scene", () => {
    const plan = planFilmstrip(1.4, 16 / 9);
    for (const t of plan.times) expect(t).toBeLessThan(1.4);
    expect(plan.times.at(-1)).toBeGreaterThan(1.3);
  });

  it("widens a portrait tile to the floor and narrows a very wide one to the ceiling", () => {
    expect(planFilmstrip(5, 9 / 16).tileWidth).toBe(32);
    expect(planFilmstrip(5, 4).tileWidth).toBe(120);
  });

  it("caps the tile count on a very long scene by widening the tiles", () => {
    const plan = planFilmstrip(600, 16 / 9);
    expect(plan.count).toBe(240);
    expect(plan.count * plan.tileWidth).toBeGreaterThanOrEqual(600 * TIMELINE_PX_PER_SECOND);
  });

  it("always has at least one tile", () => {
    expect(planFilmstrip(0, 16 / 9).count).toBe(1);
    expect(planFilmstrip(0.1, 16 / 9).count).toBe(1);
  });

  it("falls back to 16:9 for a nonsense aspect", () => {
    expect(planFilmstrip(5, NaN).tileWidth).toBe(planFilmstrip(5, 16 / 9).tileWidth);
    expect(planFilmstrip(5, 0).tileWidth).toBe(planFilmstrip(5, 16 / 9).tileWidth);
  });
});

describe("coverCrop", () => {
  it("scales until both sides cover the tile, then centres the crop", () => {
    // 16:9 source into a 16:9 tile: exact fit, no crop.
    expect(coverCrop({ width: 960, height: 540 }, { width: 156, height: 88 })).toEqual({
      resize: { width: 156, height: 88 },
      crop: { x: 0, y: 0 },
    });
    // Portrait source into a wider tile: the height is what gets cropped.
    const fit = coverCrop({ width: 540, height: 960 }, { width: 64, height: 88 });
    expect(fit.resize.width).toBe(64);
    expect(fit.resize.height).toBeGreaterThan(88);
    expect(fit.crop.x).toBe(0);
    expect(fit.crop.y).toBe(Math.floor((fit.resize.height - 88) / 2));
  });
});

describe("compositeStrip", () => {
  it("lays tiles side by side, row by row", () => {
    const tw = 2;
    const th = 2;
    const tile = (v: number) => Buffer.alloc(tw * th * 4, v);
    const strip = compositeStrip([tile(1), tile(2), tile(3)], tw, th);
    expect(strip.length).toBe(3 * tw * th * 4);
    // Row 0: tile 1's row, tile 2's row, tile 3's row.
    const row = (y: number) => [...strip.subarray(y * 3 * tw * 4, (y + 1) * 3 * tw * 4)];
    expect(row(0)).toEqual([...Array(8).fill(1), ...Array(8).fill(2), ...Array(8).fill(3)]);
    expect(row(1)).toEqual(row(0));
  });

  it("refuses a tile of the wrong size", () => {
    expect(() => compositeStrip([Buffer.alloc(4)], 2, 2)).toThrow(/expected/);
  });
});

describe("keys and slugs", () => {
  it("keys on content and order", () => {
    expect(filmstripKey(["a", 1])).toBe(filmstripKey(["a", 1]));
    expect(filmstripKey(["a", 1])).not.toBe(filmstripKey(["a", 2]));
    expect(filmstripKey(["a", "1"])).not.toBe(filmstripKey(["a", 1]));
    expect(filmstripKey(["ab", "c"])).not.toBe(filmstripKey(["a", "bc"]));
  });

  it("makes a readable, collision-free file stem", () => {
    expect(filmstripSlug("scenes/02-hero.tsx")).toMatch(/^scenes-02-hero-tsx-[0-9a-f]{6}$/);
    expect(filmstripSlug("scenes/a.b.tsx")).not.toBe(filmstripSlug("scenes/a-b.tsx"));
  });
});
