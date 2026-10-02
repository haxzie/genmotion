# Drawn UI: `components/ui.ts`

For a product with no screenshots (`launch-playbook`'s "no screens" case, a demo before the app exists, a concept film), the app is **rebuilt** as flat canvas-drawn planes: a screen panel, a status bar, fields, chips, buttons, list rows, and grey bars for copy nobody needs to read. Each piece is drawn once into a canvas at 2× its largest on-screen scale, put on an unlit plane that is never tone mapped (so the brand hex stays exact), and animated as a mesh. Tested by rendering: compiled against `three` r185 and captured at 1920 × 1080 (a 600 × 1000 px panel with every helper below, crisp at 2×).

It needs `PX`/`RES` from `components/stage.ts` (`three-camera` `rig.md`) and `FONT`/`measure`/`slug` from `components/type.ts` (`three-type` `type-kit.md`). **Build every piece inside the scene's `withFonts(...)` builder**: canvas text drawn before the font file lands is drawn in a fallback face and never redrawn.

## Rules

- **28 px floor where it is seen.** Sizes here are composition px at scale 1. A panel shown at scale `s` (a phone at 0.6 in a wide shot) shows its text at `size × s`: every glyph that is seen must clear 28 px on screen, so either draw at `28 / s` or more, or push in. Copy that cannot clear the floor is drawn as grey bars (`textBars`), never as tiny glyphs: text that cannot be read should not look like text.
- **Bars are for incidental copy, never for the product's output.** `textBars` stands in for a settings label or a paragraph nobody needs to read. When what the product makes *is* text (a writing assistant's draft, a summary, a translation, a transcript, a generated email), those words are the film's evidence: set them as real sentences with the `three-type` kit, at ≥ 60 px on screen at the payoff (push in to the paragraph rather than shrinking the panel), held long enough to read (`motion-language`'s hold formula). A panel of grey bars where the output should be says "something happens here" and proves nothing. **Thumbnail state** (several outputs shown small, below 0.7×): each keeps its title and one readable first line (≥ 28 px on screen), and only the rest becomes bars.
- **Draw at the size it is shown.** Never draw small and scale the plane up (soft edges); redraw at the new size instead, once, in the builder.
- **Canvas resolution = 2 × the largest push it will see.** Every helper takes `res` (canvas px per composition px, default `RES` = 2, right for scale ≤ 1). A panel the camera pushes into at 2.5× is magnified 2.5× on screen, so draw it at `res = 2 * 2.5 = 5`, or its glyphs go soft at the end of the push. Keep a canvas side under 8192 px (`wPx * res`): past that, push into a separately drawn close-up plane instead.
- **Generic chrome, the brand's colours, nothing the brief did not name.** It is illustrative UI: record it in `VIDEO.md` under "I assumed" as "illustrative UI, replace with real screens".
- **One element per plane when it moves on its own** (a chip that flies out, a field that fills): the panel is the background, the moving parts are separate planes in a group with it.
- **Transparent and depth-write off** (the helper sets both), and `onTop()` from `three-type` when 3D objects share the frame. Planes sort by the parent Group's `renderOrder` first (see `three-type` `type-kit.md` §4).
- **No randomness**: bar widths come from the index through a fixed formula, so every render is identical.

## The module

```ts
import * as THREE from "three";
import { PX, RES } from "./stage";
import { FONT, measure, slug } from "./type";

export interface UiTheme {
  screen: string; // the app's background
  surface: string; // cards, fields
  text: string;
  muted: string; // labels, secondary copy
  accent: string; // the one brand accent: primary button, active chip
  onAccent: string; // text on the accent
  line: string; // hairlines, grey copy bars
}

export type Flat = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
type G = OffscreenCanvasRenderingContext2D;

export function roundRect(g: G, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function font(g: G, size: number, weight = 500) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.letterSpacing = "0px";
}

/** A flat, unlit plane whose content is drawn ONCE into a `res`x canvas, in composition px. res = 2 x the largest push scale. */
export function canvasPlane(wPx: number, hPx: number, draw: (g: G, w: number, h: number) => void, name: string, res = RES): Flat {
  const canvas = new OffscreenCanvas(Math.ceil(wPx * res), Math.ceil(hPx * res));
  const g = canvas.getContext("2d")!;
  g.scale(res, res);
  draw(g, wPx, hPx);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(wPx * PX, hPx * PX),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  ) as Flat;
  mesh.name = name;
  mesh.userData.wPx = wPx;
  mesh.userData.hPx = hPx;
  return mesh;
}

/** Copy nobody needs to read: rounded grey bars, widths fixed by index (no randomness). */
export function textBars(g: G, x: number, y: number, w: number, rows: number, color: string, barH = 14, gap = 16) {
  g.fillStyle = color;
  for (let i = 0; i < rows; i++) {
    const k = 0.55 + 0.4 * (((i * 7 + 3) % 5) / 4); // 55-95% of the width, fixed per row
    roundRect(g, x, y + i * (barH + gap), w * (i === rows - 1 ? 0.45 : k), barH, barH / 2);
    g.fill();
  }
}

/** The app's screen: background, rounded corners, an optional draw on top. */
export function screenPanel(wPx: number, hPx: number, t: UiTheme, name: string, draw?: (g: G, w: number, h: number) => void, radius = 56, res = RES): Flat {
  return canvasPlane(wPx, hPx, (g, w, h) => {
    roundRect(g, 0, 0, w, h, radius);
    g.fillStyle = t.screen;
    g.fill();
    g.save();
    roundRect(g, 0, 0, w, h, radius);
    g.clip();
    draw?.(g, w, h);
    g.restore();
  }, name, res);
}

/** Status bar drawn into a panel's canvas: time as type (>= 28 px), signal and battery as shapes. */
export function statusBar(g: G, w: number, t: UiTheme, time = "9:41", size = 30) {
  const y = size * 1.4;
  font(g, size, 500);
  g.fillStyle = t.text;
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillText(time, size * 1.6, y);
  const bx = w - size * 1.6 - size * 1.5;
  for (let i = 0; i < 4; i++) g.fillRect(bx - size * 1.6 + i * size * 0.28, y + size * 0.3 - i * size * 0.16, size * 0.18, size * 0.16 * (i + 1) + size * 0.06);
  g.lineWidth = 2;
  g.strokeStyle = t.text;
  roundRect(g, bx, y - size * 0.3, size * 1.4, size * 0.6, size * 0.15);
  g.stroke();
  roundRect(g, bx + 3, y - size * 0.3 + 3, size * 1.4 * 0.7, size * 0.6 - 6, size * 0.1);
  g.fill();
}

/** A labelled field: muted label above, value below, on a surface card. */
export function field(labelText: string, value: string, wPx: number, t: UiTheme, opts: { labelSize?: number; valueSize?: number; res?: number } = {}): Flat {
  const ls = Math.max(28, opts.labelSize ?? 28);
  const vs = Math.max(28, opts.valueSize ?? 38);
  const h = Math.round(ls * 1.5 + vs * 1.5 + 12);
  return canvasPlane(wPx, h, (g, w) => {
    roundRect(g, 0, 0, w, h, 20);
    g.fillStyle = t.surface;
    g.fill();
    g.textBaseline = "top";
    g.textAlign = "left";
    font(g, ls, 500);
    g.fillStyle = t.muted;
    g.fillText(labelText, 26, 14);
    font(g, vs, 500);
    g.fillStyle = t.text;
    g.fillText(value, 26, 14 + ls * 1.35);
  }, `field-${slug(labelText)}`, opts.res);
}

/** A pill chip: filled (accent) or outlined; text centred, >= 28 px. */
export function chip(text: string, t: UiTheme, opts: { size?: number; filled?: boolean; padX?: number; res?: number } = {}): Flat {
  const size = Math.max(28, opts.size ?? 30);
  const filled = opts.filled ?? true;
  const padX = opts.padX ?? Math.round(size * 0.9);
  const h = Math.round(size * 1.9);
  const w = Math.ceil(measure(text, { size, weight: 500, tracking: 0 })) + padX * 2;
  const m = canvasPlane(w + 4, h + 4, (g) => {
    roundRect(g, 2, 2, w, h, h / 2);
    if (filled) {
      g.fillStyle = t.accent;
      g.fill();
    } else {
      g.lineWidth = 3;
      g.strokeStyle = t.line;
      g.stroke();
    }
    font(g, size, 500);
    g.fillStyle = filled ? t.onAccent : t.text;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 2 + w / 2, 2 + h / 2 + size * 0.04);
  }, `chip-${slug(text)}`, opts.res);
  m.userData.h = h;
  return m;
}

/** A primary button, full width of its column. */
export function button(text: string, wPx: number, t: UiTheme, size = 34, res = RES): Flat {
  const s = Math.max(28, size);
  const h = Math.round(s * 2.4);
  return canvasPlane(wPx, h, (g, w) => {
    roundRect(g, 0, 0, w, h, h / 2);
    g.fillStyle = t.accent;
    g.fill();
    font(g, s, 500);
    g.fillStyle = t.onAccent;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + s * 0.04);
  }, `button-${slug(text)}`, res);
}

/** A list row: a leading dot or icon square, a title, grey bars for the detail, a value on the right. */
export function listRow(title: string, value: string, wPx: number, t: UiTheme, size = 32, res = RES): Flat {
  const s = Math.max(28, size);
  const h = Math.round(s * 2.6);
  return canvasPlane(wPx, h, (g, w) => {
    g.fillStyle = t.accent;
    roundRect(g, 0, h / 2 - s * 0.6, s * 1.2, s * 1.2, s * 0.3);
    g.fill();
    font(g, s, 500);
    g.fillStyle = t.text;
    g.textBaseline = "middle";
    g.textAlign = "left";
    g.fillText(title, s * 1.8, h / 2 + s * 0.04);
    g.textAlign = "right";
    g.fillText(value, w, h / 2 + s * 0.04);
    g.fillStyle = t.line;
    g.fillRect(0, h - 2, w, 2);
  }, `row-${slug(title)}`, res);
}

/** A baked soft shadow for a panel or paper prop (flat pipeline: no lights needed). */
export function softShadow(wPx: number, hPx: number, name: string, opacity = 0.4, blur = 18): Flat {
  const pad = blur * 2.2;
  return canvasPlane(wPx + pad * 2, hPx + pad * 2, (g) => {
    g.filter = `blur(${blur}px)`;
    g.fillStyle = `rgba(0,0,0,${opacity})`;
    roundRect(g, pad, pad + blur * 0.5, wPx, hPx, 40);
    g.fill();
  }, name);
}
```

## Using it

```ts
// builder, inside withFonts(...)
const T: UiTheme = { screen: "#ffffff", surface: "#f2f3f5", text: "#16161a", muted: "#6b6b76",
  accent: LOOK.accent, onAccent: "#ffffff", line: "#d9dae0" };
const app = new THREE.Group();
app.name = "app";
const PUSH = 2.5;                                     // the deepest push this panel sees
const res = 2 * PUSH;                                 // canvas px per composition px
const panel = screenPanel(600, 1000, T, "app-screen", (g, w) => {
  statusBar(g, w, T);
  g.fillStyle = T.text;
  g.font = `500 44px ${FONT}`;
  g.textBaseline = "top";
  g.fillText("New entry", 40, 110);
  textBars(g, 40, 700, w - 80, 3, T.line);            // copy nobody reads
}, 56, res);
const amount = field("Amount", "$48.00", 520, T, { res });
amount.position.set(0, 210 * PX, 0.01);
const tag = chip("Travel", T, { res });                       // moves on its own: its own plane
tag.position.set(-120 * PX, 40 * PX, 0.02);
const save = button("Save", 520, T, 34, res);
save.position.set(0, -360 * PX, 0.01);
const shadow = softShadow(600, 1000, "app-shadow");
shadow.position.z = -0.01;
app.add(shadow, panel, amount, tag, save);
scene.add(app);
// frame: animate meshes (position, scale, material.opacity); never redraw a canvas per frame
```

A drawn panel inside a device frame: size the panel to the frame's inner screen (`references/images-and-logos.md` §4) and put it just in front of the face. Pushing into the UI is a match-push (`three-camera`); at the end of the push the readable parts are ≥ 28 px on screen.

## Checks

1. `capture-frames` on the widest shot of the UI: every glyph shown clears 28 px on screen (measure a capital's height ÷ 0.727 for Inter); everything smaller is bars.
2. Crisp edges at full resolution, including the last frame of the deepest push (canvas `res` = 2 × that push scale).
3. The brand accent appears only on the primary action and the active chip; the rest is the theme's neutrals.
4. Nothing is redrawn inside the frame callback; no text was drawn before the font loaded (the face matches the headlines).
