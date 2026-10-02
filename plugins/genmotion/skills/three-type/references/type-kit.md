# The type kit: `components/type.ts`

One module for every word in the film. It draws each run of type **once** at 2× into a canvas texture with real tracking, puts it on an unlit plane, and gives every plane one small shader so a reveal can set opacity, blur, tint and a baseline mask per frame without redrawing anything. It also loads the project's font files through `ctx.manager` and builds the scene only when they have landed, and has a tabular rolling counter.

It needs `PX` and `RES` from `components/stage.ts` (`three-camera`, `references/rig.md`): 1 world unit = 100 composition px, canvases at 2×. Compiles against `three` r185 with the project's strict settings; tested by rendering (blur, colour sweep, tracking, mask, counter and the font barrier all verified in captured stills).

Contents: 1 The module · 2 API at a glance · 3 Fonts · 4 Why it is built this way

## 1. The module

```ts
import * as THREE from "three";
import type { ThreeFrame, ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { PX, RES } from "./stage";

export const FONT = 'Inter, "SF Pro Display", -apple-system, "Helvetica Neue", Arial, sans-serif';

export interface TypeStyle {
  size: number; // composition px
  weight?: number; // 400-500 (house cap 500); hierarchy comes from size, not weight
  color?: string; // drawn colour; draw white and tint with setLabel({ color }) for sweeps
  tracking?: number; // em; defaults by size
  font?: string;
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

const VERT = /* glsl */ `
varying vec2 vUv;
varying float vWorldY;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldY = world.y;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uBlur; // blur radius in uv units (x, y)
uniform float uMaskY; // world y below which nothing draws (riseMask, push-up)
varying vec2 vUv;
varying float vWorldY;
void main() {
  if (vWorldY < uMaskY) discard;
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
  gl_FragColor = vec4(c.rgb * uColor, c.a * uOpacity);
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
  g.fillStyle = s.color ?? "#ffffff";
  g.fillText(text, pad * RES, (h / 2 + s.size * 0.04) * RES);

  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(w * PX, h * PX);
  geo.translate(align === "left" ? (w / 2 - pad) * PX : 0, 0, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex },
      uColor: { value: new THREE.Color(1, 1, 1) },
      uOpacity: { value: 1 },
      uBlur: { value: new THREE.Vector2(0, 0) },
      uMaskY: { value: -1e9 },
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

/** Per-frame look of a label: opacity, blur in composition px, tint. */
export function setLabel(m: Label, o: { opacity?: number; blur?: number; color?: THREE.Color; maskY?: number }) {
  const u = m.material.uniforms;
  if (o.maskY !== undefined) u.uMaskY!.value = o.maskY;
  if (o.opacity !== undefined) {
    u.uOpacity!.value = o.opacity;
    m.visible = o.opacity > 0.001;
  }
  if (o.blur !== undefined) (u.uBlur!.value as THREE.Vector2).set(o.blur / m.userData.wPx, o.blur / m.userData.hPx);
  if (o.color) (u.uColor!.value as THREE.Color).copy(o.color);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "text";

/** A line as separately animatable words, centred on the group origin. Each word keeps userData.restX. */
export function line(text: string, s: TypeStyle) {
  const group = new THREE.Group();
  group.name = slug(text);
  const parts = text.split(" ");
  const space = measure(" ", s);
  const widths = parts.map((p) => measure(p, s));
  const total = widths.reduce((a, b) => a + b, 0) + space * (parts.length - 1);
  let x = -total / 2;
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
  // its own advance. (The advance of chars 0..i-1 alone misses the pair kern (i-1, i): in "Tally"
  // the a would sit too far right and both l's would overlap it.)
  const prefix = chars.map((ch, i) => measure(chars.slice(0, i + 1).join(""), flat) - measure(ch, flat));
  const full = measure(word, flat);
  const meshes = chars.map((ch, i) => {
    const m = label(ch, flat, "left", 12);
    m.name = `${group.name}-${i + 1}`;
    group.add(m);
    return m;
  });
  /** Lay the letters out at a tracking (em), centred. */
  const track = (em: number) => {
    const total = full + em * s.size * (chars.length - 1);
    meshes.forEach((m, i) => (m.position.x = (prefix[i]! + em * s.size * i - total / 2) * PX));
  };
  track(s.tracking ?? trackingFor(s.size));
  return { group, letters: meshes, track };
}

/* --------------------------------------------------------------- layering */

/**
 * Keep type (or any overlay) in front of the 3D world. The kit's planes write no depth but
 * still TEST it, so a mesh nearer the camera than the type (a card flying in at z = +2, a
 * receipt at z = 0.6) hides it. onTop turns the test off and draws the object after the
 * scene's other transparent objects; a higher `order` draws later (captions above headlines).
 */
export function onTop<T extends THREE.Object3D>(obj: T, order = 100): T {
  obj.traverse((o) => {
    o.renderOrder = order;
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (m) for (const mat of Array.isArray(m) ? m : [m]) mat.depthTest = false;
  });
  return obj;
}

/* ------------------------------------------------------------------ fonts */

export interface FontFile { family: string; url: string; weight?: string }

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
      new FontFace(f.family, `url(${f.url})`, { weight: f.weight ?? "100 900" }).load().then((face) => {
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

/* ---------------------------------------------------------------- counter */

/**
 * A rolling number: one strip of 0-9 drawn once, one plane per digit slot showing a window
 * onto it. `set(value)` moves texture offsets only. Digit slots are tabular (equal width),
 * so nothing shuffles as the number changes. `pattern` like "$#,###": # is a digit.
 */
export function counter(pattern: string, s: TypeStyle) {
  const flat: TypeStyle = { ...s, tracking: 0 };
  const digitW = Math.ceil(Math.max(...[..."0123456789"].map((d) => measure(d, flat))));
  const cell = Math.ceil(s.size * 1.25);
  const canvas = new OffscreenCanvas(digitW * RES, cell * 11 * RES);
  const g = canvas.getContext("2d")!;
  applyFont(g, flat, RES);
  g.fillStyle = s.color ?? "#ffffff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let i = 0; i <= 10; i++) g.fillText(String(i % 10), (digitW / 2) * RES, (cell * i + cell / 2 + s.size * 0.04) * RES);
  const strip = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  strip.colorSpace = THREE.SRGBColorSpace;

  const group = new THREE.Group();
  group.name = "counter";
  const slots: THREE.Texture[] = [];
  const materials: THREE.MeshBasicMaterial[] = [];
  const symbols: Label[] = [];
  const parts: { mesh: THREE.Object3D; w: number }[] = [];
  for (const ch of pattern) {
    if (ch === "#") {
      const tex = strip.clone();
      tex.repeat.set(1, 1 / 11);
      slots.push(tex);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
      materials.push(mat);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(digitW * PX, cell * PX), mat);
      mesh.name = `counter-digit-${slots.length}`;
      parts.push({ mesh, w: digitW });
    } else {
      const m = label(ch, flat, "center", 0);
      m.name = "counter-symbol";
      symbols.push(m);
      parts.push({ mesh: m, w: measure(ch, flat) });
    }
  }
  const total = parts.reduce((a, p) => a + p.w, 0);
  let x = -total / 2;
  for (const p of parts) {
    p.mesh.position.x = (x + p.w / 2) * PX;
    x += p.w;
    group.add(p.mesh);
  }
  /** Show `value`; fractional values roll the last digit (and carry) smoothly. */
  const set = (value: number) => {
    const n = slots.length;
    slots.forEach((tex, i) => {
      const place = 10 ** (n - 1 - i);
      const whole = Math.floor(value / place) % 10;
      // a slot rolls to its next digit while everything below it passes from 9...9 to 0...0
      const roll = Math.min(1, Math.max(0, (value % place) - (place - 1)));
      const pos = whole + roll;
      tex.offset.y = 1 - (pos + 1) / 11;
    });
  };
  set(0);
  const setOpacity = (o: number) => {
    materials.forEach((m) => (m.opacity = o));
    symbols.forEach((m) => setLabel(m, { opacity: o }));
    group.visible = o > 0.001;
  };
  return { group, set, setOpacity, width: total * PX };
}
```

## 2. API at a glance

| Call | Returns | Use |
| --- | --- | --- |
| `label(text, style, align?)` | one plane (`Label`) | A line that moves as one; a single word; a caption |
| `line(text, style)` | `{ group, words[], width }` | Word-by-word reveals; each word keeps `userData.restX` |
| `letters(word, style)` | `{ group, letters[], track(em) }` | Per-character titles; a wordmark whose tracking tightens |
| `setLabel(m, { opacity, blur, color, maskY })` | — | Per-frame look: blur in px, tint (draw white, tint per frame), clip below a world y |
| `measure(text, style)` | px | Layout maths: slot widths, wrapping by hand |
| `counter("$#,###", style)` | `{ group, set(value), setOpacity(o), width }` | Tabular count-ups; fractional values roll |
| `withFonts(ctx, files, build)` | the scene's update | Wrap the whole builder so no texture is drawn in a fallback face |
| `onTop(obj, order?)` | the same object | Type over 3D: no depth test, drawn last; call it on every label or group that must never be hidden |

Styles: `{ size (px), weight (400–500), color, tracking (em), font }`. Keep one `TYPE` table of named styles in `components/` and use only those.

## 3. Fonts

```ts
// components/assets.d.ts (once per project, so TypeScript accepts asset imports)
declare module "*.woff2" { const url: string; export default url; }

// scenes/01-hook.ts
import interUrl from "../assets/InterVariable.woff2";
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
    // ...the normal builder body: labels drawn here use Inter...
    return ({ frame }) => { /* ... */ };
  });
}
```

- The capture machine has almost no fonts installed, and `genmotion init` ships none: a family name alone (`Inter`, `SF Pro`) silently falls back to a default sans in the export. Ship the font file in `assets/` and load it this way in **every** scene that draws type; each scene bundles its own copy of the module.
- **Getting Inter** (SIL Open Font License, free to embed; font CDNs are often blocked from agent sandboxes, these were not): `save-asset` `https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/InterVariable.woff2` (352 KB, every weight) to `assets/InterVariable.woff2`; or the official release zip at `https://github.com/rsms/inter/releases` (`InterVariable.woff2` inside); or, where npm works, `npm pack @fontsource-variable/inter` and take `files/inter-latin-wght-normal.woff2`. A brand face comes from the brand (its site's woff2 or the user), never a lookalike.
- **Several static weights of one family**: `withFonts` decides "already loaded" by family name, so give each weight its own family name (`"Brand 400"`, `"Brand 500"`) and use those names in `font`, or use one variable file.
- Variable fonts: one file, `weight: "100 900"`, any weight. Static files: one entry per weight, same family name, `weight: "500"`.
- `withFonts` registers the load on `ctx.manager`, runs the builder when it lands, and re-poses the frame the host asked for before the barrier releases. A missing file never hangs the export; the fallback face draws instead (check a still).

## 4. Why it is built this way

- **2× canvases** (`RES`): captures run at up to 2× device pixels; type drawn at 1× goes soft.
- **Tracking in the canvas** (`letterSpacing`): the canvas applies it per glyph, so measured widths include it and words lay out exactly.
- **Draw white, tint per frame**: a colour sweep or two-pass ink is `color.lerpColors(a, b, t)` on one plane, never two crossfaded copies (which let the background show through and read pale).
- **A `ShaderMaterial`, not `MeshBasicMaterial`**: it gives blur and the mask, and it is never tone mapped, so text keeps its exact hex under any `renderer.toneMapping` (`three-look`).
- **Blur room**: each canvas is padded by 16 px so a 10–16 px blur spreads instead of being clipped at the plane edge. For heavier display blur (18–34 px) pass a larger `blurRoom`.
- **The mask is a world y**: `maskY` discards everything below a horizontal line, which is all `riseMask` and mask push-up need. Put the line just under the descenders: `baselineY - size * 0.75 * PX` for a centred label.
- **Picking**: every plane is named after its words (`slug`), so a click in the editor arrives as `#ship-the-whole-film`.
