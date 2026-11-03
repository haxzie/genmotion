/** 2D drawing helpers for the GenMotion app UI rebuilt on canvas. */
import { FONT, LOGO_PATH, MONO, UI } from "./brand";
import type { G } from "./screen";

export function rr(g: G, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function box(g: G, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, lw = 2): void {
  rr(g, x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = lw;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

export interface TextOpts {
  size: number;
  weight?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  tracking?: number;
  mono?: boolean;
}

export function text(g: G, s: string, x: number, y: number, o: TextOpts): number {
  g.font = `${o.weight ?? 400} ${o.size}px ${o.mono ? MONO : FONT}`;
  g.fillStyle = o.color ?? UI.text;
  g.textAlign = o.align ?? "left";
  g.textBaseline = o.baseline ?? "middle";
  (g as unknown as { letterSpacing: string }).letterSpacing = `${(o.tracking ?? 0) * o.size}px`;
  g.fillText(s, x, y);
  const w = g.measureText(s).width;
  (g as unknown as { letterSpacing: string }).letterSpacing = "0px";
  return w;
}

export function measure(g: G, s: string, size: number, weight = 400): number {
  g.font = `${weight} ${size}px ${FONT}`;
  return g.measureText(s).width;
}

/** The real GenMotion mark, drawn from its SVG path with its gradient. */
export function logo(g: G, x: number, y: number, size: number): void {
  g.save();
  g.translate(x, y);
  g.scale(size / 512, size / 512);
  const grad = g.createLinearGradient(61, 88.5, 428.5, 430);
  grad.addColorStop(0, UI.accent);
  grad.addColorStop(1, UI.accent2);
  g.fillStyle = grad;
  g.fill(new Path2D(LOGO_PATH));
  g.restore();
}

/** A simple outline icon: folder. */
export function folderIcon(g: G, x: number, y: number, s: number, color: string): void {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = s * 0.09;
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(x, y + s * 0.15);
  g.lineTo(x + s * 0.38, y + s * 0.15);
  g.lineTo(x + s * 0.48, y + s * 0.28);
  g.lineTo(x + s, y + s * 0.28);
  g.lineTo(x + s, y + s * 0.9);
  g.lineTo(x, y + s * 0.9);
  g.closePath();
  g.stroke();
  g.restore();
}

export function plusIcon(g: G, cx: number, cy: number, s: number, color: string, lw = 3): void {
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx - s / 2, cy);
  g.lineTo(cx + s / 2, cy);
  g.moveTo(cx, cy - s / 2);
  g.lineTo(cx, cy + s / 2);
  g.stroke();
}

/** Small chevron down. */
export function chevron(g: G, cx: number, cy: number, s: number, color: string): void {
  g.strokeStyle = color;
  g.lineWidth = s * 0.22;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx - s / 2, cy - s / 4);
  g.lineTo(cx, cy + s / 4);
  g.lineTo(cx + s / 2, cy - s / 4);
  g.stroke();
}

/** Deterministic PRNG for any scattered detail, seeded in the builder. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
