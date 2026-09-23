/**
 * Canvas drawing helpers: text, shapes, the X mark, and a small icon set.
 * Icons are drawn from 24×24 outline paths (lucide geometry) so they stay
 * crisp at any zoom the camera pushes to.
 */
import { FONT, type G } from "./core";

/* ----------------------------------------------------------------- text -- */

export function font(size: number, weight = 400) {
  return `${weight} ${size}px ${FONT}`;
}

export function text(
  g: G,
  str: string,
  x: number,
  y: number,
  size: number,
  color: string,
  opts: { weight?: number; align?: CanvasTextAlign; baseline?: CanvasTextBaseline; spacing?: number } = {},
) {
  g.font = font(size, opts.weight ?? 400);
  g.fillStyle = color;
  g.textAlign = opts.align ?? "left";
  g.textBaseline = opts.baseline ?? "middle";
  (g as unknown as { letterSpacing: string }).letterSpacing = `${opts.spacing ?? 0}px`;
  g.fillText(str, x, y);
  (g as unknown as { letterSpacing: string }).letterSpacing = "0px";
}

export function measure(g: G, str: string, size: number, weight = 400, spacing = 0) {
  g.font = font(size, weight);
  (g as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
  const w = g.measureText(str).width;
  (g as unknown as { letterSpacing: string }).letterSpacing = "0px";
  return w;
}

/** A run of differently-styled pieces laid out on one line. */
export function richLine(
  g: G,
  parts: Array<{ s: string; color: string; weight?: number }>,
  x: number,
  y: number,
  size: number,
  align: "left" | "center" | "right" = "center",
) {
  const widths = parts.map((p) => measure(g, p.s, size, p.weight ?? 400));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  parts.forEach((p, i) => {
    text(g, p.s, cx, y, size, p.color, { weight: p.weight ?? 400 });
    cx += widths[i]!;
  });
  return total;
}

/* --------------------------------------------------------------- shapes -- */

export function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.roundRect(x, y, w, h, rad);
}

export function circle(g: G, x: number, y: number, r: number) {
  g.beginPath();
  g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}

export function dashedArc(
  g: G,
  x: number,
  y: number,
  r: number,
  a0: number,
  a1: number,
  dash: number,
  gap: number,
  color: string,
  lw: number,
  phase = 0,
) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.setLineDash([dash, gap]);
  g.lineDashOffset = phase;
  g.beginPath();
  g.arc(x, y, Math.max(0, r), a0, a1);
  g.stroke();
  g.restore();
}

/* --------------------------------------------------------------- X mark -- */

let X_PATH_: Path2D | null = null;
const X_D = (
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
);
const xPath = () => (X_PATH_ ??= new Path2D(X_D));
/** Drawn centred on (cx, cy); `h` is the mark's height in px. */
export function drawX(g: G, cx: number, cy: number, h: number, color: string | CanvasGradient) {
  const s = h / 19.5;
  g.save();
  g.translate(cx - 12.04 * s, cy - 12 * s);
  g.scale(s, s);
  g.fillStyle = color;
  g.fill(xPath(), "evenodd");
  g.restore();
}
/**
 * The X mark built up in two strokes (heavy "\" first, then the light "/"
 * sweeping down from the top-right), with an optional diagonal fade-out:
 * `wipe` 0..1 clears it from the bottom-left corner toward the top-right.
 */
export function drawXAnimated(g: G, cx: number, cy: number, h: number, heavy: number, light: number, wipe: number) {
  const s = h / 19.5;
  g.save();
  g.translate(cx - 12.04 * s, cy - 12 * s);
  g.scale(s, s);
  let fill: string | CanvasGradient = "#000";
  if (wipe > 0) {
    const gr = g.createLinearGradient(0, 24, 24, 0);
    const e = -0.3 + 1.35 * wipe;
    const c = (v: number) => Math.min(1, Math.max(0, v));
    gr.addColorStop(c(e), "rgba(0,0,0,0)");
    gr.addColorStop(c(e + 0.3), "rgba(0,0,0,1)");
    fill = gr;
  }
  g.fillStyle = fill;
  // heavy diagonal band
  if (heavy > 0) {
    g.save();
    g.globalAlpha *= heavy;
    g.beginPath();
    g.moveTo(0, 1);
    g.lineTo(9.6, 1);
    g.lineTo(24, 23);
    g.lineTo(14.4, 23);
    g.closePath();
    g.clip();
    g.fill(xPath(), "evenodd");
    g.restore();
  }
  // light diagonal, revealed top-down
  if (light > 0) {
    g.save();
    g.beginPath();
    g.moveTo(0, 1);
    g.lineTo(9.6, 1);
    g.lineTo(24, 23);
    g.lineTo(14.4, 23);
    g.closePath();
    g.rect(-2, 1, 28, 1 + 21 * light);
    g.clip("evenodd");
    g.fill(xPath(), "evenodd");
    g.restore();
  }
  g.restore();
}

/** Width of the X mark for a given height. */
export const xWidth = (h: number) => (h / 19.5) * 21.57;

/* ---------------------------------------------------------------- icons -- */

type IconDef = Array<() => Path2D>;
const P = (d: string) => {
  let c: Path2D | null = null;
  return () => (c ??= new Path2D(d));
};

function circlePath(cx: number, cy: number, r: number) {
  let c: Path2D | null = null;
  return () => {
    if (!c) {
      c = new Path2D();
      c.arc(cx, cy, r, 0, Math.PI * 2);
    }
    return c;
  };
}
function rectPath(x: number, y: number, w: number, h: number, r: number) {
  let c: Path2D | null = null;
  return () => {
    if (!c) {
      c = new Path2D();
      c.roundRect(x, y, w, h, r);
    }
    return c;
  };
}

export const ICONS: Record<string, IconDef> = {
  bubble: [P("M7.9 20A9 9 0 1 0 4 16.1L2 22Z")],
  video: [P("m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"), rectPath(2, 6, 14, 12, 2)],
  phone: [
    P(
      "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
    ),
  ],
  user: [P("M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"), circlePath(12, 7, 4)],
  users: [
    P("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"),
    circlePath(9, 7, 4),
    P("M22 21v-2a4 4 0 0 0-3-3.87"),
    P("M16 3.13a4 4 0 0 1 0 7.75"),
  ],
  search: [circlePath(11, 11, 8), P("m21 21-4.3-4.3")],
  copy: [rectPath(8, 8, 14, 14, 2), P("M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2")],
  refresh: [P("M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"), P("M21 3v5h-5")],
  back: [P("m12 19-7-7 7-7"), P("M19 12H5")],
  lock: [rectPath(5, 11, 14, 10, 2), P("M8 11V7a4 4 0 0 1 8 0v4")],
  mic: [P("M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"), P("M19 10v2a7 7 0 0 1-14 0v-2"), P("M12 19v3")],
  plus: [P("M5 12h14"), P("M12 5v14")],
  home: [
    P("M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"),
    P("M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"),
  ],
  bell: [
    P("M10.268 21a2 2 0 0 0 3.464 0"),
    P(
      "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
    ),
  ],
  check: [P("M20 6 9 17l-5-5")],
  chevronDown: [P("m6 9 6 6 6-6")],
  chevronLeft: [P("m15 18-6-6 6-6")],
  markRead: [P("M3 5h7"), P("M3 9.5h5"), P("M3 14h3"), P("m9 14 4 5 8-12")],
  bubbleIn: [P("M13 20.8A9 9 0 1 1 20.8 11"), P("M7.9 20 4 16.1 2 22Z"), P("M22 17h-6"), P("m19 14-3 3 3 3")],
  grok: [P("M7 17 17 7"), circlePath(12, 12, 7.5)],
  keypadBox: [rectPath(3, 3, 18, 18, 5), P("M8.5 12h.01"), P("M12 12h.01"), P("M15.5 9v6")],
};

export function icon(g: G, name: string, cx: number, cy: number, size: number, color: string, lw = 2) {
  const def = ICONS[name];
  if (!def) return;
  const s = size / 24;
  g.save();
  g.translate(cx - 12 * s, cy - 12 * s);
  g.scale(s, s);
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const p of def) g.stroke(p());
  g.restore();
}

/** The "unread" bubble: a bubble outline with a filled dot at bottom-right. */
export function iconUnread(g: G, cx: number, cy: number, size: number, color: string, lw = 2) {
  const s = size / 24;
  g.save();
  g.translate(cx - 12 * s, cy - 12 * s);
  g.scale(s, s);
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.arc(12, 11, 9, Math.PI * 0.62, Math.PI * 2.12);
  g.stroke();
  g.stroke(new Path2D("M7.2 18.6 3 21l1.2-4.4"));
  g.fillStyle = color;
  g.beginPath();
  g.arc(19, 18.5, 3.6, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** X-style gear: eight rounded teeth around a ring. */
export function iconGear(g: G, cx: number, cy: number, size: number, color: string, lw = 2) {
  const s = size / 24;
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineJoin = "round";
  g.beginPath();
  const teeth = 8;
  for (let i = 0; i <= teeth * 8; i++) {
    const a = (i / (teeth * 8)) * Math.PI * 2;
    const k = Math.cos(a * teeth);
    const r = 8.6 + (k > 0.2 ? 1.9 : k < -0.2 ? -0.3 : 0.8 + k * 2);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 3.4, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

/** 3×3 + 1 dial-pad dots (the "Number" icon). */
export function iconDialpad(g: G, cx: number, cy: number, size: number, color: string) {
  const s = size / 24;
  g.save();
  g.fillStyle = color;
  const step = 5.6 * s;
  const r = 1.65 * s;
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      circle(g, cx + (col - 1) * step, cy + (row - 1.5) * step, r);
      g.fill();
    }
  circle(g, cx, cy + 1.5 * step, r);
  g.fill();
  g.restore();
}

/** X's blue verified badge. */
export function verified(g: G, cx: number, cy: number, size: number, color = "#1d9bf0") {
  const r = size / 2;
  g.save();
  g.fillStyle = color;
  g.beginPath();
  const n = 8;
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const rr2 = r * (0.9 + 0.1 * Math.cos(a * n));
    const x = cx + Math.cos(a) * rr2;
    const y = cy + Math.sin(a) * rr2;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.fill();
  g.strokeStyle = "#fff";
  g.lineWidth = size * 0.12;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(cx - r * 0.38, cy + r * 0.02);
  g.lineTo(cx - r * 0.1, cy + r * 0.3);
  g.lineTo(cx + r * 0.4, cy - r * 0.3);
  g.stroke();
  g.restore();
}

/** Status-bar glyphs: cellular bars, wifi, battery. `dark` = white glyphs. */
export function statusBar(g: G, dark: boolean) {
  const c = dark ? "#fff" : "#000";
  text(g, "9:41", 68, 32, 17.5, c, { weight: 600, align: "center" });
  g.fillStyle = c;
  if (!dark) {
    for (let i = 0; i < 4; i++) {
      const h = 4.5 + i * 2.6;
      rr(g, 286 + i * 5, 37.5 - h, 3.2, h, 1);
      g.fill();
    }
  } else {
    for (let i = 0; i < 4; i++) {
      circle(g, 290 + i * 4.6, 36, 1.3);
      g.fill();
    }
  }
  // wifi
  g.save();
  g.translate(320.5, 38);
  g.strokeStyle = c;
  g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const r = 3.4 + i * 3.9;
    g.lineWidth = 2.3;
    g.beginPath();
    g.arc(0, 0, r, -Math.PI * 0.75, -Math.PI * 0.25);
    g.stroke();
  }
  circle(g, 0, -0.6, 1.3);
  g.fill();
  g.restore();
  // battery
  g.strokeStyle = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
  g.lineWidth = 1;
  rr(g, 335, 26.5, 26, 12.5, 4);
  g.stroke();
  rr(g, 337, 28.5, 22, 8.5, 2.5);
  g.fill();
  rr(g, 362.2, 30.5, 1.6, 4.5, 1);
  g.fill();
}

/** Toggle switch; `on` 0..1, `press` 0..1 stretches the knob. */
export function toggle(g: G, x: number, y: number, w: number, h: number, on: number, press = 0) {
  const off = [233, 233, 234];
  const onC = [52, 199, 89];
  const col = off.map((v, i) => Math.round(v + (onC[i]! - v) * on));
  g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
  rr(g, x, y, w, h, h / 2);
  g.fill();
  const pad = 2;
  const kh = h - pad * 2;
  const kw = kh * (1 + 0.45 * press) + (w - kh) * 0.35 * press;
  const kx = x + pad + (w - pad * 2 - kw) * on;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.18)";
  g.shadowBlur = 4;
  g.shadowOffsetY = 1.5;
  g.fillStyle = "#fff";
  rr(g, kx, y + pad, kw, kh, kh / 2);
  g.fill();
  g.restore();
}
