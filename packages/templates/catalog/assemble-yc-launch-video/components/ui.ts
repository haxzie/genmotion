import * as THREE from "three";
import { PX, RES } from "./stage";
import { FONT } from "./type";

/** Small helpers for the product-UI scenes: crisp canvas panels at base layout px. */

export function panel(wPx: number, hPx: number, draw: (g: OffscreenCanvasRenderingContext2D) => void, res = RES * 1.5, name = "panel") {
  const c = new OffscreenCanvas(Math.ceil(wPx * res), Math.ceil(hPx * res));
  const g = c.getContext("2d")!;
  g.scale(res, res);
  draw(g);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(wPx * PX, hPx * PX),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }),
  );
  m.name = name;
  return m;
}

export function rrect(g: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 2) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.stroke();
  }
}

export function text(g: OffscreenCanvasRenderingContext2D, s: string, x: number, y: number, size: number, colour: string, weight = 400, font = FONT, align: CanvasTextAlign = "left") {
  g.font = `${weight} ${size}px ${font}`;
  g.fillStyle = colour;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
}

export function chevron(g: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, colour: string) {
  g.strokeStyle = colour;
  g.lineWidth = s * 0.22;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(x - s * 0.5, y - s * 0.22);
  g.lineTo(x, y + s * 0.25);
  g.lineTo(x + s * 0.5, y - s * 0.22);
  g.stroke();
}

/** The macOS-style arrow pointer, tip at (0,0), drawn in px. */
export function cursorPanel(sizePx = 46, name = "cursor") {
  return panel(sizePx, sizePx * 1.5, (g) => {
    const k = sizePx / 24;
    g.scale(k, k);
    g.translate(2, 2);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, 24);
    g.lineTo(6.2, 18.6);
    g.lineTo(10.4, 28.4);
    g.lineTo(14.2, 26.8);
    g.lineTo(10.1, 17.3);
    g.lineTo(18.2, 17.3);
    g.closePath();
    g.fillStyle = "#111111";
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1.8;
    g.lineJoin = "round";
    g.stroke();
    g.fill();
  }, RES * 2, name);
}
