import * as THREE from "three";
import { FONT_EN } from "./brand";

export type LabelOpts = {
  size: number; // px on screen (1 world unit = 1 px in our ortho stage)
  weight?: number;
  color?: string;
  font?: string;
  tracking?: number; // em, e.g. -0.02
  /** supersampling so punch-zooms stay crisp */
  ss?: number;
  /** draw a solid pill behind the text */
  bg?: string;
  padX?: number;
  padY?: number;
  radius?: number;
  align?: "center" | "left";
};

export type Label = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> & { w: number; h: number };

const measureCtx = () => new OffscreenCanvas(8, 8).getContext("2d")!;

/** One line of type drawn ONCE to a canvas and shown on a plane sized in px. */
export function label(text: string, o: LabelOpts): Label {
  const ss = o.ss ?? 2;
  const weight = o.weight ?? 500;
  const font = `${weight} ${o.size * ss}px ${o.font ?? FONT_EN}`;
  const m = measureCtx();
  m.font = font;
  const tracking = (o.tracking ?? 0) * o.size * ss;
  (m as unknown as { letterSpacing: string }).letterSpacing = `${tracking}px`;
  const tw = Math.ceil(m.measureText(text).width);
  const padX = (o.padX ?? (o.bg ? o.size * 0.6 : o.size * 0.25)) * ss;
  const padY = (o.padY ?? (o.bg ? o.size * 0.3 : o.size * 0.2)) * ss;
  const w = tw + padX * 2;
  const h = Math.ceil(o.size * ss * 1.3) + padY * 2;
  const canvas = new OffscreenCanvas(w, h);
  const g = canvas.getContext("2d")!;
  if (o.bg) {
    const r = (o.radius ?? o.size * 0.35) * ss;
    g.fillStyle = o.bg;
    g.beginPath();
    g.roundRect(0, 0, w, h, r);
    g.fill();
  }
  g.font = font;
  (g as unknown as { letterSpacing: string }).letterSpacing = `${tracking}px`;
  g.fillStyle = o.color ?? "#ffffff";
  g.textBaseline = "middle";
  if (o.align === "left") {
    g.textAlign = "left";
    g.fillText(text, padX, h / 2 + o.size * ss * 0.04);
  } else {
    g.textAlign = "center";
    g.fillText(text, w / 2 + tracking / 2, h / 2 + o.size * ss * 0.04);
  }
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w / ss, h / ss),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }),
  ) as unknown as Label;
  mesh.w = w / ss;
  mesh.h = h / ss;
  if (o.align === "left") mesh.geometry.translate(w / ss / 2, 0, 0);
  return mesh;
}

/** Text width in px for layout (no mesh). */
export function measure(text: string, size: number, weight = 500, font = FONT_EN, tracking = 0): number {
  const m = measureCtx();
  m.font = `${weight} ${size}px ${font}`;
  (m as unknown as { letterSpacing: string }).letterSpacing = `${tracking * size}px`;
  return m.measureText(text).width;
}

/** A vertical gradient texture (for scrims, sky glows). */
export function gradientTexture(stops: [number, string][], vertical = true): THREE.CanvasTexture {
  const c = new OffscreenCanvas(vertical ? 4 : 256, vertical ? 256 : 4);
  const g = c.getContext("2d")!;
  const grad = vertical ? g.createLinearGradient(0, 0, 0, 256) : g.createLinearGradient(0, 0, 256, 0);
  for (const [p, col] of stops) grad.addColorStop(p, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
