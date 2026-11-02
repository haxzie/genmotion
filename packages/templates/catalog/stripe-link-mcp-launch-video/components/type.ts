import * as THREE from "three";
import { SANS, MONO } from "./brand";
import { canvasPlane } from "./stage";

export interface TextOpts {
  size: number;
  weight?: number;
  color?: string;
  mono?: boolean;
  anchor?: "center" | "left";
  tracking?: string; // CSS letterSpacing, e.g. "-0.02em"
}

let _m: OffscreenCanvasRenderingContext2D | null = null;
const getMeasurer = () => (_m ??= new OffscreenCanvas(8, 8).getContext("2d")!);

export function fontOf(o: TextOpts) {
  return `${o.weight ?? 400} ${o.size}px ${o.mono ? MONO : SANS}`;
}

export function measure(text: string, o: TextOpts) {
  const measurer = getMeasurer();
  measurer.font = fontOf(o);
  (measurer as unknown as { letterSpacing: string }).letterSpacing = o.tracking ?? "0px";
  return measurer.measureText(text).width;
}

/**
 * One line of type as a plane. Horizontal padding is 0 so a left-anchored
 * plane's origin is exactly where the first glyph starts.
 */
export function textPlane(name: string, text: string, o: TextOpts): THREE.Mesh {
  const w = Math.ceil(measure(text, o)) + 4;
  const h = Math.ceil(o.size * 1.5);
  const anchor = o.anchor ?? "center";
  const mesh = canvasPlane(name, w, h, (g) => {
    g.font = fontOf(o);
    (g as unknown as { letterSpacing: string }).letterSpacing = o.tracking ?? "0px";
    g.fillStyle = o.color ?? "#ffffff";
    g.textBaseline = "middle";
    g.textAlign = "left";
    g.fillText(text, 2, h / 2);
  }, anchor);
  mesh.userData.hPx = h;
  return mesh;
}

/** A line made of differently coloured runs (monospace terminal copy). */
export type Run = [string, string];
export function richLine(name: string, runs: Run[], o: TextOpts & { bullet?: boolean }): THREE.Mesh {
  const BUL = o.bullet ? Math.round(o.size * 1.0) : 0;
  const textW = runs.reduce((s, [t]) => s + measure(t, o), 0);
  const w = Math.ceil(BUL + textW) + 6;
  const h = Math.ceil(o.size * 1.4);
  const mesh = canvasPlane(name, w, h, (g) => {
    if (o.bullet) {
      const s = o.size * 0.72;
      const y0 = (h - s) / 2;
      g.fillStyle = "#c9d6de";
      g.beginPath();
      g.roundRect(0, y0, s, s, s * 0.22);
      g.fill();
      g.fillStyle = "#7f97a6";
      g.beginPath();
      g.arc(s / 2, y0 + s / 2, s * 0.2, 0, Math.PI * 2);
      g.fill();
    }
    g.font = fontOf(o);
    g.textBaseline = "middle";
    let x = BUL;
    for (const [t, col] of runs) {
      g.fillStyle = col;
      g.fillText(t, x, h / 2);
      x += measure(t, o);
    }
  }, "left");
  return mesh;
}
