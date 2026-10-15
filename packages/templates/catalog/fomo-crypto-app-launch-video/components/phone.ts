/**
 * The phone: a flat device (metal rim, dark bezel, rounded screen) whose screen
 * is drawn in code onto canvases, in iOS points, at 3×.
 *
 * Measured off the reference: at scale 1 the device is 681 px wide, the rim
 * 9 px, the screen inset 21 px (393 pt across 639 px → 1.626 px/pt).
 *
 * The screen is three layers so lists can scroll under a fixed header:
 *   header  (top, opaque)   status bar + tab pills
 *   list    (scrolls)       rows, drawn as tall as they need to be
 *   footer  (bottom, alpha) a tab bar or anything pinned to the bottom
 */
import * as THREE from "three";
import { FAMILY } from "./brand";

export const PHONE_W = 681;
export const PHONE_H = 1427;
export const RIM = 9;
export const INSET = 21;
export const SCREEN_W = PHONE_W - 2 * INSET; // 639 px
export const PT = SCREEN_W / 393; // px per pt
export const SCREEN_PT_H = (PHONE_H - 2 * INSET) / PT;
const RES = 3; // canvas px per pt

export const UI = {
  screen: "#060411",
  white: "#ffffff",
  sub: "#aeacbd",
  tab: "#aba9b7",
  pillActive: "#191726",
  pillLine: "#17151f",
  chip: "#262433",
  green: "#22c56f",
  red: "#e0494e",
  badge: "#5865f2",
};

export type Painter = (g: OffscreenCanvasRenderingContext2D, wPt: number, hPt: number) => void;

export interface Layer {
  canvas: OffscreenCanvas;
  tex: THREE.CanvasTexture;
  hPt: number;
}

export function layer(hPt: number, paint: Painter, transparent = false): Layer {
  const canvas = new OffscreenCanvas(393 * RES, Math.ceil(hPt * RES));
  const g = canvas.getContext("2d")!;
  g.scale(RES, RES);
  if (!transparent) {
    g.fillStyle = UI.screen;
    g.fillRect(0, 0, 393, hPt);
  }
  paint(g, 393, hPt);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { canvas, tex, hPt };
}

/** Redraw a layer in place (used sparingly: for state changes, never per frame). */
export function repaint(l: Layer, paint: Painter, transparent = false) {
  const g = l.canvas.getContext("2d")!;
  g.setTransform(RES, 0, 0, RES, 0, 0);
  g.clearRect(0, 0, 393, l.hPt);
  if (!transparent) {
    g.fillStyle = UI.screen;
    g.fillRect(0, 0, 393, l.hPt);
  }
  paint(g, 393, l.hPt);
  l.tex.needsUpdate = true;
}

// ── drawing helpers (pt units) ─────────────────────────────────────────────
export function font(g: OffscreenCanvasRenderingContext2D, sizePt: number, weight = 500) {
  g.font = `${weight} ${sizePt}px "${FAMILY}", "Helvetica Neue", Helvetica, Arial, sans-serif`;
}
export function txt(
  g: OffscreenCanvasRenderingContext2D,
  s: string,
  x: number,
  base: number,
  size: number,
  color: string,
  weight = 500,
  align: CanvasTextAlign = "left",
) {
  font(g, size, weight);
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = "alphabetic";
  g.fillText(s, x, base);
}
export function rrect(g: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
export function image(g: OffscreenCanvasRenderingContext2D, img: CanvasImageSource | undefined, cx: number, cy: number, size: number) {
  if (!img) return;
  g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
}

/** iOS status bar: 9:41, island, signal, wifi, battery. */
export function statusBar(g: OffscreenCanvasRenderingContext2D) {
  txt(g, "9:41", 52.9, 37.2, 17.1, UI.white, 500);
  g.fillStyle = "#000000";
  rrect(g, 134, 14.5, 121.7, 35, 17.5);
  g.fill();
  // signal: four rising bars
  g.fillStyle = UI.white;
  const bx = 280.5, base = 37.5;
  [4.2, 6.4, 8.6, 10.8].forEach((h, i) => {
    rrect(g, bx + i * 4.6, base - h, 3, h, 0.9);
    g.fill();
  });
  // wifi: three arcs + dot
  const wx = 309.5, wy = 37.2;
  g.strokeStyle = UI.white;
  g.lineCap = "round";
  g.lineWidth = 2.1;
  for (const r of [8.6, 5.4]) {
    g.beginPath();
    g.arc(wx, wy, r, -Math.PI * 0.75, -Math.PI * 0.25);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(wx, wy);
  g.arc(wx, wy, 2.6, -Math.PI * 0.75, -Math.PI * 0.25);
  g.closePath();
  g.fill();
  // battery
  rrect(g, 327.5, 26.8, 24.5, 11.6, 3.4);
  g.fill();
  g.globalAlpha = 0.45;
  rrect(g, 352.8, 30.4, 1.6, 4.4, 0.8);
  g.fill();
  g.globalAlpha = 1;
}

export const TAB_PILLS: [string, number, number, number][] = [
  // label, pill x0, pill x1, text origin x (pt)
  ["All", 25, 52, 32.9],
  ["Tokens", 61.3, 116.1, 67.7],
  ["Traders", 125, 183, 131],
  ["Clans", 192, 240, 199.6],
];

/** The All / Tokens / Traders / Clans pills, `active` lit. */
export function tabPills(g: OffscreenCanvasRenderingContext2D, active: number) {
  TAB_PILLS.forEach(([label, x0, x1, tx], i) => {
    rrect(g, x0, 72.5, x1 - x0, 23, 7.5);
    if (i === active) {
      g.fillStyle = UI.pillActive;
      g.fill();
    } else {
      g.strokeStyle = UI.pillLine;
      g.lineWidth = 1;
      g.stroke();
    }
    txt(g, label, tx, 88.3, 12.9, i === active ? UI.white : UI.tab, 500);
  });
}

// ── the device ─────────────────────────────────────────────────────────────
const VERT = /* glsl */ `
  varying vec2 vP;
  varying vec2 vScreen;
  void main() {
    vP = position.xy;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vScreen = vec2((clip.x / clip.w * 0.5 + 0.5) * 1280.0, (0.5 - clip.y / clip.w * 0.5) * 720.0);
    gl_Position = clip;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uHeader;
  uniform sampler2D uHeader2;
  uniform float uHeaderMix;  // 0 = uHeader, 1 = uHeader2
  uniform vec3 uReveal;      // rows fade in: (frames since start, stagger per row, duration); z = 0 disables
  uniform float uRowH;       // pt
  uniform vec3 uHideAv;      // hide row avatars: (rows, centre x pt, centre y pt of row 0); x = 0 disables
  uniform float uGlassBlur;  // pt
  uniform sampler2D uList;
  uniform sampler2D uFooter;
  uniform float uHeaderH;   // pt
  uniform float uListH;     // pt
  uniform float uFooterH;   // pt (0 = none)
  uniform float uScroll;    // pt
  uniform vec2 uSize;       // device px
  uniform float uOpacity;
  uniform float uBlur;      // px
  uniform vec2 uFade;       // along uFadeDir in composition px: alpha 1 at x → 0 at y (x >= y disables)
  uniform vec2 uFadeDir;
  uniform float uPT;
  uniform float uInset;
  uniform float uRim;
  uniform float uRadius;
  varying vec2 vP;
  varying vec2 vScreen;

  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  vec3 listAt(vec2 sp) {
    vec3 bg = vec3(0.0235, 0.0157, 0.0667);
    if (sp.y < uHeaderH) {
      vec2 hu = vec2(sp.x / 393.0, 1.0 - sp.y / uHeaderH);
      vec3 h1 = texture2D(uHeader, hu).rgb;
      if (uHeaderMix <= 0.0) return h1;
      return mix(h1, texture2D(uHeader2, hu).rgb, uHeaderMix);
    }
    vec3 c = bg;
    float ly = sp.y - uHeaderH + uScroll;
    if (ly >= 0.0 && ly < uListH) {
      c = texture2D(uList, vec2(sp.x / 393.0, 1.0 - ly / uListH)).rgb;
      float r = floor(ly / uRowH);
      if (uHideAv.x > 0.0 && r < uHideAv.x && length(vec2(sp.x, ly) - vec2(uHideAv.y, uHideAv.z + r * uRowH)) < 23.5) c = bg;
      if (uReveal.z > 0.0) c = mix(bg, c, clamp((uReveal.x - r * uReveal.y) / uReveal.z, 0.0, 1.0));
    }
    return c;
  }
  vec3 screenAt(vec2 sp) {           // sp in pt, y down from the screen top
    vec3 c = listAt(sp);
    if (uFooterH > 0.0) {
      float screenH = (uSize.y - 2.0 * uInset) / uPT;
      float fy = sp.y - (screenH - uFooterH);
      if (fy >= 0.0) {
        vec4 f = texture2D(uFooter, vec2(sp.x / 393.0, 1.0 - fy / uFooterH));
        if (f.a > 0.0) {
          // frosted glass: blur what is under the footer's translucent shapes
          vec3 b = vec3(0.0);
          for (int i = -2; i <= 2; i++)
            for (int j = -2; j <= 2; j++) b += listAt(sp + vec2(float(i), float(j)) * uGlassBlur * 0.5);
          b /= 25.0;
          c = mix(b, f.rgb, f.a);
        }
      }
    }
    return c;
  }
  void main() {
    vec2 p = vP;                                  // px, centre origin, y up
    vec2 top = vec2(p.x + uSize.x * 0.5, uSize.y * 0.5 - p.y); // px from top-left
    float soft = 0.75 + uBlur;
    float dOuter = sdRound(p, uSize * 0.5, uRadius);
    float a = 1.0 - smoothstep(-soft, soft, dOuter);
    if (a <= 0.0) discard;
    // rim: lighter at the very edge
    float depth = -dOuter;
    vec3 rimOut = vec3(0.302, 0.333, 0.651);
    vec3 rimIn = vec3(0.216, 0.231, 0.482);
    vec3 col = mix(rimOut, rimIn, smoothstep(0.0, uRim, depth));
    float dBezel = sdRound(p, uSize * 0.5 - uRim, uRadius - uRim);
    col = mix(col, vec3(0.071, 0.051, 0.188), 1.0 - smoothstep(-0.75, 0.75, dBezel));
    float dScreen = sdRound(p, uSize * 0.5 - uInset, uRadius - uInset);
    float inScreen = 1.0 - smoothstep(-0.75 - uBlur, 0.75 + uBlur, dScreen);
    if (inScreen > 0.0) {
      vec2 sp = (top - uInset) / uPT;
      vec3 sc;
      if (uBlur < 0.3) sc = screenAt(sp);
      else {
        sc = vec3(0.0);
        float b = uBlur / uPT;
        for (int i = -2; i <= 2; i++)
          for (int j = -2; j <= 2; j++) sc += screenAt(sp + vec2(float(i), float(j)) * b * 0.5);
        sc /= 25.0;
      }
      col = mix(col, sc, inScreen);
    }
    float fade = uFade.x < uFade.y ? 1.0 - smoothstep(uFade.x, uFade.y, dot(vScreen, uFadeDir)) : 1.0;
    gl_FragColor = vec4(col, a * uOpacity * fade);
  }
`;

export interface Phone extends THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {}

export function phone(header: Layer, list: Layer, footer?: Layer, name = "phone"): Phone {
  const empty = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  empty.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uHeader: { value: header.tex },
      uHeader2: { value: header.tex },
      uHeaderMix: { value: 0 },
      uReveal: { value: new THREE.Vector3(0, 0, 0) },
      uRowH: { value: 62 },
      uHideAv: { value: new THREE.Vector3(0, 0, 0) },
      uGlassBlur: { value: 6 },
      uList: { value: list.tex },
      uFooter: { value: footer?.tex ?? empty },
      uHeaderH: { value: header.hPt },
      uListH: { value: list.hPt },
      uFooterH: { value: footer?.hPt ?? 0 },
      uScroll: { value: 0 },
      uSize: { value: new THREE.Vector2(PHONE_W, PHONE_H) },
      uOpacity: { value: 1 },
      uBlur: { value: 0 },
      uFade: { value: new THREE.Vector2(1, 0) },
      uFadeDir: { value: new THREE.Vector2(0, 1) },
      uPT: { value: PT },
      uInset: { value: INSET },
      uRim: { value: RIM },
      uRadius: { value: 130 },
    },
  });
  // the canvases are sRGB; sample them raw so UI hexes land exactly
  for (const l of [header, list, footer]) if (l) l.tex.colorSpace = THREE.NoColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(PHONE_W, PHONE_H), mat) as Phone;
  m.name = name;
  m.renderOrder = 50;
  return m;
}

/** Phone-local position (px at scale 1) of a point given in screen pt. */
export function ptLocal(xPt: number, yPt: number): [number, number] {
  return [-PHONE_W / 2 + INSET + xPt * PT, PHONE_H / 2 - INSET - yPt * PT];
}

/** Place the phone by its top edge centre (composition px, y down) and scale. */
export function placePhone(p: Phone, cx: number, top: number, scale: number) {
  p.scale.setScalar(scale);
  p.position.set(cx - 640, 360 - (top + (PHONE_H / 2) * scale), 0);
}
