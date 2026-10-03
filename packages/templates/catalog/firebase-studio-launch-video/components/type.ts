import * as THREE from "three";
import type { ThreeFrame, ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { PX, RES } from "./stage";

export const FONT = '"Inter Display", "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif';

export interface TypeStyle {
  size: number; // composition px
  weight?: number; // 400-500 (house cap 500); hierarchy comes from size, not weight
  color?: string; // the starting tint. The canvas is always drawn white and this colour is the tint, so a
                  // later setLabel({ color }) or counter setColor REPLACES it (it never multiplies with it)
  tracking?: number; // em; defaults by size
  font?: string;
  /** extra stroke (composition px) drawn around the glyphs: matches type that renders slightly heavier than the static weight */
  embolden?: number;
}

/** House tracking: tighter as type gets bigger. */
export const trackingFor = (size: number) => (size >= 120 ? -0.03 : size >= 60 ? -0.02 : 0);

function applyFont(g: OffscreenCanvasRenderingContext2D, s: TypeStyle, scale: number) {
  g.font = `${s.weight ?? 500} ${s.size * scale}px ${s.font ?? FONT}`;
  g.letterSpacing = `${(s.tracking ?? trackingFor(s.size)) * s.size * scale}px`;
}

let measurer: OffscreenCanvasRenderingContext2D | null = null;
/** Advance width of a string in composition px (tracking included). */
export function measure(text: string, s: TypeStyle): number {
  const g = (measurer ??= new OffscreenCanvas(8, 8).getContext("2d")!);
  applyFont(g, s, 1);
  return g.measureText(text).width;
}

/**
 * How far below a centred label's middle a rise mask must sit for `text`, in composition px:
 * the lowest ink of this text in this face (descenders included: g j p q y, a comma) plus `pad`.
 * maskY = labelCentreY - maskDepth(text, style) * PX. An all-caps word gets a line just under
 * its caps; a word with a descender gets one under the descender, so nothing is ever clipped.
 * Call it inside withFonts (it measures the loaded face).
 */
export function maskDepth(text: string, s: TypeStyle, pad = Math.max(4, s.size * 0.06)): number {
  const g = (measurer ??= new OffscreenCanvas(8, 8).getContext("2d")!);
  applyFont(g, s, 1);
  g.textBaseline = "middle"; // label() draws on the middle baseline, 0.04 x size lower
  const below = g.measureText(text).actualBoundingBoxDescent;
  g.textBaseline = "alphabetic";
  return below + s.size * 0.04 + pad;
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
uniform vec2 uBlur; // blur radius in uv units (x, y)
uniform float uMaskY; // world y below which nothing draws (riseMask, push-up)
uniform float uMaskX; // world x right of which nothing draws (a left-to-right wipe)
uniform float uMaskSoft; // feather of the x wipe, world units (0 = hard edge)
uniform float uMaskL; // world x LEFT of which nothing draws (a carousel slot)
uniform float uMaskLSoft; // feather of the left mask, world units
varying vec2 vUv;
varying vec2 vWorld;
void main() {
  if (vWorld.y < uMaskY) discard;
  float keepX = uMaskSoft > 0.0 ? clamp((uMaskX - vWorld.x) / uMaskSoft, 0.0, 1.0) : step(vWorld.x, uMaskX);
  if (keepX <= 0.0) discard;
  float keepL = uMaskLSoft > 0.0 ? clamp((vWorld.x - uMaskL) / uMaskLSoft, 0.0, 1.0) : step(uMaskL, vWorld.x);
  if (keepL <= 0.0) discard;
  keepX *= keepL;
  vec4 c = vec4(0.0);
  if (uBlur.x + uBlur.y < 1e-5) {
    c = texture2D(uMap, vUv);
  } else {
    for (int i = 0; i < 7; i++) for (int j = 0; j < 7; j++) {
      vec2 o = vec2(float(i) / 6.0 - 0.5, float(j) / 6.0 - 0.5) * 2.0 * uBlur;
      c += texture2D(uMap, vUv + o);
    }
    c /= 49.0;
  }
  gl_FragColor = vec4(c.rgb * uColor, c.a * uOpacity * keepX);
  #include <colorspace_fragment>
}`;

export type Label = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

/**
 * One run of type on an unlit plane, drawn ONCE at 2x into a canvas texture.
 * Anchored at its left edge (align "left") or centre. userData.w is the ink advance in world units.
 */
export function label(text: string, s: TypeStyle, align: "left" | "center" = "center", blurRoom = 16): Label {
  const pad = Math.ceil(s.size * 0.3) + blurRoom; // room for descenders and for blur to spread
  const adv = Math.ceil(measure(text, s));
  const w = adv + pad * 2;
  const h = Math.ceil(s.size * 1.3) + pad * 2;
  const canvas = new OffscreenCanvas(w * RES, h * RES);
  const g = canvas.getContext("2d")!;
  applyFont(g, s, RES);
  g.textBaseline = "middle";
  g.fillStyle = "#ffffff"; // always white: style.color becomes the tint below, so a later tint replaces it
  g.fillText(text, pad * RES, (h / 2 + s.size * 0.04) * RES);
  if (s.embolden) {
    g.strokeStyle = "#ffffff";
    g.lineJoin = "round";
    g.lineWidth = s.embolden * RES;
    g.strokeText(text, pad * RES, (h / 2 + s.size * 0.04) * RES);
  }

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
      uMaskL: { value: -1e9 },
      uMaskLSoft: { value: 0 },
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

/** Per-frame look of a label: opacity, blur in composition px, tint (replaces style.color), masks in world units. */
export function setLabel(
  m: Label,
  o: { opacity?: number; blur?: number; color?: THREE.Color; maskY?: number; maskX?: number; maskSoft?: number; maskL?: number; maskLSoft?: number },
) {
  const u = m.material.uniforms;
  if (o.maskY !== undefined) u.uMaskY!.value = o.maskY;
  if (o.maskX !== undefined) u.uMaskX!.value = o.maskX;
  if (o.maskSoft !== undefined) u.uMaskSoft!.value = o.maskSoft;
  if (o.maskL !== undefined) u.uMaskL!.value = o.maskL;
  if (o.maskLSoft !== undefined) u.uMaskLSoft!.value = o.maskLSoft;
  if (o.opacity !== undefined) {
    u.uOpacity!.value = o.opacity;
    m.visible = o.opacity > 0.001;
  }
  if (o.blur !== undefined) (u.uBlur!.value as THREE.Vector2).set(o.blur / m.userData.wPx, o.blur / m.userData.hPx);
  if (o.color) (u.uColor!.value as THREE.Color).copy(o.color);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "text";

export type Align = "left" | "center" | "right";

/**
 * A line as separately animatable words. `align` puts the group origin at the line's left edge,
 * centre or right edge (a left column uses "left"). Each word keeps userData.restX.
 */
export function line(text: string, s: TypeStyle, align: Align = "center") {
  const group = new THREE.Group();
  group.name = slug(text);
  const parts = text.split(" ");
  const space = measure(" ", s);
  const widths = parts.map((p) => measure(p, s));
  const total = widths.reduce((a, b) => a + b, 0) + space * (parts.length - 1);
  let x = align === "left" ? 0 : align === "right" ? -total : -total / 2;
  const words = parts.map((p, i) => {
    const m = label(p, s, "left");
    m.position.x = x * PX;
    m.userData.restX = m.position.x;
    x += widths[i]! + space;
    group.add(m);
    return m;
  });
  return { group, words, width: total * PX };
}

/**
 * A word as one plane per character, for per-character titles and wordmarks.
 * x(i, tracking) = where glyph i starts inside the untracked, kerned word + i * tracking * size,
 * so tracking can animate per frame without redrawing anything.
 */
export function letters(word: string, s: TypeStyle) {
  const group = new THREE.Group();
  group.name = slug(word);
  const flat: TypeStyle = { ...s, tracking: 0 };
  const chars = [...word];
  // Glyph i starts where it starts inside the whole word: the kerned advance of chars 0..i minus
  // its own advance. (The advance of chars 0..i-1 alone misses the pair kern (i-1, i): in "Today"
  // the o would sit too far right of the T and every later glyph would drift with it.)
  const prefix = chars.map((ch, i) => measure(chars.slice(0, i + 1).join(""), flat) - measure(ch, flat));
  const full = measure(word, flat);
  const meshes = chars.map((ch, i) => {
    const m = label(ch, flat, "left", 12);
    m.name = `${group.name}-${i + 1}`;
    group.add(m);
    return m;
  });
  /**
   * Lay the letters out at a tracking (em). `anchor` is the edge that stays put while tracking
   * animates: "left" for a wordmark to the right of its symbol (the letters never travel into
   * the gap), "right" for one to its left, "center" otherwise. The group origin is that edge.
   */
  const track = (em: number, anchor: Align = "center") => {
    const total = full + em * s.size * (chars.length - 1);
    const x0 = anchor === "left" ? 0 : anchor === "right" ? -total : -total / 2;
    meshes.forEach((m, i) => (m.position.x = (prefix[i]! + em * s.size * i + x0) * PX));
    return total * PX;
  };
  track(s.tracking ?? trackingFor(s.size));
  return { group, letters: meshes, track };
}

/* --------------------------------------------------------------- layering */

/**
 * Keep type (or any overlay) in front of the 3D world, as ONE layer at `order`. The kit's planes
 * write no depth but still TEST it, so a mesh nearer the camera than the type (a card flying in
 * at z = +2, a phone at z = 0.6) hides it. onTop turns the test off on every mesh under `obj`
 * and gives every mesh AND every Group under it (obj included) the same renderOrder.
 * Why the Groups too: three.js sorts transparent objects by the nearest ancestor Group's
 * renderOrder first ("groupOrder"), and every Group resets it to its own order, so the Group
 * that line(), letters() and counter() return (order 0) would drop its words to the bottom of
 * whatever layer it sits in. Orders: 100 (default) draws above the world and below the camera
 * overlay's covers (group 900, cover 950); 960+ draws above a cover (a payoff line over a flood).
 */
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

/**
 * Build the scene only once the project's fonts are loaded, so no texture is ever drawn
 * in a fallback face. The load is registered on ctx.manager, so the export's frame barrier
 * waits for it; when it lands, the builder runs and the last requested frame is re-posed
 * before the barrier releases.
 */
export function withFonts(ctx: ThreeSceneContext, fonts: FontFile[], build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  const loaded = new Set<string>();
  doc.fonts.forEach((face) => {
    if (face.status === "loaded") loaded.add(face.family.replace(/"/g, ""));
  });
  const ready = fonts.every((f) => loaded.has(f.family));
  if (ready) return build();

  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = `fonts:${fonts.map((f) => f.url).join(",")}`;
  ctx.manager.itemStart(key);
  Promise.all(
    fonts.map((f) =>
      new FontFace(f.family, `url(${f.url})`, { weight: f.weight ?? "100 900", ...(f.features ? { featureSettings: f.features } : {}) }).load().then((face) => {
        (doc.fonts as unknown as Set<FontFace>).add(face); // typed only with the DOM.Iterable lib
      }),
    ),
  )
    .catch(() => undefined) // a missing font must not hang the export; the fallback face draws instead
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

/**
 * Ink extents of `text` relative to the advance origin of a label drawn with align "left",
 * in composition px: { left, right, ascent, descent } (left > 0 means ink starts right of the origin).
 * Use it to place a word by where its ink starts, which is what a reference frame measures.
 */
export function ink(text: string, s: TypeStyle) {
  const g = (measurer ??= new OffscreenCanvas(8, 8).getContext("2d")!);
  applyFont(g, s, 1);
  g.textBaseline = "middle";
  const m = g.measureText(text);
  g.textBaseline = "alphabetic";
  return { left: -m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent };
}
