/**
 * A technical-drawing kit: thin strokes that draw themselves on, dashed
 * construction lines, and mono type in boxed labels. World units are
 * composition pixels (the scene uses an orthographic camera 1080 units tall).
 */
import * as THREE from "three";

export const PALETTE = {
  bg: "#fafaf8",
  ink: "#1f2b2b",
  muted: "#55605e", // ~6.3:1 on bg
  dash: "#a3a9a8", // lines only, never text
  lime: "#c6f91e",
  teal: "#16f5bd",
  white: "#ffffff",
};

export const MONO = '"JetBrains Mono", "IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace';

export type Seg = [number, number, number, number];
export type Pt = [number, number];

// ---------------------------------------------------------------- geometry

/** A straight line cut into short pieces, so a draw-on reveal is smooth. */
export function line(x1: number, y1: number, x2: number, y2: number, step = 10): Seg[] {
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step));
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const a = i / n;
    const b = (i + 1) / n;
    out.push([x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b]);
  }
  return out;
}

export function poly(pts: Pt[]): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]);
  return out;
}

/** Points on an arc from angle a0 to a1 (radians). */
export function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 160): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** A full circle drawn clockwise from `start`. */
export function circle(cx: number, cy: number, r: number, start = Math.PI / 2, n = 180): Seg[] {
  return poly(arcPts(cx, cy, r, start, start - Math.PI * 2, n));
}

export function rect(cx: number, cy: number, w: number, h: number, step = 12): Seg[] {
  const l = cx - w / 2, r = cx + w / 2, b = cy - h / 2, t = cy + h / 2;
  return [...line(l, t, r, t, step), ...line(r, t, r, b, step), ...line(r, b, l, b, step), ...line(l, b, l, t, step)];
}

export function dashed(x1: number, y1: number, x2: number, y2: number, dash = 9, gap = 7): Seg[] {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const out: Seg[] = [];
  for (let d = 0; d < len; d += dash + gap) {
    const e = Math.min(len, d + dash);
    out.push([x1 + ux * d, y1 + uy * d, x1 + ux * e, y1 + uy * e]);
  }
  return out;
}

/** A line with an open arrowhead; the head is drawn last. */
export function arrow(x1: number, y1: number, x2: number, y2: number, head = 20): Seg[] {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h1: Seg = [x2, y2, x2 - Math.cos(a - 0.38) * head, y2 - Math.sin(a - 0.38) * head];
  const h2: Seg = [x2, y2, x2 - Math.cos(a + 0.38) * head, y2 - Math.sin(a + 0.38) * head];
  return [...line(x1, y1, x2, y2, 12), h1, h2];
}

// ---------------------------------------------------------------- materials

export function basic(colour: string, extra: THREE.MeshBasicMaterialParameters = {}): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: colour,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    ...extra,
  });
}

// ---------------------------------------------------------------- strokes

/** Segments as thin quads, revealed in order with `set(progress)`. */
export class Strokes {
  readonly mesh: THREE.Mesh;
  private readonly count: number;

  constructor(name: string, segs: Seg[], width: number, material: THREE.Material, order = 1) {
    this.count = segs.length;
    const pos = new Float32Array(segs.length * 18);
    const hw = width / 2;
    segs.forEach(([x1, y1, x2, y2], i) => {
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      // Extend each piece by half a width so joints between pieces close up.
      const ux = ((x2 - x1) / len) * hw * 0.5, uy = ((y2 - y1) / len) * hw * 0.5;
      const ax = x1 - ux, ay = y1 - uy, bx = x2 + ux, by = y2 + uy;
      const nx = (-(y2 - y1) / len) * hw, ny = ((x2 - x1) / len) * hw;
      const v = [
        ax + nx, ay + ny, ax - nx, ay - ny, bx + nx, by + ny,
        bx + nx, by + ny, ax - nx, ay - ny, bx - nx, by - ny,
      ];
      for (let k = 0; k < 6; k++) {
        pos[i * 18 + k * 3] = v[k * 2];
        pos[i * 18 + k * 3 + 1] = v[k * 2 + 1];
        pos[i * 18 + k * 3 + 2] = 0;
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = name;
    this.mesh.renderOrder = order;
  }

  set(p: number): void {
    const n = Math.round(THREE.MathUtils.clamp(p, 0, 1) * this.count);
    this.mesh.geometry.setDrawRange(0, n * 6);
    this.mesh.visible = n > 0;
  }
}

// ---------------------------------------------------------------- type

export interface LabelOptions {
  size: number;
  colour?: string;
  weight?: number;
  /** Extra space between characters, in px. */
  tracking?: number;
  /** Draw the reference's thin rectangle around the text. */
  box?: boolean;
  /** Paint the box's inside so lines passing behind are hidden. */
  fill?: string;
  align?: "center" | "left";
}

const SS = 2; // canvas supersampling

/** One line of mono type, drawn once, revealed with a left-to-right wipe. */
export class Label {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshBasicMaterial;
  readonly width: number;
  readonly height: number;
  private readonly texture: THREE.CanvasTexture;

  constructor(name: string, text: string, o: LabelOptions) {
    const size = o.size;
    const colour = o.colour ?? PALETTE.ink;
    const tracking = o.tracking ?? 0;
    const font = `${o.weight ?? 400} ${size * SS}px ${MONO}`;
    const measure = new OffscreenCanvas(8, 8).getContext("2d")!;
    measure.font = font;
    (measure as unknown as { letterSpacing: string }).letterSpacing = `${tracking * SS}px`;
    const textW = measure.measureText(text).width / SS;

    const padX = o.box ? size * 0.3 : size * 0.12;
    const padY = o.box ? size * 0.14 : size * 0.1;
    this.width = Math.ceil(textW + padX * 2);
    this.height = Math.ceil(size * 1.2 + padY * 2);

    const canvas = new OffscreenCanvas(this.width * SS, this.height * SS);
    const g = canvas.getContext("2d")!;
    if (o.fill) {
      g.fillStyle = o.fill;
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (o.box) {
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 2 * SS;
      g.strokeRect(SS, SS, canvas.width - 2 * SS, canvas.height - 2 * SS);
    }
    g.font = font;
    (g as unknown as { letterSpacing: string }).letterSpacing = `${tracking * SS}px`;
    g.fillStyle = colour;
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    // Optically centre caps and x-height on the box.
    g.fillText(text, padX * SS, (this.height / 2 + size * 0.34) * SS);

    this.texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;

    const geometry = new THREE.PlaneGeometry(this.width, this.height);
    geometry.translate(this.width / 2, 0, 0); // left-anchored, so a wipe grows rightwards
    this.material = basic("#ffffff", { map: this.texture });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = `${name}-type`;
    this.mesh.renderOrder = 6;
    this.mesh.position.x = o.align === "left" ? 0 : -this.width / 2;
    this.group.name = name;
    this.group.add(this.mesh);
  }

  at(x: number, y: number): this {
    this.group.position.set(x, y, 0);
    return this;
  }

  order(n: number): this {
    this.mesh.renderOrder = n;
    return this;
  }

  /** `p` 0→1 wipes the label in from the left; `opacity` fades it. */
  set(p: number, opacity = 1): void {
    const w = THREE.MathUtils.clamp(p, 0, 1);
    this.mesh.scale.x = Math.max(w, 0.0001);
    this.texture.repeat.x = Math.max(w, 0.0001);
    this.material.opacity = opacity;
    this.mesh.visible = w > 0.001 && opacity > 0.001;
  }
}
