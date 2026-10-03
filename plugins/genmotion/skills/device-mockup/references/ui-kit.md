# The app kit: `components/appui.ts`

The mobile app rebuilt as canvas-drawn planes that live inside the phone's screen: a type scale in proportion to the screen, a legibility floor, a two-line layout helper, and the components a modern app film needs. It extends `three-assets`' drawn UI (`components/ui.ts`: `canvasPlane`, `roundRect`, `UiTheme`, the 28 px rule) and the `three-type` kit (`label`, `measure`, `setLabel` for text that types and streams) rather than repeating them.

Tested by rendering: compiled with strict TypeScript against `three` r185 and captured at 1080 × 1920 inside `components/phone.ts` and directly on the stage. `images/home.png` is a home page built with it, `images/kit.png` the components on the stage (button states, chips, banner, pill toast, a typing field, a list with radios, a bubble, a follow-up, the eight stickers, an avatar row), `images/chat.png` a chat turn.

It needs `components/stage.ts`, `components/type.ts` and `components/ui.ts`. Build everything inside `withFonts` (and `withImages` for photos): canvases drawn before the font lands are drawn in a fallback face and never redrawn.

![The home page from the 6 s demo](images/home.png) ![Kit components on the stage](images/kit.png)

Contents: 1 Rules · 2 The module · 3 API · 4 A full home page · 5 Real screenshots and photos · 6 Stickers

## 1. Rules

- **Sizes are % of the screen width S**, clamped to `floor / shown` px (28 by default). Pass `shown` (the smallest scale the phone is read at) and the kit enlarges small roles instead of letting them fall under the floor; then lose rows, never shrink text.
- **Containers vs components.** A `page()` (and a sheet's `panel`) has its origin at its **top-left**, y down in px. Every component has its origin at its **centre** and carries its size in `userData.wPx/hPx`, so `put(container, component, x, y)` places the component's top-left at (x, y). `put` also stores `userData.rest`, the pose every flow in `flows.ts` animates from.
- **Drawn once.** Every component draws its canvas in the builder at `res` (2.2 default; 2 × the deepest push). Per frame you only move, scale and fade. A state change is two planes crossfaded (radio on/off, the button's four states, sheet titles), never a redraw.
- **One element per plane when it moves on its own**: chips in a row, list controls, each follow-up, each word of a streamed answer.
- **`fade(obj, o)` or `setLabel`, not both on one plane**: `fade` remembers each material's first opacity and scales it; it works on canvas planes and type-kit labels alike. Fading a parent overwrites what its children animate, so to hide a whole page or turn, leave it out of `ph.render`'s list instead.
- **Placeholder art is deterministic**: `scenery`, `blobs` and `tile` are fixed drawings (no randomness), so every render is identical.
- **Illustrative UI is labelled.** Rebuilt chrome in the brand's colours goes in `VIDEO.md` under "I assumed": "illustrative UI, replace with real screens".

## 2. The module

```ts
import * as THREE from "three";
import type { ThreeFrame, ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { PX } from "./stage";
import { FONT, label, measure, setLabel, slug, type Label } from "./type";
import { canvasPlane, roundRect, type Flat, type UiTheme } from "./ui";

type G = OffscreenCanvasRenderingContext2D;
/** Anything that paints a w x h rectangle: placeholder art, a loaded photo, a tile with a sticker. */
export type Art = (g: G, w: number, h: number) => void;

export interface AppTheme extends UiTheme {
  sheet: string; // modal sheets (warm off-white)
  primary: string; // primary button at rest
  onPrimary: string;
  success: string; // a step that completed, and nothing else
  frost: string; // notification banner fill
  tiles: string[]; // pastel grounds behind stickers and thumbnails
}

export const APP_LIGHT: AppTheme = {
  screen: "#eff3f6", surface: "#ffffff", text: "#0d0f12", muted: "#62666b",
  accent: "#2e5be6", onAccent: "#ffffff", line: "#e3e6ea",
  sheet: "#fbfbf8", primary: "#0f0f0f", onPrimary: "#ffffff", success: "#1c7c3d",
  frost: "rgba(243,241,242,0.97)",
  tiles: ["#e5eefc", "#fce7d6", "#eee9f8", "#fdf3dc", "#e8f4ee", "#fbe6ee"],
};

/* ------------------------------------------------------------- drawing */

const TAU = Math.PI * 2;

function font(g: G, size: number, weight: number) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.letterSpacing = size >= 44 ? `${-0.015 * size}px` : "0px";
}

/** One line of text; returns its advance. `**bold**` runs inside it are drawn at 700. */
export function text(g: G, s: string, x: number, y: number, size: number, weight: number, color: string, align: CanvasTextAlign = "left"): number {
  g.fillStyle = color;
  g.textBaseline = "middle";
  const runs = s.split("**");
  const widths = runs.map((r, i) => (font(g, size, i % 2 ? 700 : weight), g.measureText(r).width));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  g.textAlign = "left";
  runs.forEach((r, i) => {
    font(g, size, i % 2 ? 700 : weight);
    g.fillText(r, cx, y + size * 0.04);
    cx += widths[i]!;
  });
  return total;
}

/** Cut a string to fit `maxW` with an ellipsis. */
export function fit(g: G, s: string, maxW: number, size: number, weight: number): string {
  font(g, size, weight);
  if (g.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && g.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Original line icons on a 24-unit grid (stroke 2). An "F" prefix fills instead of stroking. */
export const ICONS: Record<string, string> = {
  search: "M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13M15.5 15.5L20.5 20.5",
  plus: "M12 5V19M5 12H19",
  back: "M15 5L8 12L15 19",
  chevron: "M9 5L16 12L9 19",
  close: "M6 6L18 18M18 6L6 18",
  menu: "M4 8H20M4 15H14",
  check: "M5 12.5L10 17L19 7",
  mic: "M9 6a3 3 0 0 1 6 0V11a3 3 0 0 1-6 0ZM6 11a6 6 0 0 0 12 0M12 17V21",
  up: "M12 19V5M6 11L12 5L18 11",
  share: "M12 15V3M7.5 7.5L12 3L16.5 7.5M8 11H6V21H18V11H16",
  bookmark: "M7 3H17V21L12 16.5L7 21Z",
  folder: "M3 6.5H9.5L11.5 8.5H21V19H3Z",
  heart: "M12 20C5 15 3 11.5 3 8.5A4.5 4.5 0 0 1 12 6.5A4.5 4.5 0 0 1 21 8.5C21 11.5 19 15 12 20Z",
  clock: "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18M12 7.5V12L15 14",
  pin: "M12 21C7.5 15.5 5.5 12.5 5.5 9.5A6.5 6.5 0 0 1 18.5 9.5C18.5 12.5 16.5 15.5 12 21ZM12 7.5a2 2 0 1 1 0 4a2 2 0 1 1 0-4",
  leaf: "M5 19C5 10 10 5 19 5C19 14 14 19 5 19ZM5 19L13 11",
  route: "M6 18a2 2 0 1 1 0 .1M18 6a2 2 0 1 1 0 .1M8 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6H16",
  sliders: "M4 7H14M18 7H20M4 17H6M10 17H20M16 5V9M8 15V19",
  reply: "M5 4V12H18M14 8L18 12L14 16",
  copy: "M8 8H19V19H8ZM5 15V5H15",
  more: "F M5 10.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3M12 10.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3M19 10.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3",
  spark: "F M12 2.5Q13.2 10.8 21.5 12Q13.2 13.2 12 21.5Q10.8 13.2 2.5 12Q10.8 10.8 12 2.5Z",
};

export function icon(g: G, kind: keyof typeof ICONS | string, cx: number, cy: number, size: number, color: string, weight = 2) {
  const d = ICONS[kind];
  if (!d) return;
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(size / 24, size / 24);
  g.lineWidth = weight;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = g.fillStyle = color;
  if (d.startsWith("F")) g.fill(new Path2D(d.slice(1)));
  else g.stroke(new Path2D(d));
  g.restore();
}

const hex = (c: string) => {
  const n = parseInt(c.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mix a hex colour towards white (t > 0) or black (t < 0). */
export function shade(c: string, t: number): string {
  const [r, g, b] = hex(c).map((v) => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t)));
  return `rgb(${r},${g},${b})`;
}

/* ---------------------------------------------------------------- art */

/** Placeholder "photo": sky, sun, two ridges and haze. Deterministic; colours set the mood. */
export const scenery = (sky: [string, string], sun: string, ridges: [string, string]): Art => (g, w, h) => {
  const sk = g.createLinearGradient(0, 0, 0, h);
  sk.addColorStop(0, sky[0]);
  sk.addColorStop(1, sky[1]);
  g.fillStyle = sk;
  g.fillRect(0, 0, w, h);
  const sg = g.createRadialGradient(w * 0.68, h * 0.38, 0, w * 0.68, h * 0.38, w * 0.5);
  sg.addColorStop(0, sun);
  sg.addColorStop(0.18, sun);
  sg.addColorStop(0.2, "rgba(255,255,255,0.25)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sg;
  g.fillRect(0, 0, w, h);
  ridges.forEach((c, i) => {
    const base = h * (0.58 + i * 0.14);
    g.beginPath();
    g.moveTo(0, h);
    for (let j = 0; j <= 48; j++) {
      const k = j / 48, x = k * w;
      g.lineTo(x, base - h * (0.08 + 0.04 * i) * (Math.sin(k * 5.1 + i * 2.3) * 0.6 + Math.sin(k * 11.7 + i) * 0.25 + 0.4));
    }
    g.lineTo(w, h);
    g.closePath();
    g.fillStyle = c;
    g.fill();
  });
};

/** Placeholder abstract: a ground with three large blurred colour fields. */
export const blobs = (ground: string, colors: [string, string, string]): Art => (g, w, h) => {
  g.fillStyle = ground;
  g.fillRect(0, 0, w, h);
  g.save();
  g.filter = `blur(${Math.round(Math.min(w, h) * 0.12)}px)`;
  const spots: [number, number, number][] = [[0.25, 0.3, 0.45], [0.8, 0.45, 0.4], [0.45, 0.85, 0.5]];
  spots.forEach(([x, y, r], i) => {
    g.fillStyle = colors[i]!;
    g.beginPath();
    g.arc(x * w, y * h, r * Math.min(w, h), 0, TAU);
    g.fill();
  });
  g.restore();
};

/** A loaded image (or video still) as art, cover-fitted and centred. */
export const photo = (img: CanvasImageSource & { width: number; height: number }): Art => (g, w, h) => {
  const k = Math.max(w / img.width, h / img.height);
  g.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k);
};

/** A pastel tile with one glossy sticker on it: thumbnails for things that have no photo. */
export const tile = (ground: string, kind: StickerKind, hue: string): Art => (g, w, h) => {
  g.fillStyle = ground;
  g.fillRect(0, 0, w, h);
  drawSticker(g, kind, w / 2, h / 2, Math.min(w, h) * 0.62, hue);
};

/**
 * Build once the images are in: loads every url through ctx.manager (the export waits), then runs
 * `build` with the images in order (a failed one is undefined: fall back to placeholder art).
 * Nest it inside withFonts so text and images are both ready before anything is drawn.
 */
export function withImages(ctx: ThreeSceneContext, urls: string[], build: (imgs: (HTMLImageElement | undefined)[]) => ThreeSceneUpdate): ThreeSceneUpdate {
  if (urls.length === 0) return build([]);
  const imgs: (HTMLImageElement | undefined)[] = [];
  let left = urls.length;
  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = `images:${urls.join(",")}`;
  ctx.manager.itemStart(key);
  const done = () => {
    if (--left > 0) return;
    update = build(imgs);
    if (last) update(last);
    ctx.manager.itemEnd(key);
  };
  const loader = new THREE.ImageLoader(ctx.manager);
  urls.forEach((u, i) => loader.load(u, (img) => ((imgs[i] = img), done()), undefined, () => done()));
  return (frame) => {
    last = frame;
    update?.(frame);
  };
}

/* ------------------------------------------------------------ stickers */

export type StickerKind = "bubble" | "heart" | "spark" | "bolt" | "leaf" | "pin" | "flag" | "ribbon";
const STICKERS: Record<StickerKind, string> = {
  bubble: "M20 22H80A12 12 0 0 1 92 34V62A12 12 0 0 1 80 74H44L26 88L29 74H20A12 12 0 0 1 8 62V34A12 12 0 0 1 20 22Z",
  heart: "M50 88C20 68 8 52 8 36A21 21 0 0 1 50 26A21 21 0 0 1 92 36C92 52 80 68 50 88Z",
  spark: "M50 6Q55 45 94 50Q55 55 50 94Q45 55 6 50Q45 45 50 6Z",
  bolt: "M58 6L18 56H46L40 94L82 42H54Z",
  leaf: "M14 86C10 46 36 12 88 10C90 60 58 90 14 86Z",
  pin: "M50 94C30 70 16 54 16 38A34 34 0 0 1 84 38C84 54 70 70 50 94Z",
  flag: "M20 8H28V94H20ZM28 12C46 4 62 22 84 14V54C62 62 46 44 28 52Z",
  ribbon: "M26 6H74A10 10 0 0 1 84 16V94L50 72L16 94V16A10 10 0 0 1 26 6Z",
};

/** A glossy, clay-like sticker drawn from simple geometry: body gradient, inner rim, specular, shadow. */
export function drawSticker(g: G, kind: StickerKind, cx: number, cy: number, size: number, hue: string) {
  const p = new Path2D(STICKERS[kind]);
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(size / 100, size / 100);
  g.shadowColor = "rgba(20,30,50,0.28)";
  g.shadowBlur = 8 * (size / 100) * 2;
  g.shadowOffsetY = 5 * (size / 100) * 2;
  g.fillStyle = hue;
  g.fill(p);
  g.shadowColor = "transparent";
  const body = g.createLinearGradient(0, 8, 0, 92);
  body.addColorStop(0, shade(hue, 0.35));
  body.addColorStop(0.55, hue);
  body.addColorStop(1, shade(hue, -0.28));
  g.fillStyle = body;
  g.fill(p);
  g.clip(p);
  g.lineWidth = 9;
  g.strokeStyle = shade(hue, -0.35);
  g.globalAlpha = 0.35;
  g.stroke(p); // inner rim: half the stroke falls inside the clip
  g.globalAlpha = 1;
  const bounce = g.createRadialGradient(72, 86, 0, 72, 86, 40);
  bounce.addColorStop(0, "rgba(255,255,255,0.28)");
  bounce.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = bounce;
  g.fillRect(0, 0, 100, 100);
  const spec = g.createRadialGradient(34, 28, 0, 34, 28, 30);
  spec.addColorStop(0, "rgba(255,255,255,0.9)");
  spec.addColorStop(0.35, "rgba(255,255,255,0.35)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = spec;
  g.beginPath();
  g.ellipse(36, 30, 24, 15, -0.5, 0, TAU);
  g.fill();
  g.restore();
}

/* ------------------------------------------------------------- the kit */

export interface KitOptions {
  shown?: number; // the phone's smallest on-screen scale while this UI is read (0.6 in a wide shot)
  floor?: number; // minimum on-screen text size in composition px (feeds: 28)
  res?: number; // canvas px per composition px: 2 x the largest zoom the screen sees
}

/** Fade anything this kit (or the type kit) made: canvas planes and labels alike. */
export function fade(obj: THREE.Object3D, o: number) {
  obj.traverse((n) => {
    const m = (n as THREE.Mesh).material as THREE.Material | undefined;
    if (!m) return;
    const u = (m as THREE.ShaderMaterial).uniforms;
    n.userData.op0 ??= u?.uOpacity ? u.uOpacity.value : m.opacity;
    if (u?.uOpacity) u.uOpacity.value = n.userData.op0 * o;
    else m.opacity = n.userData.op0 * o;
  });
  obj.visible = o > 0.001;
}

/** Size an object for put(): the box it occupies, in px. Groups need it set once. */
const box = (o: THREE.Object3D, w: number, h: number) => ((o.userData.wPx = w), (o.userData.hPx = h), o);

/**
 * The app kit for one screen: a type scale and spacing in proportion to the screen width S, with a
 * floor so no glyph is ever below `floor` px on screen; components drawn once at `res`.
 * Containers (pages, sheet panels) have their origin at their TOP-LEFT and y grows down in px;
 * components have their origin at their centre and carry their size, so put(c, x, y) places a
 * component's top-left corner at (x, y) inside a container.
 */
export function appKit(screen: { Sw: number; Sh: number }, theme: AppTheme = APP_LIGHT, o: KitOptions = {}) {
  const { Sw, Sh } = screen;
  const S = Sw;
  const T = theme;
  const res = o.res ?? 2.2;
  const floor = (o.floor ?? 28) / (o.shown ?? 1);
  const pct = (p: number) => Math.round((p * S) / 100);
  /** Type sizes in px: % of the screen width, never under the floor. */
  const type = {
    large: Math.max(floor, pct(8.8)), sheet: Math.max(floor, pct(6.6)), greet: Math.max(floor, pct(7.0)),
    detail: Math.max(floor, pct(6.1)), section: Math.max(floor, pct(4.6)), body: Math.max(floor, pct(4.8)),
    card: Math.max(floor, pct(4.6)), sub: Math.max(floor, pct(4.2)), caption: Math.max(floor, pct(3.9)),
    chip: Math.max(floor, pct(4.0)),
  };
  const sp = { pad: pct(5.4), gap: pct(2.5), cardGap: pct(3.1), section: pct(8.4), header: pct(19), content: pct(30) };
  const rad = { card: pct(4.7), list: pct(6), sheet: pct(7), toast: pct(6.7), button: pct(4.5), thumb: pct(3.4) };
  const plane = (w: number, h: number, draw: (g: G, w: number, h: number) => void, name: string) => canvasPlane(w, h, draw, name, res);

  /** A plane with a soft baked shadow around a w x h card; userData keeps the card's own size. */
  function card(w: number, h: number, draw: (g: G) => void, name: string, shadow = 0.08, blur = pct(3)): Flat {
    const pad = Math.ceil(blur * 2);
    const m = plane(w + pad * 2, h + pad * 2, (g) => {
      g.translate(pad, pad);
      if (shadow > 0) {
        g.save();
        g.shadowColor = `rgba(20,30,45,${shadow})`;
        g.shadowBlur = blur;
        g.shadowOffsetY = blur * 0.35;
        g.fillStyle = "#ffffff";
        g.fill(roundPath(0, 0, w, h, Math.min(h / 2, rad.card)));
        g.restore();
      }
      draw(g);
    }, name);
    return box(m, w, h) as Flat;
  }
  const roundPath = (x: number, y: number, w: number, h: number, r: number) => {
    const p = new Path2D();
    p.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    return p;
  };
  const hairline = (g: G, p: Path2D) => ((g.lineWidth = 2), (g.strokeStyle = T.line), g.stroke(p));

  const kit = {
    S, Sw, Sh, T, type, sp, rad, res, pct, plane, card, roundPath,

    /** A full screen: origin at the screen's top-left (add it to phone.ui). ink = status bar colour. */
    page(name: string, bg: string | Art = T.screen, ink: "dark" | "light" = "dark") {
      const g = new THREE.Group();
      g.name = name;
      g.position.set((-Sw / 2) * PX, (Sh / 2) * PX, 0);
      g.userData.ink = ink;
      const back = plane(Sw, Sh, (c, w, h) => {
        if (typeof bg === "string") ((c.fillStyle = bg), c.fillRect(0, 0, w, h));
        else bg(c, w, h);
      }, `${name}-bg`);
      back.position.set((Sw / 2) * PX, (-Sh / 2) * PX, -0.01);
      g.add(back);
      return g;
    },

    /** Place a component's top-left at (x, y) px inside a container; z orders siblings. */
    put<O extends THREE.Object3D>(parent: THREE.Object3D, obj: O, x: number, y: number, z = 0.01): O {
      const w = obj.userData.wPx ?? 0, h = obj.userData.hPx ?? 0;
      obj.position.set((x + w / 2) * PX, -(y + h / 2) * PX, z);
      obj.userData.rest = obj.position.clone();
      parent.add(obj);
      return obj;
    },

    /** Header row (menu or back, avatar or action) plus a large title: the top of most pages. */
    navBar(title: string | null, left: "menu" | "back" | null = "menu", right: string | null = null) {
      const h = title ? pct(36) : pct(25);
      return box(plane(Sw, h, (g, w) => {
        const cy = pct(19);
        if (left === "menu") icon(g, "menu", sp.pad + pct(4), cy, pct(7), T.text, 2.4);
        if (left === "back") {
          g.fillStyle = T.surface;
          g.fill(roundPath(sp.pad, cy - pct(5.3), pct(10.6), pct(10.6), pct(5.3)));
          icon(g, "back", sp.pad + pct(5.3), cy, pct(5), T.text, 2.4);
        }
        if (right) {
          g.fillStyle = T.tiles[3]!;
          g.beginPath();
          g.arc(w - sp.pad - pct(4.5), cy, pct(4.5), 0, TAU);
          g.fill();
          text(g, right, w - sp.pad - pct(4.5), cy, pct(4.2), 700, shade(T.text, 0.25), "center");
        }
        if (title) text(g, title, sp.pad, pct(31), type.large, 700, T.text);
      }, `nav-${title ?? "bar"}`), Sw, h);
    },

    /** The page colour fading out under the status bar: put() it at (0, 0) above content that scrolls. */
    scrollEdge(h = pct(24)) {
      const [r, gg, b] = hex(T.screen);
      return box(plane(Sw, h, (g, w) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0.5, T.screen);
        gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }, "scroll-edge"), Sw, h);
    },

    /** Wrapped text as one plane (a title that crossfades, a paragraph nobody streams). */
    textBlock(s: string, size: number = type.body, weight = 400, color: string = T.text, w = Sw - sp.pad * 2, align: "left" | "center" = "left") {
      const lh = Math.round(size * 1.3), lines = wrap(s, size, weight, w), h = lh * lines.length;
      const x = align === "center" ? w / 2 : 0;
      return box(plane(w, h, (g) => lines.forEach((l, i) => text(g, l, x, lh * (i + 0.5), size, weight, color, align)), `text-${slug(s)}`), w, h);
    },

    /** Two-line greeting: regular weight with **bold** runs, lh 1.24. */
    greeting(lines: string[]) {
      const lh = type.greet * 1.24;
      const h = Math.ceil(lh * lines.length);
      return box(plane(Sw - sp.pad * 2, h, (g) => lines.forEach((l, i) => text(g, l, 0, lh * (i + 0.5), type.greet, 400, T.text)), "greeting"), Sw - sp.pad * 2, h);
    },

    /** A section header with an optional right-aligned link. */
    section(title: string, link?: string) {
      const h = Math.ceil(type.section * 1.6);
      return box(plane(Sw - sp.pad * 2, h, (g, w) => {
        text(g, title, 0, h / 2, type.section, 600, T.text);
        if (link) text(g, link, w, h / 2, type.caption, 600, T.muted, "right");
      }, `section-${title}`), Sw - sp.pad * 2, h);
    },

    /** One chip: white pill, hairline, optional line icon. Each chip is its own plane (stagger them). */
    chip(label: string, ic?: string, tint?: string) {
      const h = Math.max(pct(7.8), type.chip * 1.9);
      const p = new OffscreenCanvas(4, 4).getContext("2d")!;
      font(p, type.chip, 500);
      const iw = ic ? type.chip * 1.15 : 0;
      const w = Math.ceil(p.measureText(label).width + iw + pct(3.1) * 2);
      return card(w, h, (g) => {
        const r = roundPath(0, 0, w, h, h / 2);
        g.fillStyle = tint ?? T.surface;
        g.fill(r);
        hairline(g, r);
        if (ic) icon(g, ic, pct(3.1) + type.chip * 0.45, h / 2, type.chip * 0.9, T.text, 2.2);
        text(g, label, pct(3.1) + iw, h / 2, type.chip, 500, T.text);
      }, `chip-${label}`, 0.04, pct(1.2));
    },

    /** Chips laid out in a row from x = 0; returns them in order (their positions are set). */
    chipRow(parent: THREE.Object3D, items: { label: string; icon?: string; tint?: string }[], x: number, y: number) {
      let cx = x;
      return items.map((it) => {
        const c = kit.chip(it.label, it.icon, it.tint);
        kit.put(parent, c, cx, y);
        cx += c.userData.wPx + pct(2.5);
        return c;
      });
    },

    /** Image card: art fills it, bottom 45% darkens to 55% black, white title and sub inset. */
    imageCard(w: number, h: number, art: Art, title: string, sub?: string) {
      return card(w, h, (g) => {
        const r = roundPath(0, 0, w, h, rad.card);
        g.save();
        g.clip(r);
        art(g, w, h);
        const gr = g.createLinearGradient(0, h * 0.55, 0, h);
        gr.addColorStop(0, "rgba(0,0,0,0)");
        gr.addColorStop(1, "rgba(0,0,0,0.55)");
        g.fillStyle = gr;
        g.fillRect(0, h * 0.5, w, h * 0.5);
        g.restore();
        const ix = pct(3.1);
        text(g, fit(g, title, w - ix * 2, type.card, 700), ix, h - ix - (sub ? type.caption * 1.35 : 0) - type.card * 0.5, type.card, 700, "#ffffff");
        if (sub) text(g, sub, ix, h - ix - type.caption * 0.5, type.caption, 400, "rgba(255,255,255,0.82)");
      }, `card-${title}`, 0.1);
    },

    /** Horizontal list card: thumbnail tile, muted kicker, title, meta, chevron. Peeks off the edge in a row. */
    rowCard(w: number, art: Art, kicker: string, title: string, meta: string) {
      const th = pct(21);
      const h = th + pct(3.6) * 2;
      return card(w, h, (g) => {
        const r = roundPath(0, 0, w, h, rad.list);
        g.fillStyle = T.surface;
        g.fill(r);
        hairline(g, r);
        const tx = pct(3.6);
        g.save();
        g.clip(roundPath(tx, tx, th, th, pct(3.6)));
        g.translate(tx, tx);
        art(g, th, th);
        g.restore();
        const x = tx * 2 + th, mw = w - x - pct(9);
        text(g, fit(g, kicker, mw, type.caption, 400), x, h * 0.28, type.caption, 400, T.muted);
        text(g, fit(g, title, mw, type.card, 600), x, h * 0.5, type.card, 600, T.text);
        text(g, fit(g, meta, mw, type.caption, 400), x, h * 0.72, type.caption, 400, T.muted);
        icon(g, "chevron", w - pct(5), h / 2, pct(4.4), T.muted, 2.2);
      }, `row-${title}`, 0.05);
    },

    /**
     * A grouped list: white card, hairline separators, line icon, title and muted sub per row. A row's
     * trailing control is its own pair of planes (on/off) so it can change state: fade(on, p).
     */
    listGroup(w: number, rows: { title: string; sub?: string; icon?: string; control?: "radio" | "chevron" }[]) {
      const rh = pct(15);
      const h = rh * rows.length;
      const group = new THREE.Group();
      group.name = "list-group";
      box(group, w, h);
      const bg = card(w, h, (g) => {
        const r = roundPath(0, 0, w, h, pct(4.2));
        g.fillStyle = T.surface;
        g.fill(r);
        hairline(g, r);
        rows.forEach((row, i) => {
          const y = i * rh;
          if (i > 0) ((g.fillStyle = T.line), g.fillRect(pct(3.4), y, w - pct(3.4), 2));
          const x = row.icon ? pct(14) : pct(4.2);
          if (row.icon) icon(g, row.icon, pct(7), y + rh / 2, pct(5.2), T.muted, 2);
          if (row.sub) {
            text(g, row.title, x, y + rh * 0.36, type.body, 500, T.text);
            text(g, row.sub, x, y + rh * 0.68, type.caption, 400, T.muted);
          } else text(g, row.title, x, y + rh / 2, type.body, 500, T.text);
          if (row.control === "chevron") icon(g, "chevron", w - pct(6), y + rh / 2, pct(4.4), T.muted, 2.2);
        });
      }, "list-group-bg", 0.05);
      bg.position.z = 0;
      group.add(bg);
      const d = pct(6.1);
      const controls = rows.map((row, i) => {
        if (row.control !== "radio") return null;
        const cy = -(i * rh + rh / 2) + h / 2, cx = w / 2 - pct(6.3);
        const off = plane(d + 4, d + 4, (g) => {
          g.lineWidth = 2.5;
          g.strokeStyle = "#c9ccd1";
          g.beginPath();
          g.arc(d / 2 + 2, d / 2 + 2, d / 2 - 1.5, 0, TAU);
          g.stroke();
        }, `radio-off-${i + 1}`);
        const on = plane(d + 4, d + 4, (g) => {
          g.fillStyle = T.primary;
          g.beginPath();
          g.arc(d / 2 + 2, d / 2 + 2, d / 2, 0, TAU);
          g.fill();
          icon(g, "check", d / 2 + 2, d / 2 + 2, d * 0.55, T.onPrimary, 3);
        }, `radio-on-${i + 1}`);
        off.position.set(cx * PX, cy * PX, 0.002);
        on.position.set(cx * PX, cy * PX, 0.003);
        group.add(off, on);
        return { on, off };
      });
      return { group, controls, rowH: rh };
    },

    /**
     * A text input (search pill or chat composer) that types: the query is one type-kit label revealed
     * by its x mask, a caret rides the reveal. set(chars) every frame; the caret shows while chars > 0 unless set(n, false).
     */
    input(w: number, placeholder: string, query: string, o: { icon?: string; send?: boolean } = {}) {
      const h = Math.max(pct(12), type.body * 2.4);
      const group = new THREE.Group();
      group.name = "input";
      box(group, w, h);
      const lead = o.icon ? pct(13.5) : pct(5);
      const bg = card(w, h, (g) => {
        const r = roundPath(0, 0, w, h, h / 2);
        g.fillStyle = T.surface;
        g.fill(r);
        hairline(g, r);
        if (o.icon) icon(g, o.icon, pct(7), h / 2, pct(4.4), T.muted, 2.2);
        if (o.send) icon(g, "mic", w - h * 1.25, h / 2, pct(4.4), T.muted, 2);
      }, "input-bg", 0.05);
      group.add(bg);
      const ph = plane(w - lead - h, h, (g, pw) => text(g, fit(g, placeholder, pw, type.body, 400), 0, h / 2, type.body, 400, "#8b8f95"), "input-placeholder");
      ph.position.set((-w / 2 + lead + (w - lead - h) / 2) * PX, 0, 0.002);
      group.add(ph);
      const q = label(query, { size: type.body, weight: 400, color: T.text, tracking: 0 }, "left") as Label;
      q.position.set((-w / 2 + lead) * PX, 0, 0.003);
      group.add(q);
      const caret = new THREE.Mesh(new THREE.PlaneGeometry(2.5 * PX, type.body * 1.15 * PX), new THREE.MeshBasicMaterial({ color: T.accent, transparent: true, toneMapped: false, depthWrite: false }));
      caret.name = "caret";
      caret.position.z = 0.004;
      group.add(caret);
      const sendD = h * 0.74;
      const sends = o.send
        ? [T.line, T.primary].map((fill, i) => {
            const m = plane(sendD, sendD, (g) => {
              g.fillStyle = fill;
              g.beginPath();
              g.arc(sendD / 2, sendD / 2, sendD / 2, 0, TAU);
              g.fill();
              icon(g, "up", sendD / 2, sendD / 2, sendD * 0.48, i ? T.onPrimary : "#a3a8b0", 2.6);
            }, i ? "send-active" : "send-idle");
            m.position.set((w / 2 - h / 2) * PX, 0, 0.002 + i * 0.001);
            group.add(m);
            return m;
          })
        : [];
      const widths = [...query].map((_, i) => measure(query.slice(0, i + 1), { size: type.body, weight: 400, tracking: 0 }));
      const v = new THREE.Vector3();
      const set = (chars: number, caretOn = chars > 0, active = chars > 0) => {
        const n = Math.max(0, Math.min(query.length, Math.floor(chars)));
        const x = n > 0 ? widths[n - 1]! : 0;
        fade(ph, n > 0 ? 0 : 1);
        group.updateWorldMatrix(true, true);
        v.set(x * PX + 0.5 * PX, 0, 0);
        q.localToWorld(v);
        setLabel(q, { maskX: v.x });
        fade(q, n > 0 ? 1 : 0);
        caret.position.x = (-w / 2 + lead + x + 2) * PX;
        caret.visible = caretOn;
        if (sends[1]) fade(sends[1], active ? 1 : 0);
      };
      set(0);
      return { group, set, height: h };
    },

    /** Primary button with idle, pressed, loading and success states (all planes drawn once). */
    stateButton(w: number, labels: { idle: string; loading: string; done: string }) {
      const h = Math.max(pct(14.2), type.body * 2.6);
      const group = new THREE.Group();
      group.name = "state-button";
      box(group, w, h);
      const bgPlane = (fill: string, name: string) => card(w, h, (g) => ((g.fillStyle = fill), g.fill(roundPath(0, 0, w, h, rad.button))), name, 0.12, pct(2));
      const idleBg = bgPlane(T.primary, "button-idle");
      const doneBg = bgPlane(T.success, "button-done");
      doneBg.position.z = 0.001;
      const lw = (s: string, extra: number) => {
        const p = new OffscreenCanvas(4, 4).getContext("2d")!;
        font(p, type.body, 600);
        return p.measureText(s).width + extra;
      };
      const lab = (s: string, lead: number, name: string) => {
        const tw = lw(s, lead);
        return plane(w, h, (g) => text(g, s, (w - tw) / 2 + lead, h / 2, type.body, 600, T.onPrimary), name);
      };
      const glyph = type.body * 0.9;
      const idle = lab(labels.idle, 0, "button-label-idle");
      const loading = lab(labels.loading, glyph * 1.5, "button-label-loading");
      const done = plane(w, h, (g) => {
        const tw = lw(labels.done, glyph * 1.4);
        icon(g, "check", (w - tw) / 2 + glyph * 0.5, h / 2, glyph, T.onPrimary, 3);
        text(g, labels.done, (w - tw) / 2 + glyph * 1.4, h / 2, type.body, 600, T.onPrimary);
      }, "button-label-done");
      const sd = glyph * 1.05;
      const spinner = plane(sd, sd, (g) => {
        g.lineWidth = sd * 0.12;
        g.lineCap = "round";
        g.strokeStyle = "rgba(255,255,255,0.3)";
        g.beginPath();
        g.arc(sd / 2, sd / 2, sd * 0.4, 0, TAU);
        g.stroke();
        g.strokeStyle = T.onPrimary;
        g.beginPath();
        g.arc(sd / 2, sd / 2, sd * 0.4, -Math.PI / 2, Math.PI * 0.35);
        g.stroke();
      }, "button-spinner");
      spinner.position.set((-lw(labels.loading, glyph * 1.5) / 2 + glyph * 0.5) * PX, 0, 0.003);
      [idle, loading, done].forEach((m) => (m.position.z = 0.002));
      group.add(idleBg, doneBg, idle, loading, done, spinner);
      /** press 0..1 (a 4% squeeze), loading 0..1, done 0..1, spin in radians (from the frame). */
      const set = (s: { press?: number; loading?: number; done?: number; spin?: number }) => {
        const p = s.press ?? 0, l = s.loading ?? 0, d = s.done ?? 0;
        group.scale.set(1 - 0.04 * p, 1 - 0.03 * p, 1);
        fade(doneBg, d);
        fade(idle, 1 - l);
        fade(loading, l * (1 - d));
        fade(spinner, l * (1 - d));
        spinner.rotation.z = -(s.spin ?? 0);
        fade(done, d);
      };
      set({});
      return { group, set, height: h };
    },

    /**
     * A bottom sheet. `panel` is a container (origin at its top-left, put() content into it) that the
     * flow slides; `scrim` dims the page behind (opacity 0 unless you fade it in).
     */
    sheet(top: number, o: { bg?: string; handle?: boolean; title?: string; sub?: string; close?: boolean } = {}) {
      const h = Sh - top + pct(10); // reaches past the screen bottom so no gap shows mid-slide
      const group = new THREE.Group();
      group.name = "sheet";
      group.position.set((-Sw / 2) * PX, (Sh / 2) * PX, 1);
      const scrim = new THREE.Mesh(new THREE.PlaneGeometry(Sw * PX, Sh * PX), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false }));
      scrim.position.set((Sw / 2) * PX, (-Sh / 2) * PX, -0.01);
      scrim.name = "sheet-scrim";
      fade(scrim, 0);
      const panel = new THREE.Group();
      panel.name = "sheet-panel";
      panel.userData.top = top;
      panel.position.set(0, -top * PX, 0);
      const bg = plane(Sw, h + pct(6), (g) => {
        g.shadowColor = "rgba(15,20,30,0.12)";
        g.shadowBlur = pct(5);
        g.fillStyle = o.bg ?? T.sheet;
        g.fill(roundPath(0, pct(6), Sw, h + rad.sheet, rad.sheet));
        g.shadowColor = "transparent";
        if (o.handle) ((g.fillStyle = "#c7cad0"), g.fill(roundPath(Sw / 2 - pct(5), pct(6) + pct(2), pct(10), pct(0.8), pct(0.4))));
        if (o.close) {
          const cx = Sw - sp.pad - pct(5.9), cy = pct(6) + pct(9);
          g.fillStyle = T.surface;
          g.beginPath();
          g.arc(cx, cy, pct(5.9), 0, TAU);
          g.fill();
          g.lineWidth = 2;
          g.strokeStyle = T.line;
          g.stroke();
          icon(g, "close", cx, cy, pct(4.2), T.text, 2.4);
        }
        if (o.title) text(g, o.title, sp.pad, pct(6) + pct(18), type.sheet, 700, T.text);
        if (o.sub) text(g, o.sub, sp.pad, pct(6) + pct(26.5), type.sub, 400, T.muted);
      }, "sheet-bg");
      bg.position.set((Sw / 2) * PX, (-(h + pct(6)) / 2 + pct(6)) * PX, 0);
      panel.add(bg);
      group.add(scrim, panel);
      return { group, panel, scrim, top, contentY: o.title ? pct(o.sub ? 33 : 27) : pct(6) };
    },

    /** Share-sheet avatar row: gradient circles with an initial, names under them. */
    avatarRow(people: { name: string; color: string }[]) {
      const d = pct(15), pitch = pct(18.6), h = d + type.caption * 1.9;
      const w = pitch * (people.length - 1) + d;
      return box(plane(w, h, (g) => people.forEach((p, i) => {
        const cx = i * pitch + d / 2;
        const gr = g.createLinearGradient(0, 0, 0, d);
        gr.addColorStop(0, shade(p.color, 0.25));
        gr.addColorStop(1, shade(p.color, -0.12));
        g.fillStyle = gr;
        g.beginPath();
        g.arc(cx, d / 2, d / 2, 0, TAU);
        g.fill();
        text(g, p.name.slice(0, 1).toUpperCase(), cx, d / 2, d * 0.4, 600, "#ffffff", "center");
        text(g, fit(g, p.name, pitch - 6, type.caption, 400), cx, d + type.caption * 1.05, type.caption, 400, T.text, "center");
      }), "avatar-row"), w, h);
    },

    /** Grouped action rows (copy, favourite, bookmark…): white group, text left, glyph right. */
    actions(w: number, rows: { label: string; icon: string }[]) {
      const rh = pct(11.9), h = rh * rows.length;
      return card(w, h, (g) => {
        g.fillStyle = T.surface;
        g.fill(roundPath(0, 0, w, h, pct(3.1)));
        rows.forEach((r, i) => {
          if (i) ((g.fillStyle = T.line), g.fillRect(pct(4), i * rh, w - pct(4), 2));
          text(g, r.label, pct(4.2), i * rh + rh / 2, type.sub, 400, T.text);
          icon(g, r.icon, w - pct(6), i * rh + rh / 2, pct(4), T.text, 2);
        });
      }, "actions", 0);
    },

    /** Notification banner under the status bar: app tile, app name, two-line body, "now". */
    toast(app: string, body: [string, string], tileArt: Art, when = "now") {
      const w = Sw - pct(2.7) * 2, h = Math.max(pct(22), type.sub * 4.6);
      return card(w, h, (g) => {
        g.fillStyle = T.frost;
        g.fill(roundPath(0, 0, w, h, rad.toast));
        const t = pct(9.8), tx = pct(3.6);
        g.save();
        g.clip(roundPath(tx, (h - t) / 2, t, t, pct(2.5)));
        g.translate(tx, (h - t) / 2);
        tileArt(g, t, t);
        g.restore();
        const x = tx * 2 + t;
        text(g, app, x, h * 0.27, type.sub, 600, T.text);
        text(g, when, w - pct(4.5), h * 0.27, type.caption, 400, T.muted, "right");
        text(g, fit(g, body[0], w - x - pct(4), type.sub, 400), x, h * 0.53, type.sub, 400, T.text);
        text(g, fit(g, body[1], w - x - pct(4), type.sub, 400), x, h * 0.77, type.sub, 400, T.text);
      }, "toast", 0.14, pct(3.5));
    },

    /** Dark confirmation pill with a green check, bottom centre. */
    pillToast(msg: string) {
      const p = new OffscreenCanvas(4, 4).getContext("2d")!;
      font(p, type.sub, 600);
      const h = Math.max(pct(10.9), type.sub * 2.4), w = Math.ceil(p.measureText(msg).width + h * 1.6);
      return card(w, h, (g) => {
        g.fillStyle = "#161616";
        g.fill(roundPath(0, 0, w, h, h / 2));
        g.fillStyle = "#34c759";
        g.beginPath();
        g.arc(h * 0.62, h / 2, h * 0.24, 0, TAU);
        g.fill();
        icon(g, "check", h * 0.62, h / 2, h * 0.3, "#ffffff", 3.2);
        text(g, msg, h * 1.05, h / 2, type.sub, 600, "#ffffff");
      }, "pill-toast", 0.2, pct(3));
    },

    /** The user's chat bubble: accent pill, right-aligned by the caller, wraps past 66% of S. */
    bubble(msg: string) {
      const size = type.body, padX = pct(4.6), maxW = Math.round(S * 0.66);
      const lines = wrap(msg, size, 400, maxW - padX * 2);
      const lh = size * 1.32;
      const w = Math.ceil(Math.max(...lines.map((l) => measure(l, { size, weight: 400, tracking: 0 }))) + padX * 2);
      const h = Math.ceil(lh * lines.length + pct(3.6) * 2);
      return card(w, h, (g) => {
        g.fillStyle = T.accent;
        g.fill(roundPath(0, 0, w, h, Math.min(h / 2, pct(6.4))));
        lines.forEach((l, i) => text(g, l, padX, pct(3.6) + lh * (i + 0.5), size, 400, T.onAccent));
      }, "user-bubble", 0.06);
    },

    /**
     * The assistant's answer: plain text (no bubble), one type-kit label per word so it can stream;
     * `**bold**` marks entity names. Origin at its centre; words[i].userData.rest is each word's pose.
     */
    answer(msg: string, w = Sw - sp.pad * 2) {
      const size = type.body, lh = Math.round(size * 1.42);
      const group = new THREE.Group();
      group.name = "answer";
      const tokens: { t: string; b: boolean }[] = [];
      msg.split("**").forEach((run, i) => run.split(" ").filter(Boolean).forEach((t) => tokens.push({ t, b: i % 2 === 1 })));
      const space = measure(" ", { size, weight: 400, tracking: 0 });
      let x = 0, line = 0;
      const placed = tokens.map((tk) => {
        const st = { size, weight: tk.b ? 700 : 400, color: T.text, tracking: 0 };
        const tw = measure(tk.t, st);
        if (x > 0 && x + tw > w) ((x = 0), line++);
        const m = label(tk.t, st, "left");
        const at = { x, line };
        x += tw + space;
        return { m, at };
      });
      const h = (line + 1) * lh;
      const words = placed.map(({ m, at }) => {
        m.position.set((at.x - w / 2) * PX, (h / 2 - at.line * lh - lh / 2) * PX, 0.002);
        m.userData.rest = m.position.clone();
        group.add(m);
        return m;
      });
      box(group, w, h);
      return { group, words, height: h };
    },

    /** A compact result row inside a chat answer: thumbnail, two-line title, muted meta, chevron. */
    resultRow(w: number, art: Art, title: string, meta: string) {
      const h = pct(17);
      return card(w, h, (g) => {
        const r = roundPath(0, 0, w, h, pct(3.4));
        g.fillStyle = T.surface;
        g.fill(r);
        hairline(g, r);
        const t = h - pct(3) * 2;
        g.save();
        g.clip(roundPath(pct(3), pct(3), t * 0.75, t, pct(1.7)));
        g.translate(pct(3), pct(3));
        art(g, t * 0.75, t);
        g.restore();
        const x = pct(6) + t * 0.75, mw = w - x - pct(7);
        text(g, fit(g, title, mw, type.sub, 600), x, h * 0.38, type.sub, 600, T.text);
        text(g, fit(g, meta, mw, type.caption, 400), x, h * 0.66, type.caption, 400, T.muted);
        icon(g, "chevron", w - pct(4), h / 2, pct(3.6), T.muted, 2.2);
      }, `result-${title}`, 0.04);
    },

    /** A follow-up suggestion row: reply glyph and muted text. One plane each, so they stagger. */
    followUp(msg: string) {
      const h = Math.round(type.body * 1.9), w = Sw - sp.pad * 2;
      return box(plane(w, h, (g) => {
        icon(g, "reply", type.body * 0.5, h / 2, type.body * 0.8, T.muted, 2);
        text(g, fit(g, msg, w - type.body * 1.4, type.body, 400), type.body * 1.4, h / 2, type.body, 400, T.muted);
      }, `follow-${msg}`), w, h);
    },

    /** Library card: a 2x2 mosaic, "N saves" caption with a folder glyph, a semibold name. */
    collection(w: number, tiles: [Art, Art, Art, Art], name: string, count: string) {
      const m = pct(2.4), tw = (w - m * 3) / 2, th = tw * 1.05, h = Math.round(m * 2 + th * 2 + type.caption * 1.8 + type.card * 2.6);
      return card(w, h, (g) => {
        const r = roundPath(0, 0, w, h, pct(5.6));
        g.fillStyle = T.surface;
        g.fill(r);
        hairline(g, r);
        tiles.forEach((a, i) => {
          const x = m + (i % 2) * (tw + m), y = m + Math.floor(i / 2) * (th + m);
          g.save();
          g.clip(roundPath(x, y, tw, th, pct(2.6)));
          g.translate(x, y);
          a(g, tw, th);
          g.restore();
        });
        const y0 = m * 2 + th * 2;
        icon(g, "folder", m + type.caption * 0.5, y0 + type.caption * 0.9, type.caption * 0.9, T.muted, 2);
        text(g, count, m + type.caption * 1.3, y0 + type.caption * 0.9, type.caption, 400, T.muted);
        wrap(name, type.card, 600, w - m * 2).slice(0, 2).forEach((l, i) => text(g, l, m, y0 + type.caption * 1.8 + type.card * (0.75 + i * 1.2), type.card, 600, T.text));
      }, `collection-${name}`, 0.05);
    },

    /** Detail hero: the art blown up and blurred into the page colour, with a floating portrait card. */
    hero(art: Art, height = Math.round(Sh * 0.45)) {
      const group = new THREE.Group();
      group.name = "hero";
      box(group, Sw, height);
      const back = plane(Sw, height, (g, w, h) => {
        g.save();
        g.filter = `blur(${pct(8)}px)`;
        g.translate(-w * 0.2, -h * 0.15);
        art(g, w * 1.4, h * 1.3);
        g.restore();
        const fadeOut = g.createLinearGradient(0, h * 0.35, 0, h);
        const [r, gg, b] = hex(T.screen);
        fadeOut.addColorStop(0, `rgba(${r},${gg},${b},0)`);
        fadeOut.addColorStop(1, T.screen);
        g.fillStyle = fadeOut;
        g.fillRect(0, 0, w, h);
      }, "hero-backdrop");
      const cw = pct(37.4), ch = Math.round(cw * 1.6);
      const floatCard = card(cw, ch, (g) => {
        g.save();
        g.clip(roundPath(0, 0, cw, ch, pct(3.4)));
        art(g, cw, ch);
        g.restore();
      }, "hero-card", 0.22, pct(4));
      floatCard.position.set(0, ((height / 2) - pct(22) - ch / 2) * PX, 0.002);
      group.add(back, floatCard);
      return { group, card: floatCard };
    },

    /** A step or takeaway list: accent numbered dots (or glyphs), bold lead-in, wrapped text. One plane per item. */
    steps(items: { lead?: string; text: string }[], numbered = true) {
      const w = Sw - sp.pad * 2, size = type.body, lh = Math.round(size * 1.38), ind = Math.round(size * 1.6);
      return items.map((it, i) => {
        const lines = wrap(`${it.lead ? `**${it.lead}** ` : ""}${it.text}`, size, 400, w - ind);
        const h = lh * lines.length;
        return box(plane(w, h, (g) => {
          if (numbered) {
            g.fillStyle = T.accent;
            g.beginPath();
            g.arc(size * 0.5, lh / 2, size * 0.5, 0, TAU);
            g.fill();
            text(g, String(i + 1), size * 0.5, lh / 2, size * 0.62, 700, T.onAccent, "center");
          } else icon(g, "spark", size * 0.5, lh / 2, size * 0.9, T.accent);
          lines.forEach((l, j) => text(g, l, ind, lh * (j + 0.5), size, 400, T.text)); // keep a lead-in on line 1
        }, `step-${i + 1}`), w, h);
      });
    },
  };
  return kit;
}

/** Greedy word wrap with the kit's canvas metrics (markup kept in the output). */
export function wrap(s: string, size: number, weight: number, maxW: number): string[] {
  const p = new OffscreenCanvas(4, 4).getContext("2d")!;
  font(p, size, weight);
  const out: string[] = [];
  let cur = "";
  for (const word of s.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && p.measureText(next.replace(/\*\*/g, "")).width > maxW) {
      out.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/** A sticker as its own plane (origin at its centre, room for the shadow): pop and tilt it. */
export function sticker(kind: StickerKind, size: number, hue: string, res = 2.2): Flat {
  const pad = size * 0.2;
  const m = canvasPlane(size + pad * 2, size + pad * 2, (g) => drawSticker(g, kind, pad + size / 2, pad + size / 2, size, hue), `sticker-${kind}`, res);
  m.userData.wPx = size;
  m.userData.hPx = size;
  return m;
}
```

## 3. API

| Call | Gives | Notes |
| --- | --- | --- |
| `appKit(spec, theme?, { shown, floor, res })` | the kit `k` | `spec` is `ph.spec` (or `phoneSpec(W)` for UI on the stage). `k.type`, `k.sp`, `k.rad`, `k.pct(p)` are the scale, spacing, radii and `p`% of S |
| `k.page(name, bg?, ink?)` | container | Full screen; `bg` a colour or `Art`; `ink` "light" for dark pages (status bar turns white) |
| `k.put(parent, c, x, y, z?)` | `c` | Place by top-left px; z orders siblings |
| `k.navBar(title?, left?, right?)` | plane | Menu or back circle, avatar initial, large title (8.8% S, 700) |
| `k.greeting(lines)` | plane | 7% S, lh 1.24, `**bold**` runs |
| `k.section(title, link?)` | plane | 4.6% S semibold, optional muted link right |
| `k.textBlock(s, size?, weight?, color?, w?, align?)` | plane | Wrapped text as one plane: titles that crossfade, an empty-state line |
| `k.chip(label, icon?, tint?)`, `k.chipRow(parent, items, x, y)` | plane(s) | White pill, hairline, line icon; tint for the selected one |
| `k.imageCard(w, h, art, title, sub?)` | plane | Art fills, bottom 45% darkens to 55% black, white title and caption inset 3.1% S |
| `k.rowCard(w, art, kicker, title, meta)` | plane | Horizontal card: thumbnail tile, three lines, chevron |
| `k.listGroup(w, rows)` | `{ group, controls[], rowH }` | Rows 15% S tall; `control: "radio"` rows get `{ on, off }` planes to crossfade (3f) |
| `k.input(w, placeholder, query, { icon, send })` | `{ group, set(chars, caret?, active?), height }` | Types `query` by revealing it; caret rides the reveal; with `send`, the circle turns active while typing |
| `k.stateButton(w, { idle, loading, done })` | `{ group, set({ press, loading, done, spin }), height }` | Rounded rectangle (radius 4.5% S), not a pill; pose it with `buttonPose` |
| `k.sheet(top, { bg, handle, title, sub, close })` | `{ group, panel, scrim, top, contentY }` | `panel` is a container; it reaches past the screen bottom so no gap shows mid-slide |
| `k.avatarRow(people)`, `k.actions(w, rows)` | plane | Share-sheet parts: 15% S circles on an 18.6% pitch; grouped action rows |
| `k.toast(app, [line1, line2], tileArt, when?)` | plane | Frosted banner, inset 2.7% S, top at 15% S |
| `k.pillToast(msg)` | plane | Dark pill with a green check |
| `k.bubble(msg)` | plane | Accent pill, wraps past 66% of S |
| `k.answer(msg, w?)` | `{ group, words[], height }` | One label per word for `streamPose`; `**bold**` entity names |
| `k.resultRow(w, art, title, meta)`, `k.followUp(msg)` | plane | The answer's evidence and next questions |
| `k.collection(w, [a, b, c, d], name, count)` | plane | Library card: 2 × 2 mosaic, count, two-line name |
| `k.hero(art, height?)` | `{ group, card }` | Ambient blurred backdrop fading into the page, floating portrait card |
| `k.steps(items, numbered?)` | planes | Accent numbered dots (or spark glyphs), bold lead-in |
| `k.scrollEdge()` | plane | The page colour fading out under the status bar; put it above content that scrolls |
| `fade(obj, o)` | — | Opacity for planes and labels alike |
| `icon(g, kind, cx, cy, size, color)`, `text(g, s, x, y, size, weight, color, align?)`, `wrap(...)`, `fit(...)` | — | Drawing helpers for your own components |
| `scenery`, `blobs`, `tile`, `photo` | `Art` | Placeholder landscape, colour fields, pastel tile with a sticker, a loaded image cover-fitted |
| `withImages(ctx, urls, build)` | update | Load images through `ctx.manager`, then build |
| `sticker(kind, size, hue)`, `drawSticker(g, …)` | plane | Glossy original stickers: bubble, heart, spark, bolt, leaf, pin, flag, ribbon |

## 4. A full home page

From the tested 6 s scene (`screen-flows.md` §4): every block is its own plane, so the build can stagger; the screen is filled top to bottom (greeting, chips, a carousel of image cards peeking off the edge, a "near you" row, the composer above the home indicator) so no lower half sits empty.

```ts
const k = appKit(ph.spec);
const { pad } = k.sp;
const lake = scenery(["#9cc7e8", "#e8eef0"], "#fff6d8", ["#5f8a7a", "#2f5a4c"]);
const home = k.page("home");
const blocks: THREE.Object3D[] = [];
const add = (o: THREE.Object3D, x: number, y: number) => (blocks.push(k.put(home, o, x, y)), o);
add(k.navBar(null, "menu", "A"), 0, 0);
add(k.greeting(["Good morning, **Ana**.", "Where are we walking?"]), pad, k.pct(27));
k.chipRow(home, [{ label: "Nearby", icon: "pin" }, { label: "Shaded", icon: "leaf" }], pad, k.pct(48)).forEach((c) => blocks.push(c));
add(k.section("Saved trails", "See all"), pad, k.pct(61.5));
const cw = Math.round(k.S * 0.47), ch = Math.round(k.S * 0.56);
add(k.imageCard(cw, ch, lake, "Lakeside Loop", "4.2 km · 1 h 20"), pad, k.pct(70.5));
ph.ui.add(home);
// per frame: staggerIn(blocks, frame, 6, 2, 8, 20); ...; ph.render(home);
```

Vertical rhythm at S = 716: header row centre at 19% S, greeting from 27%, chips at 48%, section at 61.5%, cards at 70.5% (0.47 S × 0.56 S, the second peeking off the right edge), the next section at 131%, row cards at 139.5%, the composer 10% S above the screen bottom.

## 5. Real screenshots and photos

```ts
import shotUrl from "../assets/home-screen.png";
import photoUrl from "../assets/trail.jpg";
// builder
return withFonts(ctx, fonts, () => withImages(ctx, [shotUrl, photoUrl], ([shot, pic]) => {
  const k = appKit(ph.spec);
  const home = k.page("home", shot ? photo(shot) : k.T.screen);  // the screenshot is the page
  ph.set({ status: false });                                       // it carries its own status bar
  const card = k.imageCard(337, 400, pic ? photo(pic) : lake, "Lakeside Loop");
  // ...
  return ({ frame }) => { /* ... */ ph.render(home); };
}));
```

- A screenshot used as a page must have the screen's aspect (`Sw / Sh` ≈ 0.462 portrait): crop it with `ffmpeg` first; `photo()` cover-fits and would cut a mismatched one.
- Re-draw over a screenshot only to animate a part of it (a button changing state): put the drawn component exactly over the screenshot's control.
- A failed image arrives as `undefined`: fall back to placeholder art so the frame is never blank.

## 6. Stickers

Original, procedural, glossy: each is a simple path (a speech bubble, a heart, a four-point spark, a bolt, a leaf, a map pin, a flag, a ribbon) filled with a top-light gradient, a darker inner rim, a soft bounce light at the bottom right, a specular highlight at the top left and a soft drop shadow. They are not copies of any emoji set: never trace or import one. Choose the sticker that matches the shot (a ribbon on save, a bubble on a message, a spark on an AI answer) and its hue from the film's palette. Motion: `stickerPose` in `flows.ts`.
