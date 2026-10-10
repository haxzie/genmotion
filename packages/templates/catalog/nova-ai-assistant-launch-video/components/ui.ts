import * as THREE from "three";
import { FONT_FAMILY } from "./brand";

/**
 * Canvas-drawn UI pieces, drawn once at 2x and shown on planes in layer px.
 * Everything here is our own design (the Nova product), not a copy of any app.
 */

export type Draw = (g: OffscreenCanvasRenderingContext2D, w: number, h: number) => void;

export type Panel = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

/** A plane of `w` x `h` layer px whose texture is drawn by `draw` (in px, origin top-left). */
export function canvasPlane(w: number, h: number, draw: Draw, dpr = 2): Panel {
  const canvas = new OffscreenCanvas(Math.ceil(w * dpr), Math.ceil(h * dpr));
  const g = canvas.getContext("2d")!;
  g.scale(dpr, dpr);
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat) as Panel;
  m.renderOrder = 60;
  return m;
}

export const font = (size: number, weight = 450) => `${weight} ${size}px "${FONT_FAMILY}", Inter, Arial, sans-serif`;

export function rr(g: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function text(g: OffscreenCanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 450, align: CanvasTextAlign = "left") {
  g.font = font(size, weight);
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
}

/** Grey bars standing in for small print that is not meant to be read. */
export function bars(g: OffscreenCanvasRenderingContext2D, x: number, y: number, widths: number[], h = 8, gap = 14, color = "#dfe3ea") {
  g.fillStyle = color;
  widths.forEach((w, i) => {
    rr(g, x, y + i * (h + gap), w, h, h / 2);
    g.fill();
  });
}

/* ---------------------------------------------------------------- the Nova mark */

/**
 * Nova's mark: a gradient disc with an offset bright core and a small orbiting
 * dot — an original placeholder mark, swap it in brand.ts when the real one exists.
 */
export function drawMark(g: OffscreenCanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const grad = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, "#3c7be8");
  grad.addColorStop(0.55, "#7b61ff");
  grad.addColorStop(1, "#19c6a7");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(cx + r * 0.22, cy - r * 0.18, r * 0.42, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#19c6a7";
  g.beginPath();
  g.arc(cx - r * 0.5, cy + r * 0.52, r * 0.13, 0, Math.PI * 2);
  g.fill();
}

export function markPlane(size: number): Panel {
  return canvasPlane(size, size, (g, w) => drawMark(g, w / 2, w / 2, w * 0.46));
}

/* ---------------------------------------------------------------- app tiles */

const TILE_COLORS = ["#3c7be8", "#19c6a7", "#ff7a59", "#f7b500", "#7b61ff", "#e8445a", "#2bb24c", "#0aa5d8", "#ff5fa2", "#5b6cff", "#ff9f1c", "#14b8a6"];

/** A generic app tile: white rounded square with a simple coloured glyph (no real logos). */
export function tile(i: number, size = 84): Panel {
  const c = TILE_COLORS[i % TILE_COLORS.length]!;
  const c2 = TILE_COLORS[(i + 5) % TILE_COLORS.length]!;
  return canvasPlane(size + 24, size + 24, (g) => {
    const o = 12;
    g.shadowColor = "rgba(20,40,120,0.22)";
    g.shadowBlur = 10;
    g.shadowOffsetY = 3;
    g.fillStyle = "#ffffff";
    rr(g, o, o, size, size, size * 0.26);
    g.fill();
    g.shadowColor = "transparent";
    const m = o + size / 2;
    const s = size * 0.28;
    g.fillStyle = c;
    switch (i % 6) {
      case 0: g.beginPath(); g.arc(m, m, s, 0, Math.PI * 2); g.fill(); g.fillStyle = c2; g.beginPath(); g.arc(m + s * 0.5, m - s * 0.5, s * 0.45, 0, Math.PI * 2); g.fill(); break;
      case 1: g.beginPath(); g.moveTo(m, m - s); g.lineTo(m + s, m + s * 0.8); g.lineTo(m - s, m + s * 0.8); g.closePath(); g.fill(); break;
      case 2: [0, 1, 2].forEach((k) => { g.fillStyle = k === 1 ? c2 : c; rr(g, m - s + k * s * 0.72, m - s * (0.3 + k * 0.35), s * 0.5, s * (1.3 + k * 0.35), 4); g.fill(); }); break;
      case 3: rr(g, m - s, m - s, s * 2, s * 2, 6); g.fill(); g.fillStyle = "#fff"; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { g.fillRect(m - s * 0.75 + a * s * 0.55, m - s * 0.45 + b * s * 0.45, s * 0.3, s * 0.25); } break;
      case 4: rr(g, m - s, m - s * 0.8, s * 2, s * 1.4, s * 0.5); g.fill(); g.beginPath(); g.moveTo(m - s * 0.4, m + s * 0.5); g.lineTo(m - s * 0.8, m + s); g.lineTo(m, m + s * 0.55); g.fill(); break;
      default: g.beginPath(); g.arc(m - s * 0.35, m + s * 0.15, s * 0.6, 0, Math.PI * 2); g.arc(m + s * 0.3, m - s * 0.1, s * 0.75, 0, Math.PI * 2); g.arc(m + s * 0.8, m + s * 0.3, s * 0.45, 0, Math.PI * 2); g.fill(); g.fillRect(m - s * 0.9, m + s * 0.2, s * 2.1, s * 0.55); break;
    }
  });
}

/* ---------------------------------------------------------------- cursor */

/** A pointer cursor (classic arrow), tip at the plane's top-left + (6,6). */
export function cursor(size = 64): Panel {
  const p = canvasPlane(size, size, (g) => {
    const k = size / 24;
    g.translate(6, 6);
    g.scale(k * 0.85, k * 0.85);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, 17);
    g.lineTo(4.2, 13.2);
    g.lineTo(7.2, 19.8);
    g.lineTo(10, 18.6);
    g.lineTo(7.1, 12.2);
    g.lineTo(12.6, 12.2);
    g.closePath();
    g.fillStyle = "#111318";
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1.4;
    g.lineJoin = "round";
    g.shadowColor = "rgba(0,0,0,0.25)";
    g.shadowBlur = 4;
    g.shadowOffsetY = 1.5;
    g.fill();
    g.shadowColor = "transparent";
    g.stroke();
  });
  // pivot at the tip
  p.geometry.translate(size / 2 - 6, -size / 2 + 6, 0);
  p.renderOrder = 200;
  p.name = "cursor";
  return p;
}
