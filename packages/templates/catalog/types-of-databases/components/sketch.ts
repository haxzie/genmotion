/**
 * A tiny hand-drawn "whiteboard" toolkit for the three engine.
 *
 * Everything is placed in composition pixels (0,0 = top-left, y down) on an
 * orthographic camera. Strokes are ribbons with a per-vertex `t` (0→1 along
 * the stroke), so they draw on and erase off like a pen; text is a
 * pre-rendered handwriting PNG revealed with a soft left→right wipe.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeFrame } from "@genmotion/three-engine";
import { TEXTS, STYLES, type TextId } from "./texts";
import { HAND, MONO, type GlyphFont } from "./glyphs";
import { PAPER, INK, GREY, HATCH, W, H, MARGIN } from "./brand";

// ---------- deterministic randomness ----------
function hashSeed(seed: string | number): number {
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function rng(seed: string | number): () => number {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- easing / timing ----------
export const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const prog = (f: number, a: number, b: number) => clamp01((f - a) / Math.max(1e-6, b - a));

export interface Timing {
  /** Frame the element starts drawing on. */
  at: number;
  /** Frames to draw on. */
  dur?: number;
  /** Frame the element starts erasing; `null` keeps it (a handoff element). Defaults to the board's exit. */
  out?: number | null;
  outDur?: number;
}

type Pt = [number, number];

// ---------- shaders ----------
const strokeVert = /* glsl */ `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const strokeFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uReveal;
  uniform float uErase;
  varying float vT;
  void main() {
    if (vT > uReveal || vT < uErase) discard;
    gl_FragColor = vec4(uColor, uOpacity);
    #include <colorspace_fragment>
  }
`;
const textVert = /* glsl */ `
  attribute float aU;
  varying float vU;
  void main() {
    vU = aU;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const textFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uReveal;
  uniform float uErase;
  uniform float uOpacity;
  varying float vU;
  void main() {
    float soft = 0.08;
    float inEdge = uReveal * (1.0 + soft) - soft;
    float a = 1.0 - smoothstep(inEdge, inEdge + soft, vU);
    float outEdge = uErase * (1.0 + soft) - soft;
    a *= smoothstep(outEdge, outEdge + soft, vU);
    if (a <= 0.001) discard;
    gl_FragColor = vec4(uColor, a * uOpacity);
    #include <colorspace_fragment>
  }
`;

// ---------- vector glyphs ----------
const FONT_FILES: Record<string, GlyphFont> = { hand: HAND, mono: MONO };
const glyphCache = new Map<string, { pos: Float32Array; idx: number[] } | null>();

function glyphMesh(fontKey: string, ch: string) {
  const key = fontKey + ch;
  if (glyphCache.has(key)) return glyphCache.get(key)!;
  const font = FONT_FILES[fontKey]!;
  const d = font.glyphs[ch]?.[1] ?? "";
  if (!d) {
    glyphCache.set(key, null);
    return null;
  }
  const sp = new THREE.ShapePath();
  const tok = d.match(/[MLQCZ]|-?\d+/g) ?? [];
  let i = 0;
  const n = () => Number(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === "M") sp.moveTo(n(), n());
    else if (c === "L") sp.lineTo(n(), n());
    else if (c === "Q") { const a = n(), b = n(), x = n(), y = n(); sp.quadraticCurveTo(a, b, x, y); }
    else if (c === "C") { const a = n(), b = n(), e = n(), f = n(), x = n(), y = n(); sp.bezierCurveTo(a, b, e, f, x, y); }
  }
  const shapes = sp.toShapes(true);
  const g = new THREE.ShapeGeometry(shapes, 5);
  const ng = g.index ? g : g;
  const pos = new Float32Array(ng.attributes.position!.array as ArrayLike<number>);
  const idx = ng.index ? Array.from(ng.index.array as ArrayLike<number>) : Array.from({ length: pos.length / 3 }, (_, k) => k);
  g.dispose();
  const out = { pos, idx };
  glyphCache.set(key, out);
  return out;
}

/** Lays out one line of text; returns geometry in composition px, top-left at (0,0), y up. */
function textGeometry(text: string, fontKey: string, size: number, boxW: number, boxH: number) {
  const font = FONT_FILES[fontKey]!;
  const k = size / font.upm;
  const lineH = ((font.ascent - font.descent) / font.upm) * size;
  const baseline = (boxH - lineH) / 2 + (font.ascent / font.upm) * size;
  const pos: number[] = [];
  const us: number[] = [];
  const idx: number[] = [];
  let pen = 2;
  for (const ch of text) {
    const gm = glyphMesh(fontKey, ch);
    if (gm) {
      const base = pos.length / 3;
      for (let v = 0; v < gm.pos.length; v += 3) {
        const x = pen + gm.pos[v]! * k;
        pos.push(x, -baseline + gm.pos[v + 1]! * k, 0);
        us.push(x / boxW);
      }
      for (const j of gm.idx) idx.push(base + j);
    }
    pen += (font.glyphs[ch]?.[0] ?? font.upm * 0.5) * k;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aU", new THREE.Float32BufferAttribute(us, 1));
  g.setIndex(idx);
  return g;
}

interface Item {
  timing: Required<Omit<Timing, "out">> & { out: number | null };
  uniforms: { uReveal: { value: number }; uErase: { value: number }; uOpacity: { value: number } };
  object: THREE.Object3D;
  /** Extra per-frame behaviour (float, pop). */
  tick?: (f: number, reveal: number, erase: number) => void;
}

export interface StrokeStyle {
  color?: string;
  width?: number;
  seed?: string | number;
  rough?: number;
  /** Draw a second, slightly different pass (rough.js look). Default true. */
  double?: boolean;
}

export type Board = ReturnType<typeof createBoard>;

export function createBoard(ctx: ThreeSceneContext, opts: { exitAt?: number } = {}) {
  const { scene, durationInFrames } = ctx;
  scene.background = new THREE.Color(PAPER);

  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100);
  cam.position.set(W / 2, -H / 2, 10);
  ctx.setCamera(cam);

  const exitAt = opts.exitAt ?? durationInFrames - 18;
  const items: Item[] = [];
  let order = 0;

  function resolveTiming(t: Timing, defDur: number): Item["timing"] {
    return {
      at: t.at,
      dur: t.dur ?? defDur,
      out: t.out === undefined ? exitAt : t.out,
      outDur: t.outDur ?? 10,
    };
  }

  function makeUniforms(extra: Record<string, THREE.IUniform> = {}) {
    return {
      uReveal: { value: 0 },
      uErase: { value: 0 },
      uOpacity: { value: 1 },
      ...extra,
    };
  }

  function add(object: THREE.Object3D, item: Omit<Item, "object">) {
    object.renderOrder = order++;
    object.traverse((o) => (o.renderOrder = object.renderOrder));
    scene.add(object);
    items.push({ ...item, object });
    return object;
  }

  // ---------- geometry builders ----------
  function roughLine(a: Pt, b: Pt, r: () => number, rough: number): Pt[] {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const ux = dx / len;
    const uy = dy / len;
    const bow = (r() - 0.5) * Math.min(len * 0.025, 7) * rough;
    const over0 = (r() * 4 - 1) * rough;
    const over1 = (r() * 5 - 1) * rough;
    const j = () => (r() - 0.5) * 2.4 * rough;
    const p0: Pt = [a[0] - ux * over0 + j(), a[1] - uy * over0 + j()];
    const p1: Pt = [b[0] + ux * over1 + j(), b[1] + uy * over1 + j()];
    const n = Math.max(2, Math.ceil(len / 24));
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const off = bow * Math.sin(Math.PI * u);
      pts.push([p0[0] + (p1[0] - p0[0]) * u + nx * off, p0[1] + (p1[1] - p0[1]) * u + ny * off]);
    }
    return pts;
  }

  /** Builds a ribbon geometry from several sub-paths, each carrying its own t range. */
  function ribbon(paths: { pts: Pt[]; t0: number; t1: number; width: number }[]) {
    const pos: number[] = [];
    const ts: number[] = [];
    const idx: number[] = [];
    for (const { pts, t0, t1, width } of paths) {
      if (pts.length < 2) continue;
      const cum = [0];
      for (let i = 1; i < pts.length; i++) {
        cum.push(cum[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
      }
      const total = cum[cum.length - 1]! || 1;
      const base = pos.length / 3;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]!;
        const prev = pts[Math.max(0, i - 1)]!;
        const next = pts[Math.min(pts.length - 1, i + 1)]!;
        let tx = next[0] - prev[0];
        let ty = next[1] - prev[1];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        // taper the very ends a touch, like a pen landing and lifting
        const u = cum[i]! / total;
        const taper = 0.75 + 0.25 * Math.min(1, Math.min(u, 1 - u) * 12);
        const hw = (width / 2) * taper;
        const nx = -ty * hw;
        const ny = tx * hw;
        pos.push(p[0] + nx, -(p[1] + ny), 0, p[0] - nx, -(p[1] - ny), 0);
        const t = t0 + (t1 - t0) * u;
        ts.push(t, t);
        if (i > 0) {
          const k = base + (i - 1) * 2;
          idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
    g.setIndex(idx);
    return g;
  }

  function strokeMaterial(color: string) {
    const uniforms = makeUniforms({ uColor: { value: new THREE.Color(color) } });
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: strokeVert,
      fragmentShader: strokeFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return { mat, uniforms };
  }

  /**
   * A stroke made of segments drawn in sequence (each segment is a pen move).
   * `segments` are lists of points; straight 2-point segments get roughened.
   */
  function strokes(segments: Pt[][], timing: Timing, style: StrokeStyle = {}) {
    const { color = INK, width = 2.6, seed = order, rough = 1, double = true } = style;
    const r = rng("s" + seed);
    const lens = segments.map((s) => {
      let l = 0;
      for (let i = 1; i < s.length; i++) l += Math.hypot(s[i]![0] - s[i - 1]![0], s[i]![1] - s[i - 1]![1]);
      return l;
    });
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    const paths: { pts: Pt[]; t0: number; t1: number; width: number }[] = [];
    const passes = double ? 2 : 1;
    for (let pass = 0; pass < passes; pass++) {
      let acc = 0;
      segments.forEach((seg, si) => {
        const t0 = acc / total;
        const t1 = (acc + lens[si]!) / total;
        acc += lens[si]!;
        const pts = seg.length === 2 ? roughLine(seg[0]!, seg[1]!, r, rough) : jitter(seg, r, rough * (pass ? 1.2 : 0.6));
        paths.push({ pts, t0, t1, width: pass ? width * 0.8 : width });
      });
    }
    const { mat, uniforms } = strokeMaterial(color);
    const mesh = new THREE.Mesh(ribbon(paths), mat);
    const defDur = Math.round(Math.min(26, Math.max(10, total / 70)));
    return add(mesh, { timing: resolveTiming(timing, defDur), uniforms });
  }

  function jitter(pts: Pt[], r: () => number, amt: number): Pt[] {
    const ox = (r() - 0.5) * 2 * amt;
    const oy = (r() - 0.5) * 2 * amt;
    return pts.map((p) => [p[0] + ox + (r() - 0.5) * 0.6 * amt, p[1] + oy + (r() - 0.5) * 0.6 * amt] as Pt);
  }

  // ---------- public primitives ----------
  function line(a: Pt, b: Pt, timing: Timing, style?: StrokeStyle) {
    return strokes([[a, b]], timing, style);
  }

  function rect(x: number, y: number, w: number, h: number, timing: Timing, style?: StrokeStyle) {
    return strokes(
      [
        [[x, y], [x + w, y]],
        [[x + w, y], [x + w, y + h]],
        [[x + w, y + h], [x, y + h]],
        [[x, y + h], [x, y]],
      ],
      timing,
      style,
    );
  }

  function ellipsePts(cx: number, cy: number, rx: number, ry: number, r: () => number, a0 = 0, a1 = Math.PI * 2, overshoot = 0.35): Pt[] {
    const start = a0 + (a1 - a0 === Math.PI * 2 ? r() * Math.PI * 2 : 0);
    const end = start + (a1 - a0) + (a1 - a0 === Math.PI * 2 ? overshoot * (0.6 + r() * 0.6) : 0);
    const n = Math.max(24, Math.ceil(((rx + ry) * Math.abs(end - start)) / 14));
    const ph = r() * 6;
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const a = start + ((end - start) * i) / n;
      const k = 1 + 0.025 * Math.sin(a * 2 + ph) + (i / n) * 0.03;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return pts;
  }

  function ellipse(cx: number, cy: number, rx: number, ry: number, timing: Timing, style: StrokeStyle = {}) {
    const r = rng("e" + (style.seed ?? order));
    return strokes([ellipsePts(cx, cy, rx, ry, r)], timing, { ...style, double: style.double ?? false });
  }

  function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, timing: Timing, style: StrokeStyle = {}) {
    const r = rng("a" + (style.seed ?? order));
    return strokes([ellipsePts(cx, cy, rx, ry, r, a0, a1, 0)], timing, { ...style, double: false });
  }

  /** A slightly curved hand-drawn arrow from a → b. `bend` is px of sag. */
  function arrow(a: Pt, b: Pt, timing: Timing, style: StrokeStyle & { bend?: number; head?: number } = {}) {
    const { bend = -10, head = 22 } = style;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const c: Pt = [(a[0] + b[0]) / 2 + nx * bend, (a[1] + b[1]) / 2 + ny * bend];
    const shaft: Pt[] = [];
    const n = Math.max(8, Math.ceil(len / 20));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const mu = 1 - u;
      shaft.push([mu * mu * a[0] + 2 * mu * u * c[0] + u * u * b[0], mu * mu * a[1] + 2 * mu * u * c[1] + u * u * b[1]]);
    }
    // direction at the tip
    const tx = b[0] - c[0];
    const ty = b[1] - c[1];
    const tl = Math.hypot(tx, ty) || 1;
    const ang = Math.atan2(ty / tl, tx / tl);
    const h1: Pt = [b[0] - Math.cos(ang - 0.45) * head, b[1] - Math.sin(ang - 0.45) * head];
    const h2: Pt = [b[0] - Math.cos(ang + 0.45) * head, b[1] - Math.sin(ang + 0.45) * head];
    return strokes([shaft, [h1, b], [b, h2]], timing, { ...style, double: false, width: style.width ?? 3 });
  }

  /** Diagonal hatch fill (////) revealed left to right, like the reference's red bar. */
  function hatch(x: number, y: number, w: number, h: number, timing: Timing, style: StrokeStyle & { gap?: number } = {}) {
    const { color = HATCH, width = 2.2, gap = 13 } = style;
    const r = rng("h" + (style.seed ?? order));
    const paths: { pts: Pt[]; t0: number; t1: number; width: number }[] = [];
    // lines of the form: going up-right at 45°, i.e. from (c, y+h) to (c+h, y)
    for (let c = x - h; c < x + w; c += gap) {
      let x0 = c;
      let y0 = y + h;
      let x1 = c + h;
      let y1 = y;
      if (x0 < x) {
        y0 -= x - x0;
        x0 = x;
      }
      if (x1 > x + w) {
        y1 += x1 - (x + w);
        x1 = x + w;
      }
      if (x1 - x0 < 2) continue;
      const u = clamp01((x0 + x1) / 2 - x) / 1;
      const tu = clamp01(((x0 + x1) / 2 - x) / w);
      void u;
      const pts = roughLine([x0 + 1, y0 - 1], [x1 - 1, y1 + 1], r, 0.35);
      paths.push({ pts, t0: tu * 0.9, t1: tu * 0.9 + 0.1, width });
    }
    const { mat, uniforms } = strokeMaterial(color);
    const mesh = new THREE.Mesh(ribbon(paths), mat);
    return add(mesh, { timing: resolveTiming(timing, 18), uniforms });
  }

  /** Solid fill rectangle wiped on left→right (code box background). */
  function fill(x: number, y: number, w: number, h: number, color: string, timing: Timing) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([x, -y, 0, x + w, -y, 0, x, -(y + h), 0, x + w, -(y + h), 0], 3));
    g.setAttribute("aT", new THREE.Float32BufferAttribute([0, 1, 0, 1], 1));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    const { mat, uniforms } = strokeMaterial(color);
    // A fill can't discard per-fragment against an interpolated t cleanly at the
    // edges, but a hard wipe edge reads as a marker sweep, which suits the look.
    return add(new THREE.Mesh(g, mat), { timing: resolveTiming(timing, 14), uniforms });
  }

  /** Filled dot that pops in. */
  function dot(cx: number, cy: number, radius: number, timing: Timing, color = INK) {
    const g = new THREE.CircleGeometry(radius, 28);
    g.setAttribute("aT", new THREE.Float32BufferAttribute(new Array(g.attributes.position!.count).fill(0), 1));
    const { mat, uniforms } = strokeMaterial(color);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(cx, -cy, 0);
    const tm = resolveTiming(timing, 8);
    return add(mesh, {
      timing: tm,
      uniforms,
      tick: (f) => {
        const pin = prog(f, tm.at, tm.at + tm.dur);
        const back = pin < 1 ? 1 + Math.sin(pin * Math.PI) * 0.35 : 1;
        const pout = tm.out === null ? 0 : outCubic(prog(f, tm.out, tm.out + tm.outDur));
        const s = Math.max(0.0001, outCubic(pin) * back * (1 - pout));
        mesh.scale.setScalar(s);
        uniforms.uReveal.value = pin > 0 ? 1 : 0;
        uniforms.uErase.value = 0;
      },
    });
  }

  /** Handwritten text placed by its top-left corner. */
  function text(id: TextId, x: number, y: number, timing: Timing, opts: { float?: boolean; rise?: number } = {}) {
    const asset = TEXTS[id];
    const st = STYLES[asset.style];
    const uniforms = makeUniforms({ uColor: { value: new THREE.Color(st.color) } });
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: textVert,
      fragmentShader: textFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(textGeometry(asset.text, st.font, st.size, asset.w, asset.h), mat);
    mesh.position.set(x, -y, 1);
    const defDur = Math.round(Math.min(18, Math.max(8, asset.w / 45)));
    const tm = resolveTiming(timing, defDur);
    const rise = opts.rise ?? 6;
    const float = opts.float ?? true;
    const phase = rng("f" + id)() * Math.PI * 2;
    return add(mesh, {
      timing: tm,
      uniforms,
      tick: (f) => {
        const pin = outCubic(prog(f, tm.at, tm.at + tm.dur));
        const fl = float ? Math.sin(f / 22 + phase) * 1.2 : 0;
        mesh.position.y = -(y + (1 - pin) * rise + fl);
      },
    });
  }

  function size(id: TextId) {
    return TEXTS[id];
  }

  // ---------- composite helpers ----------
  /** Box with a centered label, reference-style ("materialized view"). */
  function labelBox(id: TextId, x: number, y: number, w: number, h: number, timing: Timing, style?: StrokeStyle) {
    const s = TEXTS[id];
    rect(x, y, w, h, timing, style);
    text(id, x + (w - s.w) / 2, y + (h - s.h) / 2 + 2, { ...timing, at: timing.at + 6, dur: undefined }, { float: false });
  }

  /** "e.g." followed by a row of boxed names. */
  function examples(ids: TextId[], x: number, y: number, at: number) {
    const eg = TEXTS.eg;
    text("eg", x, y + (76 - eg.h) / 2, { at });
    let cx = x + eg.w + 18;
    ids.forEach((id, i) => {
      const w = TEXTS[id].w + 48;
      labelBox(id, cx, y, w, 76, { at: at + 4 + i * 5, dur: 12 }, { seed: "ex" + String(id) });
      cx += w + 26;
    });
  }

  /** "good for:" + a line of body copy, bottoms aligned. */
  function goodFor(id: TextId, x: number, y: number, at: number) {
    const g = TEXTS.goodFor;
    const b = TEXTS[id];
    text("goodFor", x, y + b.h - g.h - 2, { at });
    text(id, x + g.w + 14, y, { at: at + 5 });
  }

  /** Counter, title and subtitle — the same frame position in every chapter. */
  function header(n: number, title: TextId, sub: TextId, opts: { tagIn?: boolean; tagOut?: boolean } = {}) {
    const tag = TEXTS.tag;
    text("tag", W - MARGIN - tag.w, 64, opts.tagIn ? { at: 0, dur: 12 } : { at: -100, dur: 1, out: opts.tagOut ? exitAt + 4 : null }, { float: false });
    text(`n${n}` as TextId, MARGIN + 4, 64, { at: 2, dur: 10 }, { float: false });
    text(title, MARGIN, 104, { at: 6 });
    text(sub, MARGIN + 4, 236, { at: 16 });
  }

  function update({ frame, progress }: ThreeFrame) {
    // Ambient camera drift that returns to rest at both ends of the scene, so
    // every cut lands on an identical frame.
    const s = Math.sin(Math.PI * 2 * progress);
    cam.position.x = W / 2 + s * 4;
    cam.position.y = -H / 2 + Math.sin(Math.PI * 4 * progress) * 2.5;
    cam.zoom = 1 + Math.pow(Math.sin(Math.PI * progress), 2) * 0.012;
    cam.updateProjectionMatrix();

    for (const it of items) {
      const { at, dur, out, outDur } = it.timing;
      const reveal = outCubic(prog(frame, at, at + dur));
      const erase = out === null ? 0 : inOutCubic(prog(frame, out, out + outDur));
      it.uniforms.uReveal.value = reveal;
      it.uniforms.uErase.value = erase;
      it.object.visible = reveal > 0 && erase < 1;
      it.tick?.(frame, reveal, erase);
    }
  }

  return {
    exitAt,
    line,
    rect,
    ellipse,
    arc,
    arrow,
    hatch,
    fill,
    dot,
    text,
    size,
    strokes,
    labelBox,
    examples,
    goodFor,
    header,
    update,
    GREY,
  };
}
