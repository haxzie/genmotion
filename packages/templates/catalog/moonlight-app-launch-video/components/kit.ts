/**
 * A tiny 2D compositor on top of three.js.
 *
 * Everything is laid out in design pixels (1080×1080, origin top-left, y down),
 * drawn once into an OffscreenCanvas, and shown on a plane whose shader can
 * blur (directional or box), fade, and pixel-dissolve it per frame.
 */
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

export const W = 1080;
export const H = 1080;
export const FONT = `-apple-system, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif`;

export type G = OffscreenCanvasRenderingContext2D;
export type Imgs = Record<string, CanvasImageSource | undefined>;
export type Draw = (g: G, img: Imgs) => void;

/* ───────────── easing / timing ───────────── */

export type Ease = (t: number) => number;
export const E = {
  linear: ((t) => t) as Ease,
  outCubic: ((t) => 1 - Math.pow(1 - t, 3)) as Ease,
  outQuart: ((t) => 1 - Math.pow(1 - t, 4)) as Ease,
  outExpo: ((t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))) as Ease,
  inCubic: ((t) => t * t * t) as Ease,
  inQuad: ((t) => t * t) as Ease,
  inOutCubic: ((t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)) as Ease,
  inOutSine: ((t) => -(Math.cos(Math.PI * t) - 1) / 2) as Ease,
  outBack: ((t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }) as Ease,
};

/** Clamped multi-segment interpolation; `ease` applies within each segment. */
export function iv(f: number, input: number[], output: number[], ease: Ease = E.linear): number {
  if (f <= input[0]!) return output[0]!;
  const n = input.length - 1;
  if (f >= input[n]!) return output[n]!;
  let i = 1;
  while (i < n && input[i]! < f) i++;
  const t = (f - input[i - 1]!) / (input[i]! - input[i - 1]!);
  return output[i - 1]! + (output[i]! - output[i - 1]!) * ease(t);
}

/** 0→1 eased progress between two frames. */
export const prog = (f: number, a: number, b: number, ease: Ease = E.outCubic) => iv(f, [a, b], [0, 1], ease);

/* ───────────── shader ───────────── */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float opacity;
uniform vec2 blur;      // uv units
uniform float dissolve; // 0..1
uniform vec2 cells;     // block grid for the dissolve
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  float keep = 1.0;
  if (dissolve > 0.0) {
    vec2 b = floor(uv * cells);
    float h = hash(b);
    keep = step(dissolve, h * 0.999);
    // Blocks near their drop-out moment go chunky first.
    if (dissolve > h - 0.35) uv = (b + 0.5) / cells;
    uv.x += (hash(b + 7.0) - 0.5) * dissolve * 0.06;
  }
  vec4 c = vec4(0.0);
  if (blur.x < 1e-5 && blur.y < 1e-5) {
    c = texture2D(map, uv);
  } else if (blur.x < 1e-5 || blur.y < 1e-5) {
    for (int i = 0; i < 17; i++) { float t = float(i) / 16.0 - 0.5; c += texture2D(map, uv + blur * t); }
    c /= 17.0;
  } else {
    for (int i = 0; i < 7; i++) for (int j = 0; j < 7; j++) {
      c += texture2D(map, uv + vec2(blur.x * (float(i) / 6.0 - 0.5), blur.y * (float(j) / 6.0 - 0.5)));
    }
    c /= 49.0;
  }
  gl_FragColor = c * opacity * keep;
}
`;

/* ───────────── nodes ───────────── */

export interface Props {
  x: number; y: number; s: number; sx: number; sy: number; rot: number;
  op: number; bx: number; by: number; dis: number; cell: number;
}

export class Group2D {
  obj = new THREE.Group();
  x = W / 2; y = H / 2; s = 1; sx = 1; sy = 1; rot = 0;
  constructor(public parent: THREE.Object3D, public nested: boolean) {
    parent.add(this.obj);
  }
  set(p: Partial<Props>) {
    Object.assign(this, p);
    this.apply();
    return this;
  }
  apply() {
    if (this.nested) this.obj.position.set(this.x, -this.y, 0);
    else this.obj.position.set(this.x - W / 2, H / 2 - this.y, 0);
    this.obj.scale.set(this.s * this.sx, this.s * this.sy, 1);
    this.obj.rotation.z = (-this.rot * Math.PI) / 180;
  }
}

export class Layer extends Group2D {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  tex: THREE.CanvasTexture;
  op = 1; bx = 0; by = 0; dis = 0; cell = 36;
  readonly pw: number; readonly ph: number;

  constructor(
    parent: THREE.Object3D,
    nested: boolean,
    manager: THREE.LoadingManager,
    public w: number,
    public h: number,
    draw: Draw,
    opts: { res?: number; pad?: number; images?: Record<string, string>; order?: number } = {},
  ) {
    super(parent, nested);
    const res = opts.res ?? 2;
    const pad = opts.pad ?? 40;
    this.pw = w + pad * 2;
    this.ph = h + pad * 2;
    const cw = Math.ceil(this.pw * res);
    const ch = Math.ceil(this.ph * res);
    const canvas = new OffscreenCanvas(cw, ch);
    const g = canvas.getContext("2d")!;
    const loaded: Imgs = {};
    this.tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    this.tex.colorSpace = THREE.NoColorSpace;
    this.tex.premultiplyAlpha = true;
    this.tex.anisotropy = 8;
    const redraw = () => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cw, ch);
      g.setTransform(res, 0, 0, res, pad * res, pad * res);
      draw(g, loaded);
      this.tex.needsUpdate = true;
    };
    const keys = Object.keys(opts.images ?? {});
    if (keys.length) {
      const loader = new THREE.ImageLoader(manager);
      for (const k of keys) loader.load(opts.images![k]!, (im) => { loaded[k] = im; redraw(); });
    }
    redraw();

    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        map: { value: this.tex },
        opacity: { value: 1 },
        blur: { value: new THREE.Vector2() },
        dissolve: { value: 0 },
        cells: { value: new THREE.Vector2(1, 1) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.pw, this.ph), this.mat);
    this.obj.add(this.mesh);
    this.apply();
  }

  override apply() {
    super.apply();
    if (!this.mat) return;
    const u = this.mat.uniforms;
    u.opacity!.value = this.op;
    (u.blur!.value as THREE.Vector2).set(this.bx / this.pw, this.by / this.ph);
    u.dissolve!.value = this.dis;
    (u.cells!.value as THREE.Vector2).set(this.pw / this.cell, this.ph / this.cell);
    this.obj.visible = this.op > 0.002 && this.dis < 0.999;
  }

  /** Draw order; higher is on top. */
  z(n: number) {
    this.mesh.renderOrder = n;
    return this;
  }
}

/* ───────────── stage ───────────── */

let orderCounter = 0;

export class Stage {
  cam: THREE.OrthographicCamera;
  constructor(public ctx: ThreeSceneContext, bg = "#ffffff") {
    this.cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -5000, 5000);
    this.cam.position.z = 100;
    ctx.setCamera(this.cam);
    ctx.scene.background = new THREE.Color(bg);
    orderCounter = 0;
  }
  /** Point the camera at design pixel (cx, cy) with a zoom. */
  look(cx: number, cy: number, zoom = 1) {
    this.cam.position.x = cx - W / 2;
    this.cam.position.y = H / 2 - cy;
    this.cam.zoom = zoom;
    this.cam.updateProjectionMatrix();
  }
  layer(w: number, h: number, draw: Draw, opts: { res?: number; pad?: number; images?: Record<string, string>; parent?: Group2D } = {}) {
    const parent = opts.parent;
    const l = new Layer(parent ? parent.obj : this.ctx.scene, !!parent, this.ctx.manager, w, h, draw, opts);
    l.z(orderCounter++);
    return l;
  }
  group(parent?: Group2D) {
    return new Group2D(parent ? parent.obj : this.ctx.scene, !!parent);
  }
}

/* ───────────── text ───────────── */

let measureCv: OffscreenCanvasRenderingContext2D | null = null;
const mctx = () => (measureCv ??= new OffscreenCanvas(4, 4).getContext("2d")!);

export interface TextStyle {
  size: number;
  weight?: number;
  color?: string;
  tracking?: number; // px
}

export function font(size: number, weight = 400) {
  return `${weight} ${size}px ${FONT}`;
}

export function measure(str: string, st: TextStyle) {
  const m = mctx();
  m.font = font(st.size, st.weight ?? 400);
  (m as unknown as { letterSpacing: string }).letterSpacing = `${st.tracking ?? 0}px`;
  return m.measureText(str).width;
}

export function drawText(g: G, str: string, x: number, y: number, st: TextStyle & { align?: CanvasTextAlign }) {
  g.font = font(st.size, st.weight ?? 400);
  (g as unknown as { letterSpacing: string }).letterSpacing = `${st.tracking ?? 0}px`;
  g.fillStyle = st.color ?? "#000";
  g.textAlign = st.align ?? "left";
  g.textBaseline = "middle";
  g.fillText(str, x, y);
  (g as unknown as { letterSpacing: string }).letterSpacing = "0px";
}

/** A single-run text layer, sized to its content. Anchor is its centre. */
export function textLayer(stg: Stage, str: string, st: TextStyle, parent?: Group2D) {
  const w = Math.ceil(measure(str, st)) + 8;
  const h = Math.ceil(st.size * 1.35);
  return stg.layer(w, h, (g) => drawText(g, str, 4, h / 2, st), { pad: 30, parent });
}

/**
 * One layer per word, laid out centred on `cx`. Returns each word's layer and
 * its resting centre x so a scene can animate them independently.
 */
export function wordLayers(stg: Stage, str: string, st: TextStyle, cx: number, parent?: Group2D) {
  const words = str.split(" ");
  const space = measure(" ", st);
  const widths = words.map((w) => measure(w, st));
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let x = cx - total / 2;
  return words.map((word, i) => {
    const layer = textLayer(stg, word, st, parent);
    const center = x + widths[i]! / 2;
    x += widths[i]! + space;
    return { layer, x: center, word };
  });
}
