import * as THREE from "three";
import type { ThreeFrame, ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { PX, RES } from "./stage";
import { clamp01, outCubic, inCubic, lerp } from "./ease";
import interUrl from "../assets/InterVariable.woff2";

export const FONT = 'Inter, "SF Pro Display", -apple-system, "Helvetica Neue", Arial, sans-serif';
export const MONO = '"SF Mono", Menlo, Consolas, monospace';

export interface TypeStyle {
  size: number;
  weight?: number;
  color?: string;
  tracking?: number; // em
  font?: string;
  /** Paint the glyphs with the canvas's own colours (e.g. a gradient) instead of the uColor tint. */
  paint?: (g: OffscreenCanvasRenderingContext2D, w: number, h: number) => string | CanvasGradient;
}

export const trackingFor = (size: number) => (size >= 120 ? -0.02 : size >= 60 ? -0.01 : 0);

function applyFont(g: OffscreenCanvasRenderingContext2D, s: TypeStyle, scale: number) {
  g.font = `${s.weight ?? 500} ${s.size * scale}px ${s.font ?? FONT}`;
  g.letterSpacing = `${(s.tracking ?? trackingFor(s.size)) * s.size * scale}px`;
}

let measurer: OffscreenCanvasRenderingContext2D | null = null;
export function measure(text: string, s: TypeStyle): number {
  const g = (measurer ??= new OffscreenCanvas(8, 8).getContext("2d")!);
  applyFont(g, s, 1);
  return g.measureText(text).width;
}

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec2 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xy;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uBlur;
uniform float uMaskY;
uniform float uMaskX;
uniform float uMaskSoft;
uniform float uUseTex;
varying vec2 vUv;
varying vec2 vWorld;
void main() {
  if (vWorld.y < uMaskY) discard;
  float keepX = uMaskSoft > 0.0 ? clamp((uMaskX - vWorld.x) / uMaskSoft, 0.0, 1.0) : step(vWorld.x, uMaskX);
  if (keepX <= 0.0) discard;
  vec4 c = vec4(0.0);
  if (uBlur.x + uBlur.y < 1e-5) {
    c = texture2D(uMap, vUv);
  } else {
    float tot = 0.0;
    for (int i = 0; i < 9; i++) for (int j = 0; j < 9; j++) {
      vec2 q = vec2(float(i) / 8.0 - 0.5, float(j) / 8.0 - 0.5);
      float w = exp(-dot(q, q) * 6.0);
      c += texture2D(uMap, vUv + q * 2.0 * uBlur) * w;
      tot += w;
    }
    c /= tot;
  }
  vec3 rgb = uUseTex > 0.5 ? mix(uColor, c.rgb / max(c.a, 1e-4), uUseTex - 0.5) : uColor;
  gl_FragColor = vec4(rgb, c.a * uOpacity * keepX);
  #include <colorspace_fragment>
}`;

export type Label = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

/** One run of type on an unlit plane, drawn once at 2x. Anchored left or centre. */
export function label(text: string, s: TypeStyle, align: "left" | "center" = "center", blurRoom = 24): Label {
  const pad = Math.ceil(s.size * 0.3) + blurRoom;
  const adv = Math.ceil(measure(text, s));
  const w = adv + pad * 2;
  const h = Math.ceil(s.size * 1.3) + pad * 2;
  const canvas = new OffscreenCanvas(w * RES, h * RES);
  const g = canvas.getContext("2d")!;
  applyFont(g, s, RES);
  g.textBaseline = "middle";
  g.fillStyle = s.paint ? s.paint(g, w * RES, h * RES) : "#ffffff";
  g.fillText(text, pad * RES, (h / 2 + s.size * 0.04) * RES);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(w * PX, h * PX);
  geo.translate(align === "left" ? (w / 2 - pad) * PX : 0, 0, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex },
      uColor: { value: new THREE.Color(s.color ?? "#ffffff") },
      uOpacity: { value: 1 },
      uBlur: { value: new THREE.Vector2(0, 0) },
      uMaskY: { value: -1e9 },
      uMaskX: { value: 1e9 },
      uMaskSoft: { value: 0 },
      uUseTex: { value: s.paint ? 1.5 : 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat) as Label;
  mesh.name = slug(text);
  mesh.userData = { w: adv * PX, wPx: w, hPx: h };
  return mesh;
}

export function setLabel(
  m: Label,
  o: { opacity?: number; blur?: number; color?: THREE.Color; maskY?: number; maskX?: number; maskSoft?: number },
) {
  const u = m.material.uniforms;
  if (o.maskY !== undefined) u.uMaskY!.value = o.maskY;
  if (o.maskX !== undefined) u.uMaskX!.value = o.maskX;
  if (o.maskSoft !== undefined) u.uMaskSoft!.value = o.maskSoft;
  if (o.opacity !== undefined) {
    u.uOpacity!.value = o.opacity;
    m.visible = o.opacity > 0.002;
  }
  if (o.blur !== undefined) (u.uBlur!.value as THREE.Vector2).set(o.blur / m.userData.wPx, o.blur / m.userData.hPx);
  if (o.color) (u.uColor!.value as THREE.Color).copy(o.color);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "text";

export type Align = "left" | "center" | "right";

export interface Word extends Label {
  userData: { w: number; wPx: number; hPx: number; restX: number; accent: boolean; index: number };
}

/**
 * A line as separately animatable words. Words wrapped in *asterisks* are flagged accent
 * (userData.accent) so a scene can tint them. Origin at the line's left / centre / right.
 */
export function line(text: string, s: TypeStyle, align: Align = "center") {
  const group = new THREE.Group();
  const raw = text.split(" ");
  const parts = raw.map((p) => p.replace(/\*/g, ""));
  group.name = slug(parts.join(" "));
  const space = measure(" ", s);
  const widths = parts.map((p) => measure(p, s));
  const total = widths.reduce((a, b) => a + b, 0) + space * (parts.length - 1);
  let x = align === "left" ? 0 : align === "right" ? -total : -total / 2;
  const words = parts.map((p, i) => {
    const m = label(p, s, "left") as Word;
    m.position.x = x * PX;
    m.userData.restX = m.position.x;
    m.userData.accent = raw[i]!.includes("*");
    m.userData.index = i;
    x += widths[i]! + space;
    group.add(m);
    return m;
  });
  return { group, words, width: total * PX };
}

/** One plane per character (kerned positions), with tracking that can animate. */
export function letters(word: string, s: TypeStyle) {
  const group = new THREE.Group();
  group.name = slug(word);
  const flat: TypeStyle = { ...s, tracking: 0 };
  const chars = [...word];
  const prefix = chars.map((ch, i) => measure(chars.slice(0, i + 1).join(""), flat) - measure(ch, flat));
  const full = measure(word, flat);
  const meshes = chars.map((ch, i) => {
    const m = label(ch, flat, "left", 16);
    m.name = `${group.name}-${i + 1}`;
    group.add(m);
    return m;
  });
  const track = (em: number, anchor: Align = "center") => {
    const total = full + em * s.size * (chars.length - 1);
    const x0 = anchor === "left" ? 0 : anchor === "right" ? -total : -total / 2;
    meshes.forEach((m, i) => (m.position.x = (prefix[i]! + em * s.size * i + x0) * PX));
    return total * PX;
  };
  track(s.tracking ?? trackingFor(s.size));
  return { group, letters: meshes, track, width: full * PX };
}

export function onTop<T extends THREE.Object3D>(obj: T, order = 100): T {
  obj.traverse((o) => {
    if ((o as THREE.Group).isGroup) {
      o.renderOrder = order;
      return;
    }
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    o.renderOrder = order;
    for (const mat of Array.isArray(m) ? m : [m]) mat.depthTest = false;
  });
  return obj;
}

/* ------------------------------------------------------------------ fonts */

export interface FontFile { family: string; url: string; weight?: string; features?: string }

export function withFonts(ctx: ThreeSceneContext, fonts: FontFile[], build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  const loaded = new Set<string>();
  doc.fonts.forEach((face) => {
    if (face.status === "loaded") loaded.add(face.family.replace(/"/g, ""));
  });
  if (fonts.every((f) => loaded.has(f.family))) return build();
  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = `fonts:${fonts.map((f) => f.url).join(",")}`;
  ctx.manager.itemStart(key);
  Promise.all(
    fonts.map((f) =>
      new FontFace(f.family, `url(${f.url})`, { weight: f.weight ?? "100 900", ...(f.features ? { featureSettings: f.features } : {}) })
        .load()
        .then((face) => {
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

/** The film's one font set: Inter, plus a tabular-figure copy for clocks and counters. */
export function withInter(ctx: ThreeSceneContext, build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  return withFonts(
    ctx,
    [
      { family: "Inter", url: interUrl },
      { family: "Inter Tnum", url: interUrl, features: '"tnum" 1' },
    ],
    build,
  );
}

/* ------------------------------------------------- the film's word reveal */

const _c = new THREE.Color();

/**
 * The reference's signature word move: a word blurs in from a light grey while sliding a
 * little from the right, darkening to its ink; it leaves by blurring and fading.
 * `t0` = first frame of the entrance; `t1` = first frame of the exit (Infinity = stays).
 */
export function revealWord(
  w: Label,
  frame: number,
  t0: number,
  t1: number,
  o: {
    ink: THREE.Color;
    from?: THREE.Color; // starting tint (light grey)
    inDur?: number;
    outDur?: number;
    slide?: number; // px travelled on entry (+ = from the right)
    outSlide?: number;
    blurIn?: number;
    blurOut?: number;
    inkDelay?: number; // frames the grey -> ink tint lags the opacity
    restX?: number;
  },
) {
  const inDur = o.inDur ?? 8;
  const outDur = o.outDur ?? 7;
  const pIn = outCubic(clamp01((frame - t0) / inDur));
  const pInk = outCubic(clamp01((frame - t0 - (o.inkDelay ?? 2)) / (inDur + 4)));
  const pOut = inCubic(clamp01((frame - t1) / outDur));
  const restX = o.restX ?? (w.userData as { restX?: number }).restX ?? w.position.x;
  w.position.x = restX + (1 - pIn) * (o.slide ?? 24) * PX - pOut * (o.outSlide ?? 0) * PX;
  _c.copy(o.from ?? GREY_FROM).lerp(o.ink, pInk);
  setLabel(w, {
    opacity: Math.min(1, pIn * 1.6) * (1 - pOut),
    blur: (1 - pIn) * (o.blurIn ?? 10) + pOut * (o.blurOut ?? 10),
    color: _c,
  });
  return pIn * (1 - pOut);
}

export const GREY_FROM = new THREE.Color("#c4c7c9");
export { lerp };
