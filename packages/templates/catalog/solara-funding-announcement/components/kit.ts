import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/fonts/Inter.woff2";
import poppins400Url from "../assets/fonts/Poppins-400.woff2";
import poppins500Url from "../assets/fonts/Poppins-500.woff2";
import serifUrl from "../assets/fonts/InstrumentSerif-Italic.woff2";
import openUrl from "../assets/fonts/OpenSans.woff2";

/* ------------------------------------------------------------------ stage */
// The whole film is laid out in composition pixels, y down, origin top-left,
// exactly like the reference frames it was measured from.
export const W = 1920;
export const H = 1080;
export const wx = (px: number) => px - W / 2;
export const wy = (py: number) => H / 2 - py;

export function stage(ctx: ThreeSceneContext, bg: string) {
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100);
  cam.position.set(0, 0, 10);
  ctx.setCamera(cam);
  ctx.scene.background = new THREE.Color(bg);
  ctx.renderer.toneMapping = THREE.NoToneMapping;
  return cam;
}

/* ----------------------------------------------------------------- timing */
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t: number) => Math.pow(clamp01(t), 3);
export const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const prog = (f: number, start: number, len: number, ease = easeOut) => ease((f - start) / len);

/** Piecewise-linear keyframes [[frame, value], ...], clamped at both ends. */
export function keys(f: number, k: [number, number][]): number {
  if (f <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i][0]) {
      const [f0, v0] = k[i - 1];
      const [f1, v1] = k[i];
      return v0 + ((v1 - v0) * (f - f0)) / (f1 - f0);
    }
  }
  return k[k.length - 1][1];
}

/** A value per frame, measured off the reference; null means "not on screen". */
export function table(f: number, start: number, arr: (number | null)[]): number | null {
  const i = Math.round(f) - start;
  if (i < 0) return arr[0];
  if (i >= arr.length) return arr[arr.length - 1];
  return arr[i];
}

/* ----------------------------------------------------------------- shader */
const VERT = /* glsl */ `
varying vec2 vUv;
varying vec2 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xy;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform int uMode;          // 0 solid, 1 image, 2 text (alpha), 3 halftone text
uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uSize;         // plane size in px
uniform float uRadius;      // own corner radius px
uniform vec4 uUv;           // image uv offset.xy, scale.zw
uniform vec2 uBlur;         // blur radius in uv units
uniform vec4 uClip;         // world rect x0,y0,x1,y1 (y0 < y1)
uniform float uClipR;
uniform float uDim;         // image darken 0..1
uniform float uDot;         // halftone pitch px
uniform float uSoftX;       // gaussian softness of the own shape along x, px (motion blur)
uniform float uSoftY;       // ...and along y
varying vec2 vUv;
varying vec2 vWorld;

float rbox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec4 sampleMap(vec2 uv) {
  vec2 u = uUv.xy + uv * uUv.zw;
  if (uBlur.x + uBlur.y < 1e-6) return texture2D(uMap, u);
  vec4 c = vec4(0.0);
  if (uBlur.x < 1e-6 || uBlur.y < 1e-6) {
    // one axis: a 25-tap gaussian-ish line, smooth even at large radii
    float tw = 0.0;
    for (int i = 0; i < 25; i++) {
      float k = float(i) / 12.0 - 1.0;
      float wgt = exp(-k * k * 2.5);
      c += texture2D(uMap, u + k * uBlur) * wgt;
      tw += wgt;
    }
    return c / tw;
  }
  float tw = 0.0;
  for (int i = 0; i < 11; i++) for (int j = 0; j < 11; j++) {
    vec2 k = vec2(float(i) / 5.0 - 1.0, float(j) / 5.0 - 1.0);
    float wgt = exp(-dot(k, k) * 2.5);
    c += texture2D(uMap, u + k * uBlur) * wgt;
    tw += wgt;
  }
  return c / tw;
}

void main() {
  float a = 1.0;
  // own rounded corners
  if (uSoftX > 0.0) {
    // average the shape's coverage along x: a horizontal gaussian smear of its edges
    vec2 p = (vUv - 0.5) * uSize;
    float acc = 0.0;
    float tw = 0.0;
    for (int i = 0; i < 13; i++) for (int j = 0; j < 5; j++) {
      vec2 k = vec2(float(i) / 6.0 - 1.0, float(j) / 2.0 - 1.0);
      float wgt = exp(-dot(k, k) * 4.5);
      float d = rbox(p + k * 3.0 * vec2(uSoftX, uSoftY), uSize * 0.5, uRadius);
      acc += clamp(0.5 - d, 0.0, 1.0) * wgt;
      tw += wgt;
    }
    a *= acc / tw;
  } else if (uRadius > 0.0) {
    vec2 p = (vUv - 0.5) * uSize;
    float d = rbox(p, uSize * 0.5, uRadius);
    a *= clamp(0.5 - d, 0.0, 1.0);
  }
  // clip window (world)
  if (uClip.z > uClip.x) {
    vec2 c = (uClip.xy + uClip.zw) * 0.5;
    vec2 h = (uClip.zw - uClip.xy) * 0.5;
    float d = rbox(vWorld - c, h, uClipR);
    a *= clamp(0.5 - d, 0.0, 1.0);
  }
  vec3 rgb = uColor;
  if (uMode == 1) {
    vec4 t = sampleMap(vUv);
    rgb = t.rgb * uColor * (1.0 - uDim);
    a *= t.a;
  } else if (uMode == 2) {
    vec4 t = sampleMap(vUv);
    a *= t.a;
  } else if (uMode == 3) {
    // halftone: sample the type at the centre of each dot cell
    // staggered (brick) grid, like a printed screen
    float row = floor(vWorld.y / uDot);
    vec2 wp = vWorld + vec2(mod(row, 2.0) * uDot * 0.5, 0.0);
    vec2 cell = floor(wp / uDot) * uDot + uDot * 0.5 - vec2(mod(row, 2.0) * uDot * 0.5, 0.0);
    vec2 cuv = vUv + (cell - vWorld) / uSize;
    float m = texture2D(uMap, uUv.xy + cuv * uUv.zw).a;
    float r = length(vWorld - cell);
    a *= step(0.5, m) * clamp(uDot * 0.36 - r + 0.5, 0.0, 1.0);
  }
  if (a <= 0.001) discard;
  gl_FragColor = vec4(rgb, a * uOpacity);
  #include <colorspace_fragment>
}`;

export type Panel = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

function material(mode: number, color: string, w: number, h: number, map: THREE.Texture | null) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uMode: { value: mode },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 1 },
      uSize: { value: new THREE.Vector2(w, h) },
      uRadius: { value: 0 },
      uUv: { value: new THREE.Vector4(0, 0, 1, 1) },
      uBlur: { value: new THREE.Vector2(0, 0) },
      uClip: { value: new THREE.Vector4(0, 0, 0, 0) },
      uClipR: { value: 0 },
      uDim: { value: 0 },
      uDot: { value: 14 },
      uSoftX: { value: 0 },
      uSoftY: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
}

let order = 0;
function finish(m: Panel, name: string): Panel {
  m.name = name;
  m.renderOrder = order++;
  return m;
}

/** A solid rounded rectangle, positioned by its screen-px box. */
export function rect(name: string, x0: number, y0: number, x1: number, y1: number, color: string, radius = 0): Panel {
  const w = x1 - x0;
  const h = y1 - y0;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material(0, color, w, h, null)) as Panel;
  m.material.uniforms.uRadius.value = radius;
  finish(m, name);
  setBox(m, x0, y0, x1, y1);
  return m;
}

/** Move/resize a rect or image panel to a screen-px box. */
export function setBox(m: Panel, x0: number, y0: number, x1: number, y1: number) {
  const w = Math.max(0.001, x1 - x0);
  const h = Math.max(0.001, y1 - y0);
  m.scale.set(w, h, 1);
  m.position.set(wx((x0 + x1) / 2), wy((y0 + y1) / 2), 0);
  m.material.uniforms.uSize.value.set(w, h);
}

/** Clip a panel to a screen-px rounded rect (world-space, so it ignores the panel's own motion). */
export function clipTo(m: Panel, x0: number, y0: number, x1: number, y1: number, r = 0) {
  m.material.uniforms.uClip.value.set(wx(x0), wy(y1), wx(x1), wy(y0));
  m.material.uniforms.uClipR.value = r;
}

/* ----------------------------------------------------------------- images */
export interface Picture extends Panel {
  userData: { aspect: number; panY: number; panX: number; zoom: number };
}

/** An image filling a box with "cover" fit. panY 0 = top of image, 1 = bottom. */
export function image(ctx: ThreeSceneContext, name: string, url: string, aspect = 1): Picture {
  const tex = new THREE.TextureLoader(ctx.manager).load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material(1, "#ffffff", 1, 1, tex)) as unknown as Picture;
  m.userData = { aspect, panY: 0.5, panX: 0.5, zoom: 1 };
  finish(m, name);
  return m;
}

/** Re-fit the image's uv window to its current box (call after setBox / when panning). */
export function cover(m: Picture) {
  const { aspect, panX, panY, zoom } = m.userData;
  const s = m.material.uniforms.uSize.value as THREE.Vector2;
  const boxA = s.x / s.y;
  let sx = 1;
  let sy = 1;
  if (boxA > aspect) sy = aspect / boxA;
  else sx = boxA / aspect;
  sx /= zoom;
  sy /= zoom;
  // uv y is bottom-up; panY 0 means the top of the picture is shown
  m.material.uniforms.uUv.value.set((1 - sx) * panX, (1 - sy) * (1 - panY), sx, sy);
}

/* ------------------------------------------------------------------- type */
export interface TStyle {
  font: string;
  size: number;
  weight?: number;
  color?: string;
  tracking?: number; // em
  italic?: boolean;
}

const RES = 2;
let measurer: OffscreenCanvasRenderingContext2D | null = null;
function applyFont(g: OffscreenCanvasRenderingContext2D, s: TStyle, k: number) {
  g.font = `${s.italic ? "italic " : ""}${s.weight ?? 400} ${s.size * k}px ${s.font}`;
  g.letterSpacing = `${(s.tracking ?? 0) * s.size * k}px`;
}

export function measure(text: string, s: TStyle) {
  const g = (measurer ??= new OffscreenCanvas(8, 8).getContext("2d")!);
  applyFont(g, s, 1);
  const m = g.measureText(text);
  return {
    adv: m.width,
    left: -m.actualBoundingBoxLeft,
    right: m.actualBoundingBoxRight,
    ascent: m.actualBoundingBoxAscent,
    descent: m.actualBoundingBoxDescent,
    ink: m.actualBoundingBoxRight + m.actualBoundingBoxLeft,
  };
}

/** Tracking (em) that gives `text` the target ink width at the style's size. */
export function trackingForInk(text: string, s: TStyle, inkWidth: number): number {
  const m = measure(text, { ...s, tracking: 0 });
  return (inkWidth - m.ink) / (Math.max(1, [...text].length - 1) * s.size);
}

/** Font size at which `text` has the given ink width. */
export function sizeForInk(text: string, s: TStyle, inkWidth: number): number {
  const m = measure(text, { ...s, size: 100 });
  return (100 * inkWidth) / m.ink;
}

export interface Txt extends Panel {
  userData: { adv: number; ink: number; inkL: number; ascent: number; descent: number; size: number };
}

/**
 * One run of type, drawn once at 2x, white, tinted by the shader.
 * The mesh origin sits on the BASELINE at the INK LEFT edge (align "left"), or the ink centre.
 */
export function text(name: string, str: string, s: TStyle, align: "left" | "center" | "right" = "left", blurRoom = 24): Txt {
  const mm = measure(str, s);
  const pad = Math.ceil(s.size * 0.25) + blurRoom;
  const asc = Math.max(mm.ascent, s.size * 0.95);
  const desc = Math.max(mm.descent, s.size * 0.3);
  const w = Math.ceil(mm.left < 0 ? mm.adv - mm.left : mm.adv) + Math.ceil(Math.max(0, mm.right - mm.adv)) + pad * 2;
  const h = Math.ceil(asc + desc) + pad * 2;
  const cv = new OffscreenCanvas(w * RES, h * RES);
  const g = cv.getContext("2d")!;
  applyFont(g, s, RES);
  g.fillStyle = "#ffffff";
  g.textBaseline = "alphabetic";
  const originX = pad + Math.max(0, -mm.left); // where the pen starts
  const baseY = pad + asc;
  g.fillText(str, originX * RES, baseY * RES);
  const tex = new THREE.CanvasTexture(cv as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  const geo = new THREE.PlaneGeometry(w, h);
  // ink left edge = originX + mm.left ; anchor the geometry so that point / baseline is the origin
  const inkL = originX + mm.left;
  const inkC = inkL + mm.ink / 2;
  const ax = align === "left" ? inkL : align === "center" ? inkC : inkL + mm.ink;
  geo.translate(w / 2 - ax, -(h / 2 - baseY), 0);
  const m = new THREE.Mesh(geo, material(2, s.color ?? "#ffffff", w, h, tex)) as unknown as Txt;
  m.userData = { adv: mm.adv, ink: mm.ink, inkL: mm.left, ascent: mm.ascent, descent: mm.descent, size: s.size };
  return finish(m, name) as Txt;
}

/** Place a text mesh by its screen-px anchor (baseline y). */
export function at(m: THREE.Object3D, x: number, baseline: number) {
  m.position.set(wx(x), wy(baseline), 0);
}

/** Blur in composition px (x, y). */
export function blur(m: Panel, px: number, py = px) {
  const s = m.material.uniforms.uSize.value as THREE.Vector2;
  m.material.uniforms.uBlur.value.set(px / s.x, py / s.y);
}

export const opacity = (m: Panel, o: number) => (m.material.uniforms.uOpacity.value = o);
export const tint = (m: Panel, c: string | THREE.Color) => m.material.uniforms.uColor.value.set(c);

/** Show a text mesh as halftone dots (pitch px) or solid. */
export function halftone(m: Panel, on: boolean, pitch = 14) {
  m.material.uniforms.uMode.value = on ? 3 : 2;
  m.material.uniforms.uDot.value = pitch;
}

/* ------------------------------------------------------------------ fonts */
interface FontFile { family: string; url: string; weight?: string; style?: string }
const FONTS: FontFile[] = [
  { family: "Inter", url: interUrl, weight: "100 900" },
  { family: "Poppins", url: poppins400Url, weight: "400" },
  { family: "Poppins", url: poppins500Url, weight: "500" },
  { family: "Instrument Serif", url: serifUrl, weight: "400", style: "italic" },
  { family: "Open Sans", url: openUrl, weight: "300 800" },
];

/** Build the scene only once every font has loaded, inside the export's frame barrier. */
export function withFonts(ctx: ThreeSceneContext, build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  const set = doc.fonts as unknown as Set<FontFace> & { forEach: (cb: (f: FontFace) => void) => void };
  const loaded = new Set<string>();
  set.forEach((face) => {
    if (face.status === "loaded") loaded.add(`${face.family.replace(/"/g, "")}|${face.weight}|${face.style}`);
  });
  const ready = FONTS.every((f) => loaded.has(`${f.family}|${f.weight ?? "400"}|${f.style ?? "normal"}`));
  if (ready) return build();

  type Frame = Parameters<ThreeSceneUpdate>[0];
  let update: ThreeSceneUpdate | null = null;
  let last: Frame | null = null;
  const key = "fonts:solara";
  ctx.manager.itemStart(key);
  Promise.all(
    FONTS.map((f) =>
      new FontFace(f.family, `url(${f.url})`, { weight: f.weight ?? "400", style: f.style ?? "normal" })
        .load()
        .then((face) => {
          set.add(face);
        }),
    ),
  )
    .catch(() => undefined)
    .then(() => {
      update = build();
      if (last) update(last);
    })
    .finally(() => ctx.manager.itemEnd(key));
  return (frame) => {
    last = frame;
    update?.(frame);
  };
}

/* ------------------------------------------------------------------- logo */
/** The Solara mark: a sphere, light above its horizon and dark below. Drawn once. */
export function solaraMark(name: string, d: number, variant: "sphere" | "white"): Panel {
  const P = Math.ceil(d * 0.3); // room for a blur to spread
  const D = d + P * 2;
  const S = Math.ceil(D * RES);
  const cv = new OffscreenCanvas(S, S);
  const g = cv.getContext("2d")!;
  const r = (d / 2) * RES - 1;
  g.beginPath();
  g.arc(S / 2, S / 2, r, 0, Math.PI * 2);
  g.closePath();
  if (variant === "white") {
    g.fillStyle = "#ffffff";
    g.fill();
  } else {
    const gr = g.createLinearGradient(0, S / 2 - r, 0, S / 2 + r);
    gr.addColorStop(0, "#f2f2f2");
    gr.addColorStop(0.44, "#8c8c8c");
    gr.addColorStop(0.5, "#5a5a5a");
    gr.addColorStop(0.53, "#2e2e2e");
    gr.addColorStop(1, "#050505");
    g.fillStyle = gr;
    g.fill();
  }
  const tex = new THREE.CanvasTexture(cv as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(D, D), material(1, "#ffffff", D, D, tex)) as Panel;
  return finish(m, name);
}
