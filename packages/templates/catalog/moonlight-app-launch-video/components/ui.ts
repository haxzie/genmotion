/** Canvas drawing helpers for the iOS-style UI the whole video is built from. */
import { drawText, measure, type G, type TextStyle } from "./kit";

export const C = {
  ink: "#0b0b0c",
  grey: "#8a8a8f",
  line: "#e5e5ea",
  bubbleBlue: "#1fb0f6",
  bubbleGrey: "#e9e9eb",
  unread: "#1a8cff",
  lavender: "#e6dcff",
  pink: "#f3a6e8",
  magenta: "#d86ad9",
  red: "#ff3b30",
};

export function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function circle(g: G, cx: number, cy: number, r: number) {
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
}

/** Avatar image cropped into a circle, with a flat fallback while it loads. */
export function avatar(g: G, img: CanvasImageSource | undefined, cx: number, cy: number, r: number, bg: string, zoom = 1.08) {
  g.save();
  circle(g, cx, cy, r);
  g.fillStyle = bg;
  g.fill();
  g.clip();
  if (img) {
    const d = r * 2 * zoom;
    g.drawImage(img, cx - d / 2, cy - d / 2 + r * 0.04, d, d);
  }
  g.restore();
}

export function statusBar(g: G, x: number, y: number, w: number, time = "7:13", s = 1) {
  drawText(g, time, x, y, { size: 34 * s, weight: 600, color: C.ink });
  const rx = x + w;
  // battery
  g.fillStyle = C.ink;
  rr(g, rx - 46 * s, y - 11 * s, 42 * s, 22 * s, 6 * s);
  g.fill();
  rr(g, rx - 3 * s, y - 4 * s, 4 * s, 8 * s, 2 * s);
  g.fill();
  // wifi
  g.strokeStyle = C.ink;
  g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    g.lineWidth = 4.2 * s;
    g.beginPath();
    g.arc(rx - 80 * s, y + 10 * s, (6 + i * 7.5) * s, -Math.PI * 0.76, -Math.PI * 0.24);
    g.stroke();
  }
  g.beginPath();
  g.arc(rx - 80 * s, y + 9 * s, 3 * s, 0, Math.PI * 2);
  g.fill();
  // signal
  for (let i = 0; i < 4; i++) {
    const bh = (7 + i * 5) * s;
    rr(g, rx - 138 * s + i * 8 * s, y + 10 * s - bh, 5.5 * s, bh, 1.5 * s);
    g.fill();
  }
}

/** Frosted circular/pill iOS 26 style button. */
export function glassPill(g: G, x: number, y: number, w: number, h: number) {
  g.save();
  g.shadowColor = "rgba(0,0,0,0.10)";
  g.shadowBlur = 18;
  g.shadowOffsetY = 4;
  rr(g, x, y, w, h, h / 2);
  g.fillStyle = "#ffffff";
  g.fill();
  g.restore();
  rr(g, x, y, w, h, h / 2);
  g.strokeStyle = "rgba(0,0,0,0.05)";
  g.lineWidth = 1;
  g.stroke();
}

export function filterIcon(g: G, cx: number, cy: number, s = 1) {
  g.strokeStyle = C.ink;
  g.lineWidth = 3 * s;
  g.lineCap = "round";
  const ws = [30, 22, 12];
  ws.forEach((w, i) => {
    g.beginPath();
    g.moveTo(cx - (w * s) / 2, cy + (i - 1) * 9 * s);
    g.lineTo(cx + (w * s) / 2, cy + (i - 1) * 9 * s);
    g.stroke();
  });
}

export function chevron(g: G, x: number, y: number, s = 1, color = "#c7c7cc", dir: "right" | "left" = "right") {
  g.strokeStyle = color;
  g.lineWidth = 3 * s;
  g.lineCap = "round";
  g.lineJoin = "round";
  const d = dir === "right" ? 1 : -1;
  g.beginPath();
  g.moveTo(x - 5 * s * d, y - 10 * s);
  g.lineTo(x + 5 * s * d, y);
  g.lineTo(x - 5 * s * d, y + 10 * s);
  g.stroke();
}

/** A macOS arrow cursor with its tip at (0,0). */
export function cursorArrow(g: G, s = 1) {
  const p: [number, number][] = [[0, 0], [0, 36], [8.5, 27.5], [14.5, 41.5], [20.5, 39], [14.5, 25.5], [26, 25.5]];
  g.beginPath();
  p.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
  g.closePath();
  g.lineJoin = "round";
  g.lineWidth = 3.2 * s;
  g.strokeStyle = "#ffffff";
  g.stroke();
  g.fillStyle = "#000000";
  g.fill();
}

/* ───────────── the Moonlight app icon ───────────── */

let iconCache: OffscreenCanvas | null = null;

function buildIcon(): OffscreenCanvas {
  const S = 512;
  const cv = new OffscreenCanvas(S, S);
  const g = cv.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, "#3b3b40");
  bg.addColorStop(1, "#1f1f22");
  rr(g, 0, 0, S, S, S * 0.225);
  g.fillStyle = bg;
  g.fill();

  // Crescent: drawn on its own canvas so the cut-out stays inside the moon.
  const m = new OffscreenCanvas(S, S);
  const mg = m.getContext("2d")!;
  const grad = mg.createLinearGradient(S * 0.2, S * 0.2, S * 0.75, S * 0.85);
  grad.addColorStop(0, "#ffd6a8");
  grad.addColorStop(0.55, "#f7a3c9");
  grad.addColorStop(1, "#ef5fb3");
  circle(mg as unknown as G, S * 0.47, S * 0.53, S * 0.3);
  mg.fillStyle = grad;
  mg.fill();
  mg.globalCompositeOperation = "destination-out";
  circle(mg as unknown as G, S * 0.62, S * 0.4, S * 0.25);
  mg.fill();
  g.save();
  g.shadowColor = "rgba(239,95,179,0.45)";
  g.shadowBlur = 36;
  g.drawImage(m, 0, 0);
  g.restore();

  // Briefcase tucked into the moon's hollow.
  const bx = S * 0.5, by = S * 0.42, bw = S * 0.27, bh = S * 0.19;
  g.lineWidth = S * 0.028;
  g.strokeStyle = "#fff4ec";
  rr(g, bx + bw * 0.3, by - bh * 0.28, bw * 0.4, bh * 0.36, S * 0.03);
  g.stroke();
  rr(g, bx, by, bw, bh, S * 0.04);
  g.fillStyle = "#fff4ec";
  g.fill();
  g.fillStyle = "#f7a3c9";
  rr(g, bx + bw * 0.42, by + bh * 0.36, bw * 0.16, bh * 0.22, S * 0.012);
  g.fill();

  // Sparkle
  const sp = (cx: number, cy: number, r: number) => {
    g.beginPath();
    g.moveTo(cx, cy - r);
    g.quadraticCurveTo(cx, cy, cx + r, cy);
    g.quadraticCurveTo(cx, cy, cx, cy + r);
    g.quadraticCurveTo(cx, cy, cx - r, cy);
    g.quadraticCurveTo(cx, cy, cx, cy - r);
    g.fillStyle = "#ffe3c4";
    g.fill();
  };
  sp(S * 0.79, S * 0.27, S * 0.06);
  sp(S * 0.7, S * 0.76, S * 0.035);
  return cv;
}

export function appIcon(g: G, x: number, y: number, size: number) {
  if (!iconCache) iconCache = buildIcon();
  g.save();
  g.shadowColor = "rgba(0,0,0,0.18)";
  g.shadowBlur = size * 0.12;
  g.shadowOffsetY = size * 0.04;
  g.drawImage(iconCache, x, y, size, size);
  g.restore();
}

/** App icon as a round avatar (how it shows in Messages). */
export function appAvatar(g: G, cx: number, cy: number, r: number) {
  if (!iconCache) iconCache = buildIcon();
  g.save();
  circle(g, cx, cy, r);
  g.fillStyle = "#29292c";
  g.fill();
  g.clip();
  const d = r * 2.35;
  g.drawImage(iconCache, cx - d / 2, cy - d / 2, d, d);
  g.restore();
}

/* ───────────── iMessage pieces ───────────── */

export interface BubbleSpec {
  lines: string[];
  side: "left" | "right";
  size?: number;
  fill?: string;
  color?: string;
}

export function bubbleSize(b: BubbleSpec) {
  const size = b.size ?? 22;
  const st: TextStyle = { size };
  const tw = Math.max(...b.lines.map((l) => measure(l, st)));
  const padX = size * 0.62;
  const padY = size * 0.42;
  const lh = size * 1.26;
  return { w: Math.ceil(tw + padX * 2), h: Math.ceil(lh * b.lines.length + padY * 2), padX, padY, lh, size };
}

export function drawBubble(g: G, b: BubbleSpec, x: number, y: number, tail = true) {
  const m = bubbleSize(b);
  const fill = b.fill ?? (b.side === "right" ? C.bubbleBlue : C.bubbleGrey);
  const r = Math.min(m.size * 0.9, m.h / 2);
  g.fillStyle = fill;
  rr(g, x, y, m.w, m.h, r);
  g.fill();
  if (tail) {
    const tx = b.side === "right" ? x + m.w : x;
    const d = b.side === "right" ? 1 : -1;
    const ty = y + m.h;
    g.beginPath();
    g.moveTo(tx - d * 14, ty - 18);
    g.quadraticCurveTo(tx + d * 1, ty - 2, tx + d * 8, ty + 1);
    g.quadraticCurveTo(tx - d * 6, ty + 2, tx - d * 16, ty - 6);
    g.closePath();
    g.fill();
  }
  const color = b.color ?? (b.side === "right" ? "#ffffff" : C.ink);
  b.lines.forEach((l, i) => drawText(g, l, x + m.padX, y + m.padY + m.lh * (i + 0.5), { size: m.size, color }));
  return m;
}

/** iOS light keyboard filling a w-wide strip. Returns its height. */
export function keyboard(g: G, x: number, y: number, w: number, s = 1) {
  const h = 290 * s;
  g.fillStyle = "#d4d6dc";
  g.fillRect(x, y, w, h);
  const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  const gap = 6 * s;
  const kw = (w - gap * 11) / 10;
  const kh = 50 * s;
  const key = (kx: number, ky: number, kwid: number, label: string, fill = "#ffffff", fs = 25) => {
    g.save();
    g.shadowColor = "rgba(0,0,0,0.28)";
    g.shadowOffsetY = 1.2 * s;
    rr(g, kx, ky, kwid, kh, 6 * s);
    g.fillStyle = fill;
    g.fill();
    g.restore();
    drawText(g, label, kx + kwid / 2, ky + kh / 2, { size: fs * s, color: C.ink, align: "center" });
  };
  rows.forEach((row, ri) => {
    const ky = y + 10 * s + ri * (kh + 12 * s);
    const n = row.length;
    const rowW = n * kw + (n - 1) * gap;
    const startX = x + (w - rowW) / 2;
    [...row].forEach((ch, i) => key(startX + i * (kw + gap), ky, kw, ch));
    if (ri === 2) {
      key(x + gap, ky, kw * 1.3, "⇧", "#acb0ba", 22);
      key(x + w - gap - kw * 1.3, ky, kw * 1.3, "⌫", "#acb0ba", 20);
    }
  });
  const by = y + 10 * s + 3 * (kh + 12 * s);
  key(x + gap, by, kw * 2.4, "123", "#acb0ba", 18);
  key(x + gap * 2 + kw * 2.4, by, w - gap * 4 - kw * 4.8, "space", "#ffffff", 18);
  key(x + w - gap - kw * 2.4, by, kw * 2.4, "return", "#acb0ba", 18);
  return h;
}

/** Black iPhone body + white screen. Screen rect is returned. */
export function phoneBody(g: G, w: number, h: number) {
  const r = w * 0.155;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.18)";
  g.shadowBlur = 40;
  g.shadowOffsetY = 12;
  rr(g, 0, 0, w, h, r);
  g.fillStyle = "#2a2a2d";
  g.fill();
  g.restore();
  rr(g, 3, 3, w - 6, h - 6, r - 3);
  g.fillStyle = "#0d0d0f";
  g.fill();
  // side buttons
  g.fillStyle = "#2a2a2d";
  rr(g, -5, h * 0.2, 6, h * 0.06, 3); g.fill();
  rr(g, -5, h * 0.29, 6, h * 0.1, 3); g.fill();
  rr(g, w - 1, h * 0.26, 6, h * 0.13, 3); g.fill();
  const bz = w * 0.035;
  const sx = bz, sy = bz, sw = w - bz * 2, sh = h - bz * 2;
  rr(g, sx, sy, sw, sh, r - bz);
  g.fillStyle = "#ffffff";
  g.fill();
  // dynamic island
  rr(g, w / 2 - w * 0.17, sy + sh * 0.017, w * 0.34, w * 0.1, w * 0.05);
  g.fillStyle = "#050506";
  g.fill();
  return { sx, sy, sw, sh };
}

/** Rounded app tile with a soft shadow; returns the inner drawing box. */
export function tile(g: G, x: number, y: number, s: number, fill: string | CanvasGradient) {
  g.save();
  g.shadowColor = "rgba(40,20,80,0.18)";
  g.shadowBlur = s * 0.16;
  g.shadowOffsetY = s * 0.05;
  rr(g, x, y, s, s, s * 0.225);
  g.fillStyle = fill;
  g.fill();
  g.restore();
}

/** Soft pink wash across the lower part of the frame (end-card background). */
export function pinkWash(g: G, w: number, h: number, strength = 1) {
  const lin = g.createLinearGradient(0, h * 0.35, 0, h);
  lin.addColorStop(0, "rgba(246,200,245,0)");
  lin.addColorStop(0.55, `rgba(242,180,240,${0.55 * strength})`);
  lin.addColorStop(1, `rgba(232,150,232,${0.95 * strength})`);
  g.fillStyle = lin;
  g.fillRect(0, 0, w, h);
  const rad = g.createRadialGradient(w * 0.98, h * 1.02, 0, w * 0.98, h * 1.02, w * 0.62);
  rad.addColorStop(0, `rgba(214,96,214,${0.85 * strength})`);
  rad.addColorStop(1, "rgba(214,96,214,0)");
  g.fillStyle = rad;
  g.fillRect(0, 0, w, h);
}
