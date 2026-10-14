/** GenMotion brand tokens + canvas drawing helpers (palette sampled from the brand art). */

export const FONT = 'Inter, -apple-system, "Helvetica Neue", Arial, sans-serif';

export const C = {
  ink: "#0b0d0d", // near-black ground
  card: "#070909",
  text: "#ededef",
  muted: "#8a8a93",
  lime: "#b9e255",
  mint: "#6cdba9",
  teal: "#4aa891",
  purple: "#7a6af5",
  slate: "#2c3433",
  lilac: "#d6d0fb",
  paleMint: "#d4f7ea",
  logoFrom: "#c6f91e",
  logoTo: "#16f5bd",
} as const;

type G = OffscreenCanvasRenderingContext2D;

/** The GenMotion mark (512 viewBox), drawn with its lime→teal gradient. */
const MARK =
  "M280.083 111.725L280.083 38.5C280.083 25.2083 269.208 14.3333 255.917 14.3333C179.55 14.3333 118.65 108.1 111.642 231.833L38.4167 231.833C25.125 231.833 14.25 242.708 14.25 256C14.25 332.367 108.017 393.267 231.75 400.275L231.75 473.5C231.75 486.792 242.625 497.667 255.917 497.667C332.283 497.667 393.183 403.9 400.192 280.167L473.417 280.167C486.708 280.167 497.583 269.292 497.583 256C497.583 179.633 403.817 118.733 280.083 111.725Z" +
  "M255.917 292.25C235.858 292.25 219.667 276.058 219.667 256C219.667 235.942 235.858 219.75 255.917 219.75C275.975 219.75 292.167 235.942 292.167 256C292.167 276.058 275.975 292.25 255.917 292.25Z";

export function drawMark(g: G, cx: number, cy: number, size: number): void {
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(size / 512, size / 512);
  const grad = g.createLinearGradient(61, 88.5, 428.5, 430);
  grad.addColorStop(0, C.logoFrom);
  grad.addColorStop(1, C.logoTo);
  g.fillStyle = grad;
  g.fill(new Path2D(MARK), "evenodd");
  g.restore();
}

/** Mark + "GenMotion" wordmark, centred on (cx, cy). */
export function drawLockup(g: G, cx: number, cy: number, fontPx: number): void {
  g.save();
  g.font = `500 ${fontPx}px ${FONT}`;
  (g as unknown as { letterSpacing: string }).letterSpacing = `${-fontPx * 0.02}px`;
  const textW = g.measureText("GenMotion").width;
  const mark = fontPx * 1.05;
  const gap = fontPx * 0.28;
  const total = mark + gap + textW;
  const x0 = cx - total / 2;
  drawMark(g, x0 + mark / 2, cy, mark);
  g.fillStyle = C.text;
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText("GenMotion", x0 + mark + gap, cy + fontPx * 0.04);
  g.restore();
}

/** The brand's dotted layout grid. */
export function drawDotGrid(g: G, w: number, h: number, cell: number, ox: number, oy: number): void {
  g.save();
  g.fillStyle = "rgba(255,255,255,0.10)";
  for (let x = ox; x <= w; x += cell) for (let y = 0; y < h; y += 14) g.fillRect(x - 1.5, y, 3, 3);
  for (let y = oy; y <= h; y += cell) for (let x = 0; x < w; x += 14) g.fillRect(x, y - 1.5, 3, 3);
  g.restore();
}

// ── Pixel icons ───────────────────────────────────────────────────────────
const ICONS = {
  gem: ["....#....", "...###...", "..#####..", ".#######.", "####.####", ".#######.", "..#####..", "...###...", "....#...."],
  plus: ["....#....", "....#....", "....#....", "...###...", "#########", "...###...", "....#....", "....#....", "....#...."],
  play: ["#........", "##.......", "###......", "####.....", "#####....", "####.....", "###......", "##.......", "#........"],
  focus: ["##.....##", "#.......#", ".........", ".........", ".........", ".........", ".........", "#.......#", "##.....##"],
  curve: ["......###", ".....#...", "....#....", "....#....", "...#.....", "..#......", ".#.......", ".#.......", "#........"],
} as const;
export type Icon = keyof typeof ICONS;

export interface Tile {
  x: number;
  y: number;
  bg: string;
  icon?: Icon;
  fg?: string;
  band?: string; // a thin top band, as on the brand's stacked tiles
}

export function drawTile(g: G, t: Tile, cell: number): void {
  g.fillStyle = t.bg;
  g.fillRect(t.x, t.y, cell, cell);
  if (t.band) {
    g.fillStyle = t.band;
    g.fillRect(t.x, t.y, cell, cell * 0.38);
  }
  if (t.icon) {
    const rows = ICONS[t.icon];
    const px = Math.floor(cell / 15);
    const iw = rows[0].length * px;
    const ih = rows.length * px;
    const x0 = t.x + (cell - iw) / 2 + (t.icon === "play" ? px * 2 : 0);
    const y0 = t.y + (cell - ih) / 2 + (t.band ? cell * 0.12 : 0);
    g.fillStyle = t.fg ?? C.ink;
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === "#") g.fillRect(x0 + c * px, y0 + r * px, px, px);
    });
  }
}
