import * as THREE from "three";
import { RES } from "./stage";

/** A canvas texture drawn once at RES x. `draw` gets a context scaled to composition px. */
export function canvasTexture(w: number, h: number, draw: (g: OffscreenCanvasRenderingContext2D) => void) {
  const canvas = new OffscreenCanvas(Math.ceil(w * RES), Math.ceil(h * RES));
  const g = canvas.getContext("2d")!;
  g.scale(RES, RES);
  draw(g);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A flat textured plane (unlit, transparent, never tone mapped, always drawn in painter's order). */
export function texPlane(w: number, h: number, tex: THREE.Texture, name: string, color: THREE.ColorRepresentation = "#ffffff") {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }),
  );
  m.name = name;
  return m;
}

export function rrPath(g: OffscreenCanvasRenderingContext2D | Path2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * A rounded rectangle as a plane (w x h px), drawn white so `material.color` tints it.
 * Optional border (px, colour drawn into the texture).
 */
export function roundRect(
  w: number,
  h: number,
  r: number,
  name: string,
  o: { fill?: string; stroke?: string; strokeW?: number; color?: THREE.ColorRepresentation; pad?: number } = {},
) {
  const pad = o.pad ?? 2;
  const tex = canvasTexture(w + pad * 2, h + pad * 2, (g) => {
    g.beginPath();
    rrPath(g, pad, pad, w, h, r);
    if (o.fill !== "none") {
      g.fillStyle = o.fill ?? "#ffffff";
      g.fill();
    }
    if (o.stroke) {
      g.lineWidth = o.strokeW ?? 1;
      g.strokeStyle = o.stroke;
      g.beginPath();
      const s = (o.strokeW ?? 1) / 2;
      rrPath(g, pad + s, pad + s, w - s * 2, h - s * 2, Math.max(0, r - s));
      g.stroke();
    }
  });
  return texPlane(w + pad * 2, h + pad * 2, tex, name, o.color ?? "#ffffff");
}

/** Stroke icons on a 24-unit grid (Lucide-style, 2-unit round strokes). */
export const ICONS: Record<string, { paths: string[]; fill?: string[] }> = {
  money: {
    paths: [
      "M3 6.6c3-1.6 6-1.6 9 0s6 1.6 9 0v10.8c-3 1.6-6 1.6-9 0s-6-1.6-9 0z",
      "M7.2 10.2v3.6",
      "M16.8 10.2v3.6",
      "M14 12a2 2 0 1 1-4 0a2 2 0 1 1 4 0z",
    ],
  },
  zap: {
    paths: [
      "M7.33 0.67H15.1L11.8 7.3H21.8L6.8 23.4L11.2 12.3H2.3Z",
    ],
  },
  // lucide "sparkles" and "shield-check" (ISC)
  sparkles: {
    paths: [
      "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
      "M20 3v4",
      "M22 5h-4",
      "M4 17v2",
      "M5 18H3",
    ],
  },
  shield: {
    paths: [
      "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      "m9 12 2 2 4-4",
    ],
  },
  rocket: {
    paths: [
      "M12.6 15.6 8.4 11.4C9.8 6.6 13.8 3.4 20.6 3.4c0 6.8-3.2 10.8-8 12.2z",
      "M8.4 11.4 5.2 11.1l1.9-3h3.3",
      "M12.6 15.6l.3 3.2 3-1.9v-3.3",
      "M7.3 15.7c-1.9.5-3 2.4-3 4.3 1.9 0 3.8-1.1 4.3-3z",
    ],
  },
};

export function drawIcon(g: OffscreenCanvasRenderingContext2D, name: string, x: number, y: number, size: number, color: string, width = 2) {
  const icon = ICONS[name]!;
  g.save();
  g.translate(x, y);
  g.scale(size / 24, size / 24);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const d of icon.paths) g.stroke(new Path2D(d));
  g.restore();
}

/** The Fireworks mark (from the official logo SVG, viewBox 0 0 87.55 43.25). */
export const MARK_PATH =
  "M53.9877 0L43.7701 24.485L33.5428 0H26.9819L38.1916 26.7662C39.1213 28.9995 41.3019 30.4421 43.7317 30.4421C46.1615 30.4421 48.3373 28.9995 49.2719 26.7758L60.5487 0H53.9877ZM58.3537 37.305L77.0445 18.4081L74.4949 12.3935L54.0788 33.0732C52.3726 34.8033 51.8838 37.3529 52.8279 39.5862C53.7673 41.8003 55.9383 43.2333 58.3585 43.2333L58.3681 43.2429L87.5497 43.171L85.0001 37.1564L58.3585 37.305H58.3537ZM10.5052 18.3937L13.0548 12.3791L33.4709 33.0588C35.1771 34.7841 35.6707 37.3433 34.7218 39.5718C33.7825 41.7908 31.6019 43.2189 29.1912 43.2189L0.00958503 43.1518L0 43.1614L2.54962 37.1468L29.1912 37.2954L10.5052 18.3937Z";
export const MARK_W = 87.55;
export const MARK_H = 43.25;

/** The mark as a plane `w` px wide, drawn white so material.color tints it. */
export function mark(w: number, name = "fireworks-mark") {
  const h = (w * MARK_H) / MARK_W;
  const pad = 2;
  const tex = canvasTexture(w + pad * 2, h + pad * 2, (g) => {
    g.translate(pad, pad);
    g.scale(w / MARK_W, h / MARK_H);
    g.fillStyle = "#ffffff";
    g.fill(new Path2D(MARK_PATH), "evenodd");
  });
  return texPlane(w + pad * 2, h + pad * 2, tex, name);
}

/** Set opacity on every material under an object. */
export function setOpacity(o: THREE.Object3D, a: number) {
  o.visible = a > 0.001;
  o.traverse((c) => {
    const m = (c as THREE.Mesh).material as THREE.Material | undefined;
    if (!m) return;
    const sm = m as THREE.ShaderMaterial;
    if (sm.uniforms && sm.uniforms.uOpacity) sm.uniforms.uOpacity.value = a * ((c.userData.baseOpacity as number | undefined) ?? 1);
    else m.opacity = a * ((c.userData.baseOpacity as number | undefined) ?? 1);
  });
}
