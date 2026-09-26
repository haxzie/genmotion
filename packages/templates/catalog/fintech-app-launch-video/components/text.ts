import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import { FONT } from "./brand";

/**
 * Every scene frames its camera at z = CAM_Z with the host's 50° lens, so at
 * z = 0 one world unit is exactly PX composition pixels (at 1080p). Sizes
 * handed to the helpers below are therefore true on-screen pixels.
 */
export const CAM_Z = 10;
export const PX = 1080 / (2 * Math.tan(THREE.MathUtils.degToRad(25)) * CAM_Z);
/** Canvas oversampling, so type is still crisp when captured at 2× DPR. */
const RES = 2;

/** Pixels (at 1080p, z = 0) to world units. */
export const u = (px: number) => px / PX;

type Ctx2D = OffscreenCanvasRenderingContext2D;

export function canvasTexture(w: number, h: number, draw: (g: Ctx2D) => void): THREE.CanvasTexture {
  const canvas = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
  const g = canvas.getContext("2d")!;
  draw(g);
  const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export interface TypeStyle {
  size: number;
  weight?: number;
  color?: string;
  /** Tracking in em, e.g. -0.02. */
  tracking?: number;
}

const fontOf = (s: TypeStyle, scale = RES) => `${s.weight ?? 500} ${s.size * scale}px ${FONT}`;

function setTracking(g: Ctx2D, s: TypeStyle, scale = RES) {
  (g as unknown as { letterSpacing: string }).letterSpacing = `${(s.tracking ?? 0) * s.size * scale}px`;
}

const measureCtx = () => new OffscreenCanvas(8, 8).getContext("2d")!;

/** Width in composition px of a run of text. */
export function measure(text: string, s: TypeStyle): number {
  const m = measureCtx();
  m.font = fontOf(s, 1);
  setTracking(m, s, 1);
  return m.measureText(text).width;
}

export type Label = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

/** One line of flat type on a plane, drawn once. Fade it via `material.opacity`. */
export function label(text: string, s: TypeStyle): Label {
  const size = s.size * RES;
  const pad = Math.round(size * 0.3);
  const m = measureCtx();
  m.font = fontOf(s);
  setTracking(m, s);
  const w = Math.ceil(m.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.3) + pad * 2;
  const texture = canvasTexture(w, h, (g) => {
    g.font = fontOf(s);
    setTracking(g, s);
    g.fillStyle = s.color ?? "#0c0d10";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + size * 0.04);
  });
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w / RES / PX, h / RES / PX),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
}

export interface ExtrudedStyle extends TypeStyle {
  top: string;
  bottom: string;
  side: string;
  /** Extrusion depth in composition px. */
  depth?: number;
  layers?: number;
}

/**
 * Chunky glossy "3D" type: the face over a stack of darker copies stepping
 * back in z. Tilt the group a little and the stack reads as an extrusion —
 * the reference's inflated prize number, without a font loader.
 */
export function extrudedLabel(text: string, s: ExtrudedStyle): THREE.Group {
  const size = s.size * RES;
  const pad = Math.round(size * 0.3);
  const m = measureCtx();
  m.font = fontOf(s);
  setTracking(m, s);
  const w = Math.ceil(m.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.3) + pad * 2;
  const draw = (fill: (g: Ctx2D) => void) =>
    canvasTexture(w, h, (g) => {
      g.font = fontOf(s);
      setTracking(g, s);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#000";
      g.fillText(text, w / 2, h / 2 + size * 0.04);
      g.globalCompositeOperation = "source-in";
      fill(g);
    });

  const face = draw((g) => {
    const grad = g.createLinearGradient(0, h * 0.25, 0, h * 0.78);
    grad.addColorStop(0, s.top);
    grad.addColorStop(1, s.bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // A soft specular band across the upper third: the "inflated" gloss.
    g.globalCompositeOperation = "source-atop";
    const shine = g.createLinearGradient(0, h * 0.28, 0, h * 0.5);
    shine.addColorStop(0, "rgba(255,255,255,0.34)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = shine;
    g.fillRect(0, 0, w, h * 0.5);
  });
  const side = draw((g) => {
    g.fillStyle = s.side;
    g.fillRect(0, 0, w, h);
  });

  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(w / RES / PX, h / RES / PX);
  const layers = s.layers ?? 14;
  const depth = u(s.depth ?? 26);
  const sideMat = new THREE.MeshBasicMaterial({ map: side, transparent: true, depthWrite: false });
  for (let i = layers; i >= 1; i--) {
    const layer = new THREE.Mesh(geo, sideMat);
    layer.position.z = -(i / layers) * depth;
    layer.renderOrder = 10 + (layers - i);
    group.add(layer);
  }
  const front = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ map: face, transparent: true, depthWrite: false }),
  );
  front.renderOrder = 10 + layers + 1;
  group.add(front);
  group.userData.materials = [sideMat, front.material];
  return group;
}

export function setGroupOpacity(group: THREE.Object3D, opacity: number) {
  group.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (mat && "opacity" in mat) {
      mat.opacity = opacity;
      mat.transparent = true;
    }
  });
}

export interface Roller {
  group: THREE.Group;
  width: number;
  materials: THREE.MeshBasicMaterial[];
  /** Continuous digit positions, one per `#` slot (7.5 = halfway 7→8). */
  set(positions: number[]): void;
  /** Slot-machine roll between two digit strings, `t` 0→1. */
  roll(from: string, to: string, t: number, spins?: number): void;
  setOpacity(o: number): void;
}

/**
 * A slot-machine number. `pattern` is its layout, `#` a rolling digit and
 * anything else static, e.g. "$#,###". Each digit is a window onto one strip
 * of 0-9 drawn once; rolling only moves the texture offset.
 */
export function roller(pattern: string, s: TypeStyle): Roller {
  const size = s.size * RES;
  const m = measureCtx();
  m.font = fontOf(s);
  setTracking(m, s);
  const digitW = Math.ceil(Math.max(...[..."0123456789"].map((d) => m.measureText(d).width)));
  const cell = Math.ceil(size * 1.22);
  const strip = canvasTexture(digitW + 8, cell * 11, (g) => {
    g.font = fontOf(s);
    g.fillStyle = s.color ?? "#0c0d10";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let i = 0; i <= 10; i++) g.fillText(String(i % 10), (digitW + 8) / 2, cell * i + cell / 2 + size * 0.04);
  });
  strip.repeat.set(1, 1 / 11);

  const group = new THREE.Group();
  const materials: THREE.MeshBasicMaterial[] = [];
  const textures: THREE.Texture[] = [];
  let x = 0;
  const parts: { mesh: THREE.Mesh; w: number }[] = [];
  for (const ch of pattern) {
    if (ch === "#") {
      const tex = strip.clone();
      tex.repeat.set(1, 1 / 11);
      textures.push(tex);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      materials.push(mat);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry((digitW + 8) / RES / PX, cell / RES / PX), mat);
      mesh.name = `digit-${textures.length}`;
      parts.push({ mesh, w: digitW / RES / PX });
    } else {
      const cw = m.measureText(ch).width / RES / PX;
      const l = label(ch, s);
      l.name = `symbol-${parts.length + 1}`;
      materials.push(l.material);
      parts.push({ mesh: l, w: cw });
    }
  }
  const total = parts.reduce((a, p) => a + p.w, 0);
  for (const p of parts) {
    p.mesh.position.x = x + p.w / 2 - total / 2;
    x += p.w;
    group.add(p.mesh);
  }

  const set = (positions: number[]) => {
    textures.forEach((tex, i) => {
      const k = (((positions[i] ?? 0) % 10) + 10) % 10;
      tex.offset.y = 1 - (k + 1) / 11;
    });
  };
  set(textures.map(() => 0));

  return {
    group,
    width: total,
    materials,
    set,
    roll(from, to, t, spins = 1) {
      const n = textures.length;
      const stagger = 0.08;
      const pos = textures.map((_, i) => {
        const a = Number(from[i] ?? 0);
        const b = Number(to[i] ?? 0);
        const local = interpolate(t, [i * stagger, 1 - (n - 1 - i) * stagger * 0.5], [0, 1], Easing.easeOut);
        const dist = (((b - a) % 10) + 10) % 10 + 10 * (spins + Math.floor(i / 2));
        return a + dist * local;
      });
      set(pos);
    },
    setOpacity(o) {
      for (const mat of materials) mat.opacity = o;
    },
  };
}
