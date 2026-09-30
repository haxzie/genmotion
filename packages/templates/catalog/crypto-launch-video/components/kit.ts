/**
 * Shared building blocks. Every layout in this project is authored in 1080p
 * reference pixels: `pxCamera` places the camera so 1 world unit = 1 px on the
 * z=0 plane, and `P(x, y)` converts a top-left pixel coordinate to world space.
 */
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";
import { C, FONT_TECH } from "./brand";

export const W = 1920;
export const H = 1080;
/** Camera distance at which 1 world unit = 1 px on z=0. */
export const CAM_Z = H / 2 / Math.tan(THREE.MathUtils.degToRad(25));
/** Scale that keeps 1u = 1px for a layer sitting at depth z (negative = behind). */
export const depthScale = (z: number) => (CAM_Z - z) / CAM_Z;

/** Camera distance at which 1 world unit = 1 composition pixel (at 1080p). */
export function pxCamera(ctx: ThreeSceneContext): number {
  const cam = ctx.camera as THREE.PerspectiveCamera;
  cam.fov = 50;
  cam.near = 1;
  cam.far = 8000;
  cam.aspect = ctx.width / ctx.height;
  const z = H / 2 / Math.tan(THREE.MathUtils.degToRad(25));
  cam.position.set(0, 0, z);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  return z;
}

export const px = (x: number) => x - W / 2;
export const py = (y: number) => H / 2 - y;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ---------------------------------------------------------------- canvases --

type Ctx2D = OffscreenCanvasRenderingContext2D;

export function canvasTexture(w: number, h: number, res: number, draw: (g: Ctx2D) => void) {
  const canvas = new OffscreenCanvas(Math.max(2, Math.ceil(w * res)), Math.max(2, Math.ceil(h * res)));
  const g = canvas.getContext("2d")!;
  g.scale(res, res);
  draw(g);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export type Anchor = "left" | "center" | "right";

/** A plane of `w`×`h` px drawn once with a 2D context. */
export function canvasMesh(
  w: number,
  h: number,
  draw: (g: Ctx2D) => void,
  opts: { res?: number; anchor?: Anchor; name?: string } = {},
) {
  const tex = canvasTexture(w, h, opts.res ?? 2, draw);
  const geo = new THREE.PlaneGeometry(w, h);
  const anchor = opts.anchor ?? "center";
  if (anchor === "left") geo.translate(w / 2, 0, 0);
  if (anchor === "right") geo.translate(-w / 2, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  if (opts.name) mesh.name = opts.name;
  return mesh;
}

export function roundRect(g: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h / 2, w / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

// -------------------------------------------------------------------- text --

export interface Run { text: string; color: string }

export interface TextOpts {
  size: number;
  weight?: number;
  color?: string;
  font?: string;
  tracking?: number; // px
  anchor?: Anchor;
  res?: number;
  name?: string;
}

/** A line of type. `reveal(n)` shows the first n characters (typewriter). */
export class Txt {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  w: number;
  h: number;
  /** x (px, from the left edge of the ink box) after each character. */
  stops: number[];
  count: number;
  private tex: THREE.Texture;
  private anchor: Anchor;
  private pad: number;

  constructor(runs: Run[] | string, o: TextOpts) {
    const list: Run[] = typeof runs === "string" ? [{ text: runs, color: o.color ?? C.white }] : runs;
    const font = `${o.weight ?? 400} ${o.size}px ${o.font ?? FONT_TECH}`;
    const tracking = o.tracking ?? 0;
    const m = new OffscreenCanvas(8, 8).getContext("2d")!;
    m.font = font;
    (m as any).letterSpacing = `${tracking}px`;
    this.pad = Math.ceil(o.size * 0.15);
    const full = list.map((r) => r.text).join("");
    this.stops = [];
    for (let i = 1; i <= full.length; i++) this.stops.push(m.measureText(full.slice(0, i)).width);
    const inkW = full.length ? this.stops[full.length - 1]! : 1;
    this.count = full.length;
    this.w = Math.ceil(inkW) + this.pad * 2;
    this.h = Math.ceil(o.size * 1.35);
    this.anchor = o.anchor ?? "left";
    const pad = this.pad;
    this.tex = canvasTexture(this.w, this.h, o.res ?? 2, (g) => {
      g.font = font;
      (g as any).letterSpacing = `${tracking}px`;
      g.textBaseline = "middle";
      let x = pad;
      for (const r of list) {
        g.fillStyle = r.color;
        g.fillText(r.text, x, this.h / 2 + o.size * 0.04);
        x += m.measureText(r.text).width;
      }
    });
    const geo = new THREE.PlaneGeometry(this.w, this.h);
    // anchor the ink edge, not the padded texture edge
    if (this.anchor === "left") geo.translate(this.w / 2 - pad, 0, 0);
    if (this.anchor === "right") geo.translate(-this.w / 2 + pad, 0, 0);
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.name = o.name ?? slug(full);
  }

  /** Ink width (px) of the first n characters. */
  widthAt(n: number) {
    if (n <= 0) return 0;
    return this.stops[Math.min(n, this.count) - 1]!;
  }

  get inkW() {
    return this.widthAt(this.count);
  }

  /** Crop to the first n characters (left-anchored text only). */
  reveal(n: number) {
    const k = Math.max(0, Math.min(this.count, Math.floor(n)));
    const visible = k >= this.count ? this.w : this.pad + this.widthAt(k);
    const f = Math.max(0.0001, visible / this.w);
    this.tex.repeat.x = f;
    this.tex.offset.x = 0;
    this.mesh.scale.x = f;
    // keep the left edge fixed while cropping
    this.mesh.position.x = this.baseX;
    this.mesh.visible = k > 0;
  }
  baseX = 0;
  at(x: number, y: number, z = 0) {
    this.baseX = x;
    this.mesh.position.set(x, y, z);
    return this;
  }
}

export function slug(s: string) {
  const out = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  return out || "text";
}

// -------------------------------------------------------------- primitives --

const planeGeo = new THREE.PlaneGeometry(1, 1);

export function rect(w: number, h: number, color: string, opacity = 1, name?: string) {
  const m = new THREE.Mesh(
    planeGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  m.scale.set(w, h, 1);
  if (name) m.name = name;
  return m;
}

export function disc(r: number, color: string, opacity = 1, name?: string) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  if (name) m.name = name;
  return m;
}

export function ring(r: number, width: number, color: string, opacity = 1) {
  return new THREE.Mesh(
    new THREE.RingGeometry(r - width / 2, r + width / 2, 96),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
}

/** Soft radial glow (additive). */
let glowTex: THREE.Texture | null = null;
export function glow(size: number, color: string, opacity = 1, name?: string) {
  if (!glowTex) {
    glowTex = canvasTexture(128, 128, 1, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.35, "rgba(255,255,255,0.45)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    });
  }
  const m = new THREE.Mesh(
    planeGeo,
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  m.scale.set(size, size, 1);
  if (name) m.name = name;
  m.userData.pickable = false;
  return m;
}

/**
 * A polyline of solid strokes that can draw on: `draw(t)` shows the first
 * t (0..1) of its length. Points are world coordinates.
 */
export class Polyline {
  group = new THREE.Group();
  private segs: { m: THREE.Mesh; a: THREE.Vector2; b: THREE.Vector2; dir: THREE.Vector2; len: number; start: number }[] = [];
  total = 0;
  mat: THREE.MeshBasicMaterial;
  constructor(points: [number, number][], width: number, color: string, opacity = 1, name?: string) {
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    for (let i = 0; i < points.length - 1; i++) {
      const a = new THREE.Vector2(...points[i]!);
      const b = new THREE.Vector2(...points[i + 1]!);
      const len = a.distanceTo(b);
      const g = new THREE.PlaneGeometry(1, width);
      g.translate(0.5, 0, 0);
      const m = new THREE.Mesh(g, this.mat);
      m.position.set(a.x, a.y, 0);
      m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
      this.group.add(m);
      this.segs.push({ m, a, b, dir: b.clone().sub(a).normalize(), len, start: this.total });
      this.total += len;
    }
    if (name) {
      this.group.name = name;
      this.segs.forEach((sg, i) => (sg.m.name = `${name}-segment-${i + 1}`));
    }
    this.draw(1);
  }
  /** Draw from `from` to `to` (fractions of total length). */
  draw(to: number, from = 0) {
    const L1 = to * this.total;
    const L0 = from * this.total;
    for (const s of this.segs) {
      const s0 = Math.max(L0, s.start) - s.start;
      const s1 = Math.min(L1, s.start + s.len) - s.start;
      const vis = s1 - s0;
      s.m.visible = vis > 0.01;
      s.m.position.set(s.a.x + s.dir.x * s0, s.a.y + s.dir.y * s0, 0);
      s.m.scale.x = Math.max(0.001, vis);
    }
  }
  /** Point at fraction t along the line. */
  pointAt(t: number, out: THREE.Vector2) {
    const L = THREE.MathUtils.clamp(t, 0, 1) * this.total;
    for (const s of this.segs) {
      if (L <= s.start + s.len || s === this.segs[this.segs.length - 1]) {
        const k = s.len ? (L - s.start) / s.len : 0;
        return out.copy(s.a).lerp(s.b, THREE.MathUtils.clamp(k, 0, 1));
      }
    }
    return out;
  }
}

// ------------------------------------------------------------- HUD labels --

function bracketTex(color: string, arm: number, thick: number) {
  return canvasTexture(arm, arm, 3, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, arm, thick);
    g.fillRect(0, 0, thick, arm);
  });
}

/**
 * The reference's HUD label: text inside a box with corner brackets, typed on
 * with a solid block caret. The box grows with the typed text.
 */
export class HudLabel {
  group = new THREE.Group();
  txt: Txt;
  fill: THREE.Mesh;
  caret: THREE.Mesh;
  corners: THREE.Mesh[] = [];
  padX: number;
  padY: number;
  boxH: number;
  private cornerMat: THREE.MeshBasicMaterial;
  constructor(
    runs: Run[] | string,
    o: TextOpts & { fill?: string | null; bracket: string; padX?: number; padY?: number; arm?: number; minW?: number },
  ) {
    this.txt = new Txt(runs, { ...o, anchor: "left" });
    this.padX = o.padX ?? o.size * 0.22;
    this.padY = o.padY ?? o.size * 0.18;
    this.boxH = o.size * 1.18 + this.padY * 2;
    this.fill = rect(1, this.boxH, o.fill ?? "#000000", o.fill ? 1 : 0);
    this.fill.name = `${this.txt.mesh.name}-box`;
    this.caret = rect(o.size * 0.28, o.size * 0.95, o.color ?? C.yellow, 1);
    this.caret.name = `${this.txt.mesh.name}-caret`;
    const arm = o.arm ?? Math.max(10, o.size * 0.16);
    const tex = bracketTex(o.bracket, 24, 3);
    this.cornerMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(planeGeo, this.cornerMat);
      c.scale.set(arm, arm, 1);
      c.userData.pickable = false;
      this.corners.push(c);
    }
    this.group.add(this.fill, this.txt.mesh, this.caret, ...this.corners);
    this.group.name = `hud-${this.txt.mesh.name}`;
    this.txt.at(this.padX, 0, 0.1);
    this.set(this.txt.count, false);
  }
  /** Typed characters n, caret on/off. `boxW` optionally overrides the box width. */
  set(n: number, caretOn: boolean, boxW?: number) {
    this.txt.reveal(n);
    const tw = this.txt.widthAt(Math.floor(n));
    const caretW = caretOn ? (this.caret.scale.x as number) + 4 : 0;
    const w = boxW ?? tw + caretW + this.padX * 2;
    this.caret.visible = caretOn;
    this.caret.position.set(this.padX + tw + 2 + (this.caret.scale.x as number) / 2, 0, 0.1);
    this.fill.scale.x = Math.max(1, w);
    this.fill.position.set(w / 2, 0, 0);
    const h = this.boxH / 2;
    const a = this.corners[0]!.scale.x / 2;
    const d = 2; // brackets sit just outside the box
    const pts: [number, number, number][] = [
      [-d, h + d, 0], // TL
      [w + d, h + d, -Math.PI / 2], // TR
      [w + d, -h - d, Math.PI], // BR
      [-d, -h - d, Math.PI / 2], // BL
    ];
    pts.forEach(([x, y, r], i) => {
      const c = this.corners[i]!;
      c.rotation.z = r;
      // shift so the corner of the L sits on (x, y)
      const ox = Math.cos(r) * a - Math.sin(r) * -a;
      const oy = Math.sin(r) * a + Math.cos(r) * -a;
      c.position.set(x + ox, y + oy, 0.1);
    });
    return w;
  }
  opacity(o: number) {
    (this.fill.material as THREE.MeshBasicMaterial).opacity = this.fillBase * o;
    this.txt.mat.opacity = o;
    (this.caret.material as THREE.MeshBasicMaterial).opacity = o;
    this.cornerMat.opacity = o;
  }
  get fillBase() {
    return (this.fill.userData.base as number | undefined) ?? ((this.fill.userData.base = (this.fill.material as THREE.MeshBasicMaterial).opacity) as number);
  }
}

/** Typewriter progress in characters, with a caret that blinks when idle. */
export function typed(frame: number, start: number, cps: number, count: number) {
  const n = Math.max(0, Math.min(count, (frame - start) * (cps / 30)));
  const done = n >= count;
  const caret = frame >= start - 4 && (!done || Math.floor(frame / 8) % 2 === 0);
  return { n, done, caret };
}

// ---------------------------------------------------------------- counters --

/**
 * A number rendered from a pre-drawn glyph atlas so it can change every
 * frame without redrawing a canvas.
 */
export class Counter {
  group = new THREE.Group();
  private glyphs = new Map<string, { tex: THREE.Texture; w: number }>();
  private slots: THREE.Mesh[] = [];
  private cellH: number;
  anchor: Anchor;
  width = 0;
  mats: THREE.MeshBasicMaterial[] = [];
  constructor(
    charset: string,
    o: { size: number; weight?: number; color: string; font?: string; maxLen: number; anchor?: Anchor; res?: number; tabular?: boolean; name?: string },
  ) {
    const font = `${o.weight ?? 400} ${o.size}px ${o.font ?? FONT_TECH}`;
    const m = new OffscreenCanvas(8, 8).getContext("2d")!;
    m.font = font;
    this.cellH = Math.ceil(o.size * 1.3);
    const digitW = Math.max(...["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => m.measureText(d).width));
    for (const ch of new Set(charset.split(""))) {
      const adv = o.tabular !== false && /[0-9]/.test(ch) ? digitW : m.measureText(ch).width;
      const cw = Math.ceil(adv) + 8;
      const tex = canvasTexture(cw, this.cellH, o.res ?? 2, (g) => {
        g.font = font;
        g.fillStyle = o.color;
        g.textBaseline = "middle";
        g.textAlign = "center";
        g.fillText(ch, cw / 2, this.cellH / 2 + o.size * 0.04);
      });
      this.glyphs.set(ch, { tex, w: adv });
    }
    for (let i = 0; i < o.maxLen; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
      this.mats.push(mat);
      const s = new THREE.Mesh(planeGeo, mat);
      s.userData.pickable = false;
      this.slots.push(s);
      this.group.add(s);
    }
    this.anchor = o.anchor ?? "left";
    if (o.name) this.group.name = o.name;
  }
  set(str: string) {
    let total = 0;
    for (const ch of str) total += this.glyphs.get(ch)?.w ?? 0;
    this.width = total;
    let x = this.anchor === "left" ? 0 : this.anchor === "center" ? -total / 2 : -total;
    let i = 0;
    for (const ch of str) {
      const gl = this.glyphs.get(ch);
      if (!gl || i >= this.slots.length) continue;
      const s = this.slots[i++]!;
      const img = gl.tex.image as { width: number; height: number };
      const cw = (img.width / (img.height / this.cellH));
      (s.material as THREE.MeshBasicMaterial).map = gl.tex;
      s.scale.set(cw, this.cellH, 1);
      s.position.set(x + gl.w / 2, 0, 0);
      s.visible = true;
      x += gl.w;
    }
    for (; i < this.slots.length; i++) this.slots[i]!.visible = false;
  }
  opacity(o: number) {
    for (const m of this.mats) m.opacity = o;
  }
}

export const money = (v: number, dp = 2) =>
  v.toFixed(dp);
export const commas = (v: number) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ------------------------------------------------------------ pixel field --

/**
 * The reference's pixel-block motif: a field of square cells that pop on and
 * off in a seeded order. `set(t)` with t 0→1 sweeps them in, 1→2 out.
 */
export class PixelField {
  mesh: THREE.InstancedMesh;
  private cells: { x: number; y: number; delay: number; tint: number; life: number }[] = [];
  private m4 = new THREE.Matrix4();
  private col = new THREE.Color();
  private base: THREE.Color;
  private hot: THREE.Color;
  constructor(
    cells: [number, number][],
    size: number,
    o: { seed: number; color?: string; hot?: string; name?: string },
  ) {
    const rnd = mulberry32(o.seed);
    this.base = new THREE.Color(o.color ?? "#33090a");
    this.hot = new THREE.Color(o.hot ?? "#ba920f");
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      cells.length,
    );
    for (const [x, y] of cells) this.cells.push({ x, y, delay: rnd() * 0.6, tint: rnd(), life: 0.25 + rnd() * 0.3 });
    this.mesh.name = o.name ?? "pixel-field";
    this.mesh.userData.pickable = false;
    this.mesh.frustumCulled = false;
    this.set(0);
  }
  /** t: 0 = none, 0→1 cells flicker on and away. `peak` scales brightness. */
  set(t: number, peak = 1) {
    this.cells.forEach((c, i) => {
      const k = (t - c.delay) / c.life; // 0..1 lifetime of this cell
      const on = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
      this.m4.makeTranslation(c.x, c.y, 0);
      this.mesh.setMatrixAt(i, this.m4);
      this.col.copy(this.base).lerp(this.hot, c.tint > 0.8 ? 1 : c.tint * 0.4).multiplyScalar(on * peak);
      this.mesh.setColorAt(i, this.col);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

/** Cells forming a ring (square annulus) of blocks around a box. */
export function ringCells(cx: number, cy: number, halfW: number, halfH: number, cell: number, thickness = 2) {
  const out: [number, number][] = [];
  const nx = Math.ceil(halfW / cell) + thickness;
  const ny = Math.ceil(halfH / cell) + thickness;
  for (let i = -nx; i <= nx; i++)
    for (let j = -ny; j <= ny; j++) {
      const inside = Math.abs(i) < nx - thickness + 1 && Math.abs(j) < ny - thickness + 1;
      if (!inside) out.push([cx + i * cell, cy + j * cell]);
    }
  return out;
}

export function gridCells(cx: number, cy: number, halfW: number, halfH: number, cell: number) {
  const out: [number, number][] = [];
  for (let x = -halfW; x <= halfW; x += cell) for (let y = -halfH; y <= halfH; y += cell) out.push([cx + x, cy + y]);
  return out;
}

// -------------------------------------------------------------- keyframes --

export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  in: (t: number) => t * t * t,
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => {
    const c1 = 1.4, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/** Piecewise keyframes [[time, value], ...] eased per segment, clamped at the ends. */
export function kf(t: number, keys: [number, number][], e: Ease = ease.inOut) {
  if (t <= keys[0]![0]) return keys[0]![1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i]!;
    const [t1, v1] = keys[i + 1]!;
    if (t <= t1) return v0 + (v1 - v0) * e(t1 === t0 ? 1 : (t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1]![1];
}

/** 0→1 ramp between two times. */
export const ramp = (t: number, a: number, b: number, e: Ease = ease.out) => e(clamp01((t - a) / (b - a)));

/** Deterministic flicker used for the glitch-outs: 0/1 per frame. */
export const flicker = (frame: number, seed = 1) => (Math.sin(frame * 12.9898 * seed + seed * 78.233) * 43758.5453) % 1 > 0 ? 1 : 0;

/** Multiply every material under `root` by `o`, remembering each one's base opacity. */
export function groupOpacity(root: THREE.Object3D, o: number) {
  root.traverse((obj) => {
    const m = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const mm of Array.isArray(m) ? m : [m]) {
      if (mm.userData.baseOpacity === undefined) mm.userData.baseOpacity = mm.opacity;
      mm.transparent = true;
      mm.opacity = (mm.userData.baseOpacity as number) * o;
    }
  });
  root.visible = o > 0.001;
}
