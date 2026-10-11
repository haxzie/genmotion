/**
 * Screens as props: a web page drawn once into a canvas, shown on a plane
 * whose shader does the film's "targeted focus" — everything outside a focus
 * rectangle is blurred (mip-level disk blur), desaturated, cooled and sunk
 * into the dark, so the eye has nowhere to go but the one thing that matters.
 */
import * as THREE from "three";
import { FONT, PX } from "./core";

export interface Rect { x: number; y: number; w: number; h: number }
type G = OffscreenCanvasRenderingContext2D;

export interface TextOpts {
  size: number;
  weight?: number;
  color: string;
  align?: "left" | "center" | "right";
}

/** A tiny immediate-mode UI painter in page px. */
export class Kit {
  rects: Record<string, Rect> = {};
  constructor(public g: G, public w: number, public h: number) {}

  font(size: number, weight = 400) {
    this.g.font = `${weight} ${size}px ${FONT}`;
  }
  measure(s: string, size: number, weight = 400) {
    this.font(size, weight);
    return this.g.measureText(s).width;
  }
  /** Text whose vertical centre is `y`. Returns its box. */
  text(s: string, x: number, y: number, o: TextOpts): Rect {
    const g = this.g;
    this.font(o.size, o.weight ?? 400);
    g.fillStyle = o.color;
    g.textBaseline = "middle";
    g.textAlign = o.align ?? "left";
    g.fillText(s, x, y);
    const w = g.measureText(s).width;
    const left = o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x;
    return { x: left, y: y - o.size * 0.6, w, h: o.size * 1.2 };
  }
  rect(x: number, y: number, w: number, h: number, fill: string, r = 0, stroke?: string, lw = 1): Rect {
    const g = this.g;
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    if (fill !== "none") {
      g.fillStyle = fill;
      g.fill();
    }
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = lw;
      g.stroke();
    }
    return { x, y, w, h };
  }
  circle(cx: number, cy: number, r: number, fill: string, stroke?: string, lw = 1.5) {
    const g = this.g;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    if (fill !== "none") {
      g.fillStyle = fill;
      g.fill();
    }
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = lw;
      g.stroke();
    }
  }
  /** A button; its rect is registered under `name`. */
  button(name: string, label: string, x: number, y: number, o: {
    h?: number; size?: number; padX?: number; fill: string; ink: string; r?: number; stroke?: string; weight?: number; w?: number;
  }): Rect {
    const h = o.h ?? 48;
    const size = o.size ?? 18;
    const weight = o.weight ?? 600;
    const w = o.w ?? this.measure(label, size, weight) + (o.padX ?? 26) * 2;
    this.rect(x, y, w, h, o.fill, o.r ?? h / 2, o.stroke, 1.5);
    this.text(label, x + w / 2, y + h / 2 + 1, { size, weight, color: o.ink, align: "center" });
    const r = { x, y, w, h };
    this.rects[name] = r;
    return r;
  }
  mark(name: string, r: Rect) {
    this.rects[name] = r;
    return r;
  }
  line(x1: number, y1: number, x2: number, y2: number, color: string, lw = 1) {
    const g = this.g;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokeStyle = color;
    g.lineWidth = lw;
    g.stroke();
  }
}

/* ------------------------------------------------------------ the shader */

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/*
 * A lens, not a mask. The focal region is a rectangle (the button, the line);
 * blur radius grows continuously with distance from it — vertical distance
 * counts fully, horizontal distance only partly, the way a camera tilted at a
 * screen holds a band in focus. The blur is a 40-tap golden-angle disc in linear
 * light (a real bokeh shape, no blocky mips), and the light falls off gently
 * with defocus instead of being cut out by a dark overlay.
 */
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec2 uSize;      // page size in px
uniform vec2 uTexel;     // 1 / texture size
uniform float uTexScale; // texture px per page px
uniform vec4 uFocus;     // x0, y0, x1, y1 in page px (top-left origin)
uniform float uRange;    // page px from the focal region to full defocus
uniform float uMaxR;     // blur radius at full defocus, page px
uniform float uAniso;    // weight of horizontal distance (1 = round, <1 = focal band)
uniform float uWorld;    // 1: measure focus from the world origin instead (the wall)
uniform float uDim;      // brightness at full defocus
uniform float uSat;      // saturation at full defocus
uniform vec3 uTint;
uniform float uExposure;
uniform float uOpacity;
uniform vec4 uHi;        // a selection painted into the page (x0, y0, x1, y1 page px); x1 <= x0 = off
uniform vec3 uHiColor;
uniform float uBgLum;    // the page's background luminance, to tell ink from paper
varying vec2 vUv;
varying vec3 vWorld;

// the selection lives in the page, so it goes out of focus with it
vec3 sel(vec2 uv, vec3 c) {
  vec2 p = vec2(uv.x, 1.0 - uv.y) * uSize;
  if (p.x < uHi.x || p.x > uHi.z || p.y < uHi.y || p.y > uHi.w) return c;
  float ink = clamp(abs(dot(c, vec3(0.2126, 0.7152, 0.0722)) - uBgLum) * 1.25, 0.0, 1.0);
  return mix(uHiColor, vec3(1.0), ink);
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  float d;
  if (uWorld > 0.5) {
    d = length(vWorld.xy * vec2(uAniso, 1.0)) * 100.0;
  } else {
    vec2 c = 0.5 * (uFocus.xy + uFocus.zw);
    vec2 hs = 0.5 * (uFocus.zw - uFocus.xy);
    vec2 q = max(abs(p - c) - hs, 0.0);
    d = length(q * vec2(uAniso, 1.0));
  }
  float t = clamp(d / max(uRange, 1.0), 0.0, 1.0);
  float coc = pow(t, 0.62);                                // fast off the focal plane, easing out far away
  float R = coc * uMaxR * uTexScale;                       // radius in texture px

  vec3 col;
  if (R < 0.6) {
    col = sel(vUv, texture(map, vUv).rgb);
  } else {
    const int N = 40;
    float lod = log2(max(1.0, R * 0.36));
    // interleaved gradient noise rotates the kernel per pixel: no rings, no banding
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float rot = ign * 6.2831853;
    vec3 acc = vec3(0.0);
    for (int i = 0; i < N; i++) {
      float fi = float(i) + 0.5;
      float r = sqrt(fi / float(N)) * R;
      float a = fi * 2.3999632 + rot;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
      acc += sel(uv, textureLod(map, uv, lod).rgb);
    }
    col = acc / float(N);
  }

  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, mix(1.0, uSat, coc));
  col *= mix(1.0, uDim, coc);
  col *= uTint * uExposure;
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}`;

export interface Page {
  mesh: THREE.Mesh;
  u: {
    focus: THREE.Vector4; range: { value: number }; maxR: { value: number }; aniso: { value: number }; world: { value: number };
    dim: { value: number }; sat: { value: number }; tint: THREE.Color; exposure: { value: number }; opacity: { value: number };
    hi: THREE.Vector4; bgLum: { value: number };
  };
  w: number;
  h: number;
  rects: Record<string, Rect>;
  /** Page px → the page mesh's local space. */
  local(px: number, py: number, z?: number): THREE.Vector3;
  /** Set the focus rectangle around `r`, grown by `pad` px. */
  setFocus(r: Rect, pad?: number): void;
  /**
   * The lens, in screen terms. `depth` 0 = everything sharp, 1 = the film's
   * shallowest depth of field. Blur and falloff are given in composition px,
   * so the look holds at any zoom.
   */
  lens(r: Rect, pad: number, zoom: number, depth: number, o?: { rangePx?: number; blurPx?: number; aniso?: number }): void;
}

export const LENS = { rangePx: 620, blurPx: 26, aniso: 0.4, dim: 0.58, sat: 0.55 };

/** Interpolate two rects (for a focus that narrows). */
export function mixRect(a: Rect, b: Rect, t: number): Rect {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t };
}

export function makePage(name: string, w: number, h: number, scale: number, draw: (k: Kit) => void): Page {
  const canvas = new OffscreenCanvas(Math.round(w * scale), Math.round(h * scale));
  const g = canvas.getContext("2d")!;
  g.scale(scale, scale);
  const kit = new Kit(g, w, h);
  draw(kit);

  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;

  const u = {
    focus: new THREE.Vector4(0, 0, w, h),
    range: { value: 600 },
    maxR: { value: 0 },
    aniso: { value: LENS.aniso },
    world: { value: 0 },
    dim: { value: 1 },
    sat: { value: 1 },
    tint: new THREE.Color(0.8, 0.9, 1.0),
    exposure: { value: 1 },
    opacity: { value: 1 },
    hi: new THREE.Vector4(0, 0, 0, 0),
    bgLum: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      uSize: { value: new THREE.Vector2(w, h) },
      uTexel: { value: new THREE.Vector2(1 / canvas.width, 1 / canvas.height) },
      uTexScale: { value: canvas.width / w },
      uFocus: { value: u.focus },
      uRange: u.range,
      uMaxR: u.maxR,
      uAniso: u.aniso,
      uWorld: u.world,
      uDim: u.dim,
      uSat: u.sat,
      uTint: { value: u.tint },
      uExposure: u.exposure,
      uOpacity: u.opacity,
      uHi: { value: u.hi },
      uHiColor: { value: new THREE.Color(HILITE) },
      uBgLum: u.bgLum,
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * PX, h * PX), mat);
  mesh.name = name;
  mesh.renderOrder = 0;

  return {
    mesh,
    u,
    w,
    h,
    rects: kit.rects,
    local: (px, py, z = 0) => new THREE.Vector3((px - w / 2) * PX, (h / 2 - py) * PX, z),
    setFocus: (r, pad = 0) => {
      u.focus.set(r.x - pad, r.y - pad, r.x + r.w + pad, r.y + r.h + pad);
    },
    lens: (r, pad, zoom, depth, o = {}) => {
      u.focus.set(r.x - pad, r.y - pad, r.x + r.w + pad, r.y + r.h + pad);
      const k = THREE.MathUtils.clamp(depth, 0, 1);
      u.world.value = 0;
      u.range.value = (o.rangePx ?? LENS.rangePx) / zoom;
      u.maxR.value = (k * (o.blurPx ?? LENS.blurPx)) / zoom;
      u.aniso.value = o.aniso ?? LENS.aniso;
      u.dim.value = THREE.MathUtils.lerp(1, LENS.dim, k);
      u.sat.value = THREE.MathUtils.lerp(1, LENS.sat, k);
    },
  };
}

/** Where a page must sit (rotated by `rot`) so its page-px point lands on the world origin. */
export function placeOn(page: Page, px: number, py: number, rot: THREE.Euler, out = new THREE.Vector3()) {
  return out.copy(page.local(px, py)).applyEuler(rot).negate();
}

/* -------------------------------------------------------- the punch line */

const LINE_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uSweep;    // 0..1 across the text's own width
uniform float uX0;       // text start, in uv
uniform float uX1;       // text end, in uv
uniform vec3 uInk;
uniform vec3 uHiInk;
uniform float uOpacity;
uniform float uShift;    // chromatic split, in uv
varying vec2 vUv;
void main() {
  float a = texture(map, vUv).a;
  float ar = texture(map, vUv + vec2(uShift, 0.0)).a;
  float ab = texture(map, vUv - vec2(uShift, 0.0)).a;
  float t = (vUv.x - uX0) / max(1e-4, uX1 - uX0);
  float hi = step(t, uSweep);
  vec3 ink = mix(uInk, uHiInk, hi);
  float sh = step(0.00001, uShift);
  float fa = max(ar, ab) * sh;
  float alpha = max(a, fa);
  vec3 fringe = vec3(ar, 0.15 * a, ab) / max(fa, 1e-4);
  vec3 col = mix(fringe, ink, a / max(alpha, 1e-4));
  gl_FragColor = vec4(col, alpha * uOpacity);
  #include <colorspace_fragment>
}`;

export interface PunchLine {
  group: THREE.Group;
  text: THREE.Mesh;
  highlight: THREE.Mesh;
  /** 0..1 how much of the line is selected. */
  setSweep(t: number): void;
  setOpacity(o: number): void;
  setShift(px: number): void;
  hiMat: THREE.MeshBasicMaterial;
  width: number;
}

export const HILITE = "#a3201c";

/**
 * The rejection line, drawn at 4× over the page's own copy of it, so it stays
 * razor-sharp when the camera is pushed right into it. A selection highlight
 * sweeps behind it and flips the ink to white as it passes.
 */
export function punchLine(name: string, text: string, size: number, weight: number, ink: string): PunchLine {
  // Drawn at the page's own font size inside a scaled context: Inter's optical-size
  // axis follows the px size, so drawing at 4× would switch to the tighter display cut.
  const RES = 4;
  const font = `${weight} ${size}px ${FONT}`;
  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = font;
  const tw = m.measureText(text).width;
  const pad = 24;
  const w = tw + pad * 2;
  const h = size * 1.7;
  const canvas = new OffscreenCanvas(Math.ceil(w * RES), Math.ceil(h * RES));
  const g = canvas.getContext("2d")!;
  g.scale(RES, RES);
  g.font = font;
  g.fillStyle = "#ffffff";
  g.textBaseline = "middle";
  g.fillText(text, pad, h / 2);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const uniforms = {
    map: { value: tex },
    uSweep: { value: 0 },
    uX0: { value: pad / w },
    uX1: { value: (pad + tw) / w },
    uInk: { value: new THREE.Color(ink) },
    uHiInk: { value: new THREE.Color("#ffffff") },
    uOpacity: { value: 1 },
    uShift: { value: 0 },
  };
  const textMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w * PX, h * PX),
    new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: LINE_FRAG, transparent: true, depthTest: false, depthWrite: false,
    }),
  );
  textMesh.name = name;
  textMesh.renderOrder = 3;

  // Highlight: a plane whose left edge is pinned at the text's start.
  const hiH = size * 1.42;
  const hiGeo = new THREE.PlaneGeometry(1, hiH * PX);
  hiGeo.translate(0.5, 0, 0);
  const hiMat = new THREE.MeshBasicMaterial({ color: HILITE, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const highlight = new THREE.Mesh(hiGeo, hiMat);
  highlight.name = `${name}-highlight`;
  highlight.renderOrder = 2;
  highlight.position.x = (-w / 2 + pad - 4) * PX;
  highlight.scale.x = 1e-4;

  const group = new THREE.Group();
  group.name = `${name}-line`;
  group.add(highlight, textMesh);
  const fullW = (tw + 8) * PX;
  return {
    group, text: textMesh, highlight, hiMat, width: tw,
    setSweep(t) {
      uniforms.uSweep.value = t;
      highlight.scale.x = Math.max(1e-4, t * fullW);
      highlight.visible = t > 0.001;
    },
    setOpacity(o) {
      uniforms.uOpacity.value = o;
      hiMat.opacity = o;
    },
    setShift(px) {
      uniforms.uShift.value = px / w;
    },
  };
}

/* ---------------------------------------------------------------- cursor */

function cursorTexture(kind: "arrow" | "beam") {
  const S = 6;
  const c = new OffscreenCanvas(28 * S, 34 * S);
  const g = c.getContext("2d")!;
  g.scale(S, S);
  g.lineJoin = "round";
  if (kind === "arrow") {
    g.translate(2, 2);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, 21);
    g.lineTo(5, 16.2);
    g.lineTo(8.6, 24.4);
    g.lineTo(12, 22.9);
    g.lineTo(8.4, 14.9);
    g.lineTo(15, 14.9);
    g.closePath();
    g.fillStyle = "#000000";
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1.8;
    g.stroke();
    g.fill();
  } else {
    g.translate(14, 17);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 4;
    g.lineCap = "round";
    const draw = () => {
      g.beginPath();
      g.moveTo(-4, -11); g.quadraticCurveTo(0, -11, 0, -8);
      g.moveTo(4, -11); g.quadraticCurveTo(0, -11, 0, -8);
      g.moveTo(0, -8); g.lineTo(0, 8);
      g.moveTo(-4, 11); g.quadraticCurveTo(0, 11, 0, 8);
      g.moveTo(4, 11); g.quadraticCurveTo(0, 11, 0, 8);
      g.stroke();
    };
    draw();
    g.strokeStyle = "#000000";
    g.lineWidth = 1.8;
    draw();
  }
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export interface Cursor {
  group: THREE.Group;
  arrow: THREE.Mesh;
  beam: THREE.Mesh;
  ring: THREE.Mesh;
  /** Pose in page px; `press` 0..1 is the click dip; `ring` 0..1 the ripple's life. */
  set(page: Page, px: number, py: number, o?: { press?: number; ring?: number; beam?: boolean; opacity?: number }): void;
}

/** A macOS-style pointer (and text I-beam) that lives on a page, scaled with it. */
export function makeCursor(name = "cursor", sizePx = 30): Cursor {
  const scale = sizePx / 34;
  const geo = new THREE.PlaneGeometry(28 * scale * PX, 34 * scale * PX);
  const arrowGeo = geo.clone();
  arrowGeo.translate((14 - 2) * scale * PX, (-17 + 2) * scale * PX, 0); // tip at origin
  const mk = (tex: THREE.Texture, g: THREE.BufferGeometry, n: string) => {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    m.name = n;
    m.renderOrder = 6;
    return m;
  };
  const arrow = mk(cursorTexture("arrow"), arrowGeo, `${name}-arrow`);
  const beam = mk(cursorTexture("beam"), geo, `${name}-ibeam`);
  beam.visible = false;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.86, 1, 64),
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  ring.name = `${name}-click-ring`;
  ring.renderOrder = 5;
  ring.userData.pickable = false;

  const group = new THREE.Group();
  group.name = name;
  group.add(ring, arrow, beam);
  return {
    group, arrow, beam, ring,
    set(page, px, py, o = {}) {
      if (group.parent !== page.mesh) page.mesh.add(group);
      group.position.copy(page.local(px, py, 0));
      const s = 1 - 0.14 * (o.press ?? 0);
      const op = o.opacity ?? 1;
      arrow.visible = !o.beam && op > 0.001;
      beam.visible = !!o.beam && op > 0.001;
      arrow.scale.setScalar(s);
      beam.scale.setScalar(s);
      (arrow.material as THREE.MeshBasicMaterial).opacity = op;
      (beam.material as THREE.MeshBasicMaterial).opacity = op;
      const r = o.ring ?? 0;
      ring.visible = r > 0 && r < 1;
      ring.scale.setScalar((8 + 46 * (1 - Math.pow(1 - r, 3))) * PX);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - r) * op;
    },
  };
}

/** A press shade over a button: darkens it while the mouse is down. */
export function pressShade(name: string, r: Rect, radius: number, page: Page) {
  const c = new OffscreenCanvas(Math.ceil(r.w * 2), Math.ceil(r.h * 2));
  const g = c.getContext("2d")!;
  g.scale(2, 2);
  g.beginPath();
  g.roundRect(0, 0, r.w, r.h, radius);
  g.fillStyle = "#000000";
  g.fill();
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(r.w * PX, r.h * PX),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  m.renderOrder = 1;
  m.userData.pickable = false;
  m.position.copy(page.local(r.x + r.w / 2, r.y + r.h / 2));
  page.mesh.add(m);
  return m;
}

/** Path for a mouse: eased travel with a slight arc, like a wrist. */
export function mousePath(t: number, x0: number, y0: number, x1: number, y1: number, arc = 0.12) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = -dy / (len || 1);
  const ny = dx / (len || 1);
  const bow = Math.sin(Math.PI * t) * arc * len;
  return { x: x0 + dx * t + nx * bow, y: y0 + dy * t + ny * bow };
}
