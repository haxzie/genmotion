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
      uMaskX: { value: 1e9 },
      uMaskSoft: { value: 0 },
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

/** Per-frame look of a label: opacity, blur in composition px, tint, masks in world units. */
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

/* ---------------------------------------------------------------- counter */

/** True when the style's face sets every figure on one advance (tabular figures are on). */
export const hasTabularFigures = (s: TypeStyle) => {
  const w = [..."0123456789"].map((d) => measure(d, { ...s, tracking: 0 }));
  return Math.max(...w) - Math.min(...w) < 0.5;
};

/**
 * A rolling number: one strip of 0-9 drawn once, one plane per digit slot showing a window
 * onto it. `set(value)` moves texture offsets (and, for proportional figures, slot positions) only.
 * `pattern` like "$#,###": # is a digit.
 * figures "tabular" (default): every slot is one advance wide. Use a face with tabular figures on
 *   (withFonts with features '"tnum" 1'); with a proportional face a narrow 1 sits in a wide cell
 *   and "$1,211" reads "$1, 2 1 1".
 * figures "proportional": each slot is as wide as the digit it shows (blended while it rolls) and
 *   the number stays right-anchored, for a face that has no tabular figures.
 */
export function counter(pattern: string, s: TypeStyle, figures: "tabular" | "proportional" = "tabular") {
  const flat: TypeStyle = { ...s, tracking: 0 };
  const adv = [..."0123456789"].map((d) => measure(d, flat));
  const digitW = Math.ceil(Math.max(...adv));
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
  const parts: { mesh: THREE.Object3D; w: number; digit: boolean; x: number }[] = [];
  for (const ch of pattern) {
    if (ch === "#") {
      const tex = strip.clone();
      tex.repeat.set(1, 1 / 11);
      slots.push(tex);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
      materials.push(mat);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(digitW * PX, cell * PX), mat);
      mesh.name = `counter-digit-${slots.length}`;
      parts.push({ mesh, w: digitW, digit: true, x: 0 });
    } else {
      const m = label(ch, flat, "center", 0);
      m.name = "counter-symbol";
      symbols.push(m);
      parts.push({ mesh: m, w: measure(ch, flat), digit: false, x: 0 });
    }
  }
  const total = parts.reduce((a, p) => a + p.w, 0);
  let x = -total / 2;
  for (const p of parts) {
    p.x = (x + p.w / 2) * PX;
    p.mesh.position.x = p.x;
    x += p.w;
    group.add(p.mesh);
  }
  /**
   * Show `value`; fractional values roll the last digit (and carry) smoothly. Leading zeros and
   * the separators before them are hidden ("$#,###" at 42 reads "$42", not "$0,042"); the digits
   * stay right-anchored, and a prefix ("$") moves to sit beside the first visible digit.
   * Give the pattern as many # as the final value has digits.
   */
  const set = (value: number) => {
    const n = slots.length;
    let d = 0;
    let lead = true;
    let first: (typeof parts)[number] | undefined;
    const widths: number[] = [];
    parts.forEach((p, k) => {
      let w = p.w;
      if (p.digit) {
        const place = 10 ** (n - 1 - d);
        const tex = slots[d++]!;
        const whole = Math.floor(value / place) % 10;
        // a slot rolls to its next digit while everything below it passes from 9...9 to 0...0
        const roll = Math.min(1, Math.max(0, (value % place) - (place - 1)));
        tex.offset.y = 1 - (whole + roll + 1) / 11;
        if (place === 1 || value > place - 1) lead = false; // shown once it is (or is rolling to) non-zero
        p.mesh.visible = !lead;
        if (figures === "proportional") w = adv[whole]! + (adv[(whole + 1) % 10]! - adv[whole]!) * roll;
      } else {
        p.mesh.visible = k === 0 || !lead; // a separator shows only after a visible digit
      }
      widths.push(w);
      if (k > 0 && p.mesh.visible && !first) first = p;
    });
    if (figures === "proportional") {
      // lay out right to left from the fixed right edge, so the number grows leftward
      let r = total / 2;
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k]!;
        if (k === 0 && !p.digit) continue; // the prefix is placed below
        p.x = (r - widths[k]! / 2) * PX;
        p.mesh.position.x = p.x;
        if (p.mesh.visible) r -= widths[k]!;
      }
    }
    const pre = parts[0];
    if (pre && !pre.digit && first) pre.mesh.position.x = first.x - ((widths[parts.indexOf(first)]! + pre.w) / 2) * PX;
  };
  set(0);
  /** Fades the whole counter; never re-shows a hidden leading slot. */
  const setOpacity = (o: number) => {
    materials.forEach((m) => (m.opacity = o));
    symbols.forEach((m) => (m.material.uniforms.uOpacity!.value = o));
    group.visible = o > 0.001;
  };
  /** Tints the whole counter (the strip is drawn white unless style.color says otherwise): an ink change on a new ground. */
  const setColor = (c: THREE.Color) => {
    materials.forEach((m) => m.color.copy(c));
    symbols.forEach((m) => (m.material.uniforms.uColor!.value as THREE.Color).copy(c));
  };
  return { group, set, setOpacity, setColor, width: total * PX };
}
```

## 2. API at a glance

| Call | Returns | Use |
| --- | --- | --- |
| `label(text, style, align?)` | one plane (`Label`) | A line that moves as one; a single word; a caption |
| `line(text, style, align?)` | `{ group, words[], width }` | Word-by-word reveals; `align` "left" / "center" / "right" puts the group origin at that edge (a left column uses "left"); each word keeps `userData.restX` |
| `letters(word, style)` | `{ group, letters[], track(em, anchor?) }` | Per-character titles; a wordmark whose tracking tightens. `anchor` "left" / "center" / "right" is the edge that stays put; `track` returns the word's width |
| `setLabel(m, { opacity, blur, color, maskY, maskX, maskSoft })` | — | Per-frame look: blur in px, tint (draw white, tint per frame), clip below a world y, clip right of a world x (a wipe, feathered by `maskSoft` world units) |
| `measure(text, style)` | px | Layout maths: slot widths, wrapping by hand |
| `counter("$#,###", style, figures?)` | `{ group, set(value), setOpacity(o), setColor(c), width }` | Count-ups; fractional values roll; leading zeros and their separators stay hidden, the prefix rides beside the first digit. `figures` "tabular" (default: load the face with tabular figures on, §3) or "proportional" (a face without them: each slot as wide as its digit, right-anchored). `setColor` changes its ink (a counter crossing onto a new ground) |
| `hasTabularFigures(style)` | boolean | Whether the style's face sets every figure on one advance: true for a face loaded with `features: '"tnum" 1'` that has them |
| `withFonts(ctx, files, build)` | the scene's update | Wrap the whole builder so no texture is drawn in a fallback face |
| `onTop(obj, order?)` | the same object | Type over 3D as one layer: no depth test on its meshes, and `order` on every mesh **and Group** under it (the groups `line()`/`letters()`/`counter()` return included). 100 = above the world, under covers; 960+ = above a cover |

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
- **Two families** (a sans for messages, a mono for labels): one `withFonts` call with both files, `[{ family: "Inter", url: interUrl }, { family: "JetBrains Mono", url: monoUrl }]`, and `font: '"JetBrains Mono", monospace'` in the label styles.
- **Tabular figures for counters.** A counter's digits sit in equal slots; with a face's default proportional figures (Inter, DM Sans and most UI faces) a narrow 1 then sits in a wide slot and "$1,211" reads "$1, 2 1 1". Load the same file a second time under its own family name with the OpenType feature on, and use that family for every number that counts:

```ts
withFonts(ctx, [
  { family: "Inter", url: interUrl },
  { family: "Inter Tnum", url: interUrl, features: '"tnum" 1' },   // the same file, tabular figures on
], () => {
  const NUM = { size: 120, weight: 500, font: '"Inter Tnum"' };
  const total = counter("$#,###", NUM);                                // hasTabularFigures(NUM) === true
  // ...
});
```

  Tested in the capture browser: Inter's 1 and 0 measure 41.0 and 71.5 px at 120 px; with `"tnum" 1` both measure 73.7. A face with no `tnum` feature still reports `hasTabularFigures(...) === false` after this: use `counter(pattern, style, "proportional")`, which sizes each slot to the digit it shows (blending the two widths while a slot rolls) and keeps the number right-anchored. Never pad digits with spaces or pick a monospace face just for the count.
- `withFonts` registers the load on `ctx.manager`, runs the builder when it lands, and re-poses the frame the host asked for before the barrier releases. A missing file never hangs the export; the fallback face draws instead (check a still).

## 4. Why it is built this way

- **2× canvases** (`RES`): captures run at up to 2× device pixels; type drawn at 1× goes soft.
- **Tracking in the canvas** (`letterSpacing`): the canvas applies it per glyph, so measured widths include it and words lay out exactly.
- **Draw white, tint per frame**: a colour sweep or two-pass ink is `color.lerpColors(a, b, t)` on one plane, never two crossfaded copies (which let the background show through and read pale).
- **A `ShaderMaterial`, not `MeshBasicMaterial`**: it gives blur and the mask, and it is never tone mapped, so text keeps its exact hex under any `renderer.toneMapping` (`three-look`).
- **Blur room**: each canvas is padded by 16 px so a 10–16 px blur spreads instead of being clipped at the plane edge. For heavier display blur (18–34 px) pass a larger `blurRoom`.
- **The masks are world coordinates**: `maskY` discards everything below a horizontal line, which is all `riseMask` and mask push-up need. Put the line just under the descenders: `baselineY - size * 0.75 * PX` for a centred label; for an all-caps word (no descenders) just under the caps, `y - size * 0.36 * PX` for a centred label (measured: Inter caps on a label centred at `y` run from 0.39 × size above it to 0.33 × size below, so caps sit 0.03 × size above the plane's centre; shift an all-caps wordmark down by that to centre it optically on a symbol). `maskX` discards everything right of a vertical line, so a light line or an arm travelling left to right can *write* a word in; `maskSoft` (world units, about 0.15 × size × PX) feathers that edge. Both are world values: if the type's group moves or sits inside a moved parent, convert with `getWorldPosition` first.
- **Cap height**: Inter's capitals are 0.727 em tall, so a wordmark whose caps must be 96 px is set at `96 / 0.727 ≈ 132` px. Other faces: measure a capital H on a still once.
- **Draw order, and the Group trap**: three.js sorts transparent objects by **groupOrder first** (the `renderOrder` of the nearest ancestor `THREE.Group`; every Group resets it to its own order, 0 by default), then by the mesh's own `renderOrder`, then by depth. So the Group that `line()`, `letters()` or `counter()` returns, at 0, drops its words to the bottom of whatever they sit in, whatever order the meshes carry: the trap a judged film hit when a payoff line nested in the overlay vanished under a flood. `onTop(obj, order)` therefore sets `order` on every Group under `obj` as well as every mesh, so the subtree is one layer. `three-camera`'s `overlay()` group is 900 and the cover inside it 950: `onTop(x)` (100) keeps world type under covers, `onTop(x, 960)` puts a line above a flood (tested: the same nested line without `onTop` drew under the cover, with `onTop(…, 960)` above it). Covers and panels must be `transparent: true`: opaque objects all draw before transparent ones. Layered flat shapes (a stand-in mark built from overlapping facets): one Group per layer, each `onTop(layer, n)` with rising `n`.
- **Picking**: every plane is named after its words (`slug`), so a click in the editor arrives as `#ship-the-whole-film`.
