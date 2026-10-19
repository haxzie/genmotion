/**
 * The flat-stage kit: a 1920x1080 "stage" where 1 world unit = 100 stage px,
 * canvas-drawn type, SDF rounded rectangles and image planes. Everything is
 * flat (depthTest off) and layered by renderOrder, like a motion-design comp.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";

type ThreeFrame = Parameters<ThreeSceneUpdate>[0];

export const U = 1 / 100; // stage px -> world units
/** Canvas pixels per stage px: the camera pushes in to ~2.7x, so type is drawn at 3x. */
export const SS = 3;

/* ------------------------------------------------------------------ fonts */

export function withFonts(
  ctx: ThreeSceneContext,
  fonts: { family: string; url: string }[],
  build: () => ThreeSceneUpdate,
): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = `fonts:${fonts.map((f) => f.url).join(",")}`;
  ctx.manager.itemStart(key);
  Promise.all(
    fonts.map((f) =>
      new FontFace(f.family, `url(${f.url})`, { weight: "100 900" }).load().then((face) => {
        (doc.fonts as unknown as Set<FontFace>).add(face);
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

/* ---------------------------------------------------------------- shaders */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const IMAGE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uReveal;
uniform float uBlur;
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  if (vUv.x > uReveal) discard;
  vec4 c;
  if (uBlur < 1e-5) {
    c = texture2D(uMap, vUv);
  } else {
    c = vec4(0.0);
    for (int i = -4; i <= 4; i++) c += texture2D(uMap, vUv + vec2(float(i) * uBlur * 0.25, 0.0));
    c /= 9.0;
  }
  gl_FragColor = vec4(c.rgb * uTint, c.a) * uOpacity;
  #include <colorspace_fragment>
}`;

export type ImageMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uMap: { value: THREE.Texture | null };
    uOpacity: { value: number };
    uReveal: { value: number };
    uBlur: { value: number };
    uTint: { value: THREE.Color };
  };
};

export function imageMaterial(map: THREE.Texture | null): ImageMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uOpacity: { value: 1 },
      uReveal: { value: 2 },
      uBlur: { value: 0 },
      uTint: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: VERT,
    fragmentShader: IMAGE_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    premultipliedAlpha: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  }) as ImageMaterial;
}

function canvasTexture(canvas: OffscreenCanvas): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.premultiplyAlpha = true;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/* ------------------------------------------------------------------- text */

export interface Run {
  text: string;
  color: string;
}
export interface TextOpts {
  size: number; // stage px
  family: string;
  weight?: number;
  tracking?: number; // em
  anchor?: "left" | "center";
  fallback?: string;
}
export interface Text {
  mesh: THREE.Mesh;
  mat: ImageMaterial;
  /** width of the drawn text in stage px */
  width: number;
  /** advance of one character in stage px (monospace) */
  charW: number;
  /** show only the first n characters */
  showChars(n: number): void;
  /** x (stage px, relative to the anchor) of the end of the first n chars */
  xAt(n: number): number;
}

export function text(runs: Run[] | string, o: TextOpts, colour = "#ffffff"): Text {
  const list: Run[] = typeof runs === "string" ? [{ text: runs, color: colour }] : runs;
  const full = list.map((r) => r.text).join("");
  const px = o.size * SS;
  const font = `${o.weight ?? 400} ${px}px "${o.family}", ${o.fallback ?? "Menlo, monospace"}`;
  const tracking = (o.tracking ?? 0) * px;
  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = font;
  (m as unknown as { letterSpacing: string }).letterSpacing = `${tracking}px`;
  const textW = Math.max(1, m.measureText(full).width);
  const charW = m.measureText("0").width + tracking;
  const pad = Math.ceil(px * 0.3);
  const W = Math.ceil(textW + pad * 2);
  const H = Math.ceil(px * 1.5);
  const canvas = new OffscreenCanvas(W, H);
  const g = canvas.getContext("2d")!;
  g.font = font;
  (g as unknown as { letterSpacing: string }).letterSpacing = `${tracking}px`;
  g.textBaseline = "middle";
  let x = pad;
  for (const r of list) {
    g.fillStyle = r.color;
    g.fillText(r.text, x, H / 2 + px * 0.04);
    x += g.measureText(r.text).width;
  }
  const tex = canvasTexture(canvas);
  const geo = new THREE.PlaneGeometry((W / SS) * U, (H / SS) * U);
  const anchor = o.anchor ?? "left";
  if (anchor === "left") geo.translate(((W / 2 - pad) / SS) * U, 0, 0);
  const mat = imageMaterial(tex);
  const mesh = new THREE.Mesh(geo, mat);
  const left = anchor === "left" ? 0 : -textW / SS / 2;
  return {
    mesh,
    mat,
    width: textW / SS,
    charW: charW / SS,
    showChars(n: number) {
      mat.uniforms.uReveal.value = n >= full.length ? 2 : (pad + n * charW) / W;
    },
    xAt(n: number) {
      return left + (n * charW) / SS;
    },
  };
}

/* ------------------------------------------------------- rounded rectangle */

const RRECT_FRAG = /* glsl */ `
uniform vec2 uSize;
uniform float uRadius;
uniform float uMargin;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec2 uGradDir; // gradient axis (colour2 -> colour), unit vector, y up
uniform float uOpacity;
uniform vec3 uBorder;
uniform float uBorderW;
uniform float uBorderA;
uniform float uSoft;
varying vec2 vUv;
float sdBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  vec2 full = uSize + 2.0 * uMargin;
  vec2 p = (vUv - 0.5) * full;
  float r = min(uRadius, min(uSize.x, uSize.y) * 0.5);
  float d = sdBox(p, uSize * 0.5, r);
  float aa = max(uSoft, fwidth(d) * 0.75);
  float a = 1.0 - smoothstep(-aa, aa, d);
  vec2 pn = p / max(uSize, vec2(1.0));
  float gy = clamp(dot(pn, uGradDir) / (abs(uGradDir.x) + abs(uGradDir.y)) + 0.5, 0.0, 1.0);
  vec3 col = mix(uColor2, uColor, gy);
  if (uBorderW > 0.0) {
    float b = smoothstep(-uBorderW - aa, -uBorderW + aa, d);
    col = mix(col, uBorder, b * uBorderA);
  }
  float alpha = a * uOpacity;
  gl_FragColor = vec4(col * alpha, alpha);
  #include <colorspace_fragment>
}`;

export class RRect {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  w = 0;
  h = 0;
  constructor(
    w: number,
    h: number,
    radius: number,
    colour: string,
    o: { colour2?: string; gradDir?: [number, number]; border?: string; borderW?: number; borderA?: number; soft?: number; margin?: number; opacity?: number } = {},
  ) {
    const margin = o.margin ?? (o.soft ? o.soft * 2 : 4);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: new THREE.Vector2(w, h) },
        uRadius: { value: radius },
        uMargin: { value: margin },
        uColor: { value: new THREE.Color(colour) },
        uColor2: { value: new THREE.Color(o.colour2 ?? colour) },
        uGradDir: { value: new THREE.Vector2(...(o.gradDir ?? [0, 1])).normalize() },
        uOpacity: { value: o.opacity ?? 1 },
        uBorder: { value: new THREE.Color(o.border ?? "#ffffff") },
        uBorderW: { value: o.borderW ?? 0 },
        uBorderA: { value: o.borderA ?? 1 },
        uSoft: { value: o.soft ?? 0 },
      },
      vertexShader: VERT,
      fragmentShader: RRECT_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      premultipliedAlpha: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.setSize(w, h);
  }
  setSize(w: number, h: number) {
    this.w = w;
    this.h = h;
    const m = this.mat.uniforms.uMargin.value as number;
    (this.mat.uniforms.uSize.value as THREE.Vector2).set(w, h);
    this.mesh.scale.set(Math.max(1e-4, (w + 2 * m) * U), Math.max(1e-4, (h + 2 * m) * U), 1);
  }
  set opacity(v: number) {
    this.mat.uniforms.uOpacity.value = v;
  }
  colour(c: THREE.Color, c2: THREE.Color = c) {
    (this.mat.uniforms.uColor.value as THREE.Color).copy(c);
    (this.mat.uniforms.uColor2.value as THREE.Color).copy(c2);
  }
}

/* ---------------------------------------------------------------- drawing */

/** A plane showing a canvas drawn once by `draw` at SS x resolution. */
export function drawn(w: number, h: number, draw: (g: OffscreenCanvasRenderingContext2D, s: number) => void) {
  const canvas = new OffscreenCanvas(Math.ceil(w * SS), Math.ceil(h * SS));
  const g = canvas.getContext("2d")!;
  draw(g, SS);
  const mat = imageMaterial(canvasTexture(canvas));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * U, h * U), mat);
  return { mesh, mat };
}

/** An image file (svg/png) on a plane, loaded through the frame barrier. */
export function image(ctx: ThreeSceneContext, url: string, w: number, h: number) {
  const tex = new THREE.TextureLoader(ctx.manager).load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = true;
  tex.anisotropy = 8;
  const mat = imageMaterial(tex);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * U, h * U), mat);
  return { mesh, mat };
}

/* ----------------------------------------------------------------- timing */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lin = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeIn = (x: number) => x * x * x;
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const expoOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const expoInOut = (x: number) =>
  x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
/** back-out with overshoot s */
export const backOut = (x: number, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
