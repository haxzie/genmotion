# The diagram kit: `components/diagram.ts`

Routed from SKILL.md. Copy it into `components/diagram.ts`.

The box-and-arrow half of the kit: nodes, zones, lanes, lifelines, compartment
boxes, orthogonal connectors, the scene wrapper every diagram scene starts from,
and the audit.

Everything is authored in **composition px, y up, origin at the frame centre** —
the grammar is a 2D layout grammar and reads far better in px than in world
units. `PX` converts at the last step, so a node 240px wide is 240px on screen
at z = 0 after `fitCamera`.

It needs `PX`/`fitCamera` from `components/stage.ts` (`three-camera`,
`references/rig.md`), the type kit from `components/type.ts` (`three-type`,
`references/type-kit.md`), `components/ease.ts` (`three-camera`), and
`selfLoop` from `components/shapes.ts` (`shape-kit.md`).

Layout and taste rules are ported from Diagram Design (MIT, Cathryn Lavery):
the structural grid, the per-kind node treatments, the semantic colour roles,
the series palette, the complexity budget and the six connector rules. What
changed for this engine:

- **The ramp is 2x theirs.** Their 12px node name is sized for a 900px-wide
  figure in a blog post; a 1920x1080 frame needs type above the 28px floor. The
  grid doubles with it (8px here), so every allowed value still divides.
- **Weight caps at 500**, not 600. Hierarchy comes from size (house rule).
- **renderOrder replaces z-order**, and an opaque paper plate under each node
  replaces their mask rect. Everything sits at z = 0 with depth testing off.
- **Connectors draw on.** A ribbon mesh carries normalised arc length, so a path
  reveals along itself. That is the whole reason to do this in 3D.

Contents: 1 The module - 2 API at a glance - 3 What `wire` decides for you - 4 Why it is built this way

## 1. The module

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { PX, fitCamera } from "./stage";
import { label, measure, onTop, setLabel, withFonts, type FontFile, type Label, type TypeStyle } from "./type";
import { outCubic, outQuart, prog } from "./ease";
import { selfLoop } from "./shapes";

/**
 * The diagram kit: nodes, orthogonal connectors and zones for a Three.js scene.
 *
 * Everything here is authored in **composition px, y up, origin at frame centre** —
 * the diagram grammar is a 2D layout grammar and reads far better in px than in
 * world units. `PX` converts at the last step, so a node 240px wide is 240px on
 * screen at z = 0 after `fitCamera`.
 *
 * Layout and taste rules are ported from Diagram Design (MIT, Cathryn Lavery):
 * the 4px structural grid, the per-kind node treatments, the complexity budget
 * and the six connector rules. What changed for this engine:
 *
 * - **The ramp is 2x theirs.** Their 12px node name is sized for a 900px-wide
 *   figure in a blog post; a 1920x1080 frame needs type above the 28px floor.
 *   The grid doubles with it (8px here), so every allowed value still divides.
 * - **Weight caps at 500**, not 600. Hierarchy comes from size (house rule).
 * - **renderOrder replaces z-order**, and an opaque paper plate under each node
 *   replaces their mask rect. Everything sits at z = 0 with depth testing off.
 * - **Connectors draw on.** A ribbon mesh carries normalised arc length, so a
 *   path reveals along itself. That is the whole reason to do this in 3D.
 */

export const SANS = 'Inter, "SF Pro Display", -apple-system, "Helvetica Neue", Arial, sans-serif';
export const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';

export interface Skin {
  paper: string;
  paper2: string;
  ink: string;
  muted: string;
  soft: string;
  rule: string;
  accent: string;
  link: string;
}

export const LIGHT: Skin = {
  paper: "#f5f5f5",
  paper2: "#ffffff",
  ink: "#2d3142",
  muted: "#4f5d75",
  soft: "#7a8399",
  rule: "#bfc0c0",
  accent: "#eb6c36",
  link: "#2e5aa8",
};

export const DARK: Skin = {
  paper: "#2d3142",
  paper2: "#393e53",
  ink: "#f5f5f5",
  muted: "#bfc0c0",
  soft: "#8e98ac",
  rule: "#575d75",
  accent: "#f08a59",
  link: "#6a95d8",
};

/**
 * Desaturated, editorial series colours, for the chart types that genuinely
 * have to tell several overlapping entities apart — radar, multi-series line,
 * streamgraph, bump.
 *
 * `accent` stays reserved for the focal series, and these cover the rest. Do
 * not reach for them anywhere else: an architecture diagram with five hues has
 * stopped having a focal point, which is the whole system this one borrows.
 */
export const SERIES = ["#7c8f6f", "#5e7a9b", "#b8915a", "#9c6b50", "#6e6479"] as const;
export const SERIES_DARK = ["#9caf8f", "#82a0c0", "#d3ad7a", "#b88670", "#8d8298"] as const;

/** Type ramp, composition px. 2x Diagram Design's doc-inline ramp: see the note above. */
export const RAMP = { name: 28, sub: 18, tag: 14, edge: 16, zone: 16 } as const;

/** Structural geometry divides by this. Node origins, sizes, gaps, padding. */
export const GRID = 8;
/** Elbow corner radius (their r=8). */
export const R = 16;
/** Node box corner radius (their rx=6); never above 20. */
export const NODE_R = 12;
/** Hairline stroke width in px (their 1px). */
export const STROKE = 2;
/** Visible gap between an edge label's plate and its stroke (their 6-10px). */
export const LABEL_GAP = 16;
/** Minimum spacing between two attach points on one node edge (their 12px). */
export const FAN_MIN = 24;

/** Allowed node widths and heights. Pick from the ladder; don't invent sizes. */
export const W = [160, 192, 224, 240, 256, 288, 320, 360, 400, 480, 640] as const;
export const H = [96, 112, 120, 128, 144, 160] as const;

export interface Vec {
  x: number;
  y: number;
}

export type Side = "top" | "bottom" | "left" | "right";
export type NodeKind = "focal" | "backend" | "store" | "external" | "input" | "optional" | "security";
export type EdgeRole = "default" | "accent" | "link";

// ---------------------------------------------------------------------------
// Strokes: one ribbon mesh per path, with draw-on and dashes in the shader.
// ---------------------------------------------------------------------------

const STROKE_VERT = /* glsl */ `
attribute float aT;
attribute float aLen;
varying float vT;
varying float vLen;
void main() {
  vT = aT;
  vLen = aLen;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const STROKE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uProgress; // 0..1 along the path; the draw-on
uniform float uDash;     // px of ink; 0 = solid
uniform float uGap;      // px of hole
varying float vT;
varying float vLen;
void main() {
  if (vT > uProgress) discard;
  if (uDash > 0.0 && mod(vLen, uDash + uGap) > uDash) discard;
  gl_FragColor = vec4(uColor, uOpacity);
  #include <colorspace_fragment>
}`;

export type Stroke = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> & {
  userData: { pts: Vec[]; lengthPx: number };
};

export interface StrokeStyle {
  color?: string;
  width?: number;
  opacity?: number;
  /** Dash period in px, as [ink, hole]. Their `4,3` at this scale is [8, 6]. */
  dash?: [number, number];
}

/**
 * A polyline as a ribbon of triangles, mitred at the joins.
 *
 * `LineBasicMaterial` is not an option: WebGL ignores `linewidth`, so every
 * stroke would be one device pixel — half a composition px at 2x capture, which
 * is where "my diagram looks washed out in the export" comes from.
 */
export function stroke(pts: Vec[], s: StrokeStyle = {}, closed = false): Stroke {
  const p = closed ? [...pts, pts[0]!] : pts;
  const hw = (s.width ?? STROKE) / 2;

  const seg: Vec[] = [];
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1]!;
    const b = p[i]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push(d < 1e-6 ? { x: 1, y: 0 } : { x: (b.x - a.x) / d, y: (b.y - a.y) / d });
  }

  const cum: number[] = [0];
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1]!;
    const b = p[i]!;
    cum.push(cum[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cum[cum.length - 1]! || 1;

  const pos: number[] = [];
  const aT: number[] = [];
  const aLen: number[] = [];
  for (let i = 0; i < p.length; i++) {
    const inDir = seg[Math.max(0, i - 1)]!;
    const outDir = seg[Math.min(seg.length - 1, i)]!;
    let nx = -(inDir.y + outDir.y);
    let ny = inDir.x + outDir.x;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    // Mitre: push the join out so the outer corner closes. Clamped, because a
    // near-reversal would otherwise throw a spike across the frame.
    const mitre = Math.min(2, 1 / Math.max(0.5, Math.abs(nx * -outDir.y + ny * outDir.x)));
    const ox = nx * hw * mitre * PX;
    const oy = ny * hw * mitre * PX;
    const vx = p[i]!.x * PX;
    const vy = p[i]!.y * PX;
    pos.push(vx + ox, vy + oy, 0, vx - ox, vy - oy, 0);
    const t = cum[i]! / total;
    aT.push(t, t);
    aLen.push(cum[i]!, cum[i]!);
  }

  const idx: number[] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1));
  geo.setAttribute("aLen", new THREE.Float32BufferAttribute(aLen, 1));
  geo.setIndex(idx);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(s.color ?? LIGHT.muted) },
      uOpacity: { value: s.opacity ?? 1 },
      uProgress: { value: 1 },
      uDash: { value: s.dash?.[0] ?? 0 },
      uGap: { value: s.dash?.[1] ?? 0 },
    },
    vertexShader: STROKE_VERT,
    fragmentShader: STROKE_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat) as Stroke;
  mesh.userData = { pts: p, lengthPx: total };
  return mesh;
}

/** Per-frame look of a stroke. `progress` is the draw-on, 0..1 along the path. */
export function setStroke(m: Stroke, o: { progress?: number; opacity?: number; color?: THREE.Color }) {
  const u = m.material.uniforms;
  if (o.progress !== undefined) {
    u.uProgress!.value = o.progress;
    m.visible = o.progress > 0.001;
  }
  if (o.opacity !== undefined) u.uOpacity!.value = o.opacity;
  if (o.color) (u.uColor!.value as THREE.Color).copy(o.color);
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** Closed polyline of a rounded rectangle centred on the origin, for `stroke()`. */
export function roundedRect(w: number, h: number, r: number, seg = 4): Vec[] {
  const rr = Math.min(r, w / 2, h / 2);
  const x = w / 2;
  const y = h / 2;
  const pts: Vec[] = [];
  const corner = (cx: number, cy: number, from: number) => {
    for (let i = 0; i <= seg; i++) {
      const a = from + (Math.PI / 2) * (i / seg);
      pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
  };
  corner(x - rr, y - rr, 0);
  corner(-x + rr, y - rr, Math.PI / 2);
  corner(-x + rr, -y + rr, Math.PI);
  corner(x - rr, -y + rr, -Math.PI / 2);
  return pts;
}

/** A filled rounded rectangle centred on the origin, in px. The chart and shape kits build on this. */
export function rect(w: number, h: number, r: number, color: string, opacity = 1) {
  const rr = Math.min(r, w / 2, h / 2);
  const shape = new THREE.Shape();
  const x = w / 2;
  const y = h / 2;
  shape.moveTo(-x + rr, -y);
  shape.lineTo(x - rr, -y);
  shape.absarc(x - rr, -y + rr, rr, -Math.PI / 2, 0, false);
  shape.lineTo(x, y - rr);
  shape.absarc(x - rr, y - rr, rr, 0, Math.PI / 2, false);
  shape.lineTo(-x + rr, y);
  shape.absarc(-x + rr, y - rr, rr, Math.PI / 2, Math.PI, false);
  shape.lineTo(-x, -y + rr);
  shape.absarc(-x + rr, -y + rr, rr, Math.PI, Math.PI * 1.5, false);
  const geo = new THREE.ShapeGeometry(shape, 8);
  geo.scale(PX, PX, 1);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

/**
 * Any closed polygon, filled. Areas, wedges, Sankey ribbons, funnel trapezoids
 * and axonometric faces are all this.
 */
export function polyFill(pts: Vec[], color: string, opacity = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0]!.x, pts[0]!.y);
  for (const p of pts.slice(1)) shape.lineTo(p.x, p.y);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.scale(PX, PX, 1);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

export interface NodeSpec {
  id: string;
  /** Centre of the box, composition px, y up. On the GRID. */
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  /** Rectangular type tag, all caps, <= 6 characters. */
  tag?: string;
  /** Mono sublabel: a port, a command, a URL. Never a second sentence. */
  sub?: string;
  kind?: NodeKind;
  /** Grammar, not decoration: diamond = the flow splits, cylinder = durable state. */
  shape?: NodeShape;
}

export interface DiagramNode {
  spec: Required<Pick<NodeSpec, "id" | "x" | "y" | "w" | "h" | "name">> & NodeSpec;
  group: THREE.Group;
  /** 0 -> 1 entrance: fade and an 8px rise. Call it every frame. */
  reveal(t: number): void;
}

function treatment(kind: NodeKind, s: Skin) {
  switch (kind) {
    case "focal":
      return { fill: s.accent, fillOpacity: 0.1, stroke: s.accent, strokeOpacity: 1, dash: undefined };
    case "store":
      return { fill: s.ink, fillOpacity: 0.05, stroke: s.muted, strokeOpacity: 1, dash: undefined };
    case "external":
      return { fill: s.ink, fillOpacity: 0.03, stroke: s.ink, strokeOpacity: 0.3, dash: undefined };
    case "input":
      return { fill: s.muted, fillOpacity: 0.1, stroke: s.soft, strokeOpacity: 1, dash: undefined };
    case "optional":
      return { fill: s.ink, fillOpacity: 0.02, stroke: s.ink, strokeOpacity: 0.2, dash: [8, 6] as [number, number] };
    case "security":
      return { fill: s.accent, fillOpacity: 0.05, stroke: s.accent, strokeOpacity: 0.5, dash: [8, 8] as [number, number] };
    default:
      return { fill: s.paper2, fillOpacity: 1, stroke: s.ink, strokeOpacity: 1, dash: undefined };
  }
}

export function node(spec: NodeSpec, skin: Skin = LIGHT): DiagramNode {
  const w = spec.w ?? 240;
  const h = spec.h ?? 120;
  const kind = spec.kind ?? "backend";
  const t = treatment(kind, skin);

  const group = new THREE.Group();
  group.name = spec.id;
  group.position.set(spec.x * PX, spec.y * PX, 0);

  // Their step 1: an opaque paper plate so connectors never show through a
  // tinted fill. In 3D this is also what makes renderOrder enough on its own.
  const path = shapePath(spec.shape ?? "rect", w, h);
  const plate = polyFill(path, skin.paper, 1);
  const fill = polyFill(path, t.fill, t.fillOpacity);
  const outline = stroke(path, { color: t.stroke, opacity: t.strokeOpacity, dash: t.dash, width: STROKE }, true);
  group.add(plate, fill, outline);

  // Vertical layout, by what the node actually carries. A tag steals the top
  // 34px, so the name and sublabel sit below it rather than through it; an
  // earlier version centred the name regardless and the two collided on any
  // node shorter than 128px.
  const texts: Label[] = [];
  const hasSub = Boolean(spec.sub);
  const hasTag = Boolean(spec.tag);
  const nameY = hasTag && hasSub ? 2 : hasTag ? -12 : hasSub ? 10 : 0;
  const subY = hasTag ? -30 : -22;

  const nameStyle: TypeStyle = { size: RAMP.name, weight: 500, color: skin.ink, font: SANS };
  const name = label(spec.name, nameStyle);
  name.position.y = nameY * PX;
  texts.push(name);

  if (spec.sub) {
    const sub = label(spec.sub, { size: RAMP.sub, weight: 400, color: skin.soft, font: MONO, tracking: 0 });
    sub.position.y = subY * PX;
    texts.push(sub);
  }

  if (spec.tag) {
    const tagStyle: TypeStyle = { size: RAMP.tag, weight: 400, color: t.stroke, font: MONO, tracking: 0.08 };
    const boxW = Math.ceil(measure(spec.tag, tagStyle) + 18);
    const tagBox = stroke(roundedRect(boxW, 22, 4), { color: t.stroke, opacity: 0.4, width: 1.5 }, true);
    tagBox.position.set((-w / 2 + 16 + boxW / 2) * PX, (h / 2 - 13 - 11) * PX, 0);
    const tag = label(spec.tag, tagStyle);
    tag.position.copy(tagBox.position);
    group.add(tagBox);
    texts.push(tag);
  }

  for (const x of texts) group.add(x);

  // z = 0 everywhere, so paint order is explicit: plate, fill, outline, type.
  onTop(plate, 10);
  onTop(fill, 11);
  onTop(outline, 12);
  for (const x of texts) onTop(x, 14);

  const restY = group.position.y;
  const fills = [plate, fill];
  return {
    spec: { ...spec, w, h, kind },
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.position.y = restY - (1 - k) * 8 * PX;
      group.visible = k > 0.001;
      for (const f of fills) f.material.opacity = (f === plate ? 1 : t.fillOpacity) * k;
      setStroke(outline, { opacity: t.strokeOpacity * k, progress: 1 });
      for (const x of texts) setLabel(x, { opacity: k });
    },
  };
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export interface ZoneSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Eyebrow, all caps, sits in the header margin. */
  title: string;
  dashed?: boolean;
}

/** A tier or trust boundary. Max 3 per diagram; more means you want a swimlane. */
export function zone(spec: ZoneSpec, skin: Skin = LIGHT) {
  const group = new THREE.Group();
  group.name = `zone-${spec.title.toLowerCase()}`;
  group.position.set(spec.x * PX, spec.y * PX, 0);

  const wash = rect(spec.w, spec.h, 16, skin.ink, 0.02);
  const outline = stroke(roundedRect(spec.w, spec.h, 16), {
    color: skin.ink,
    opacity: 0.12,
    width: 1.5,
    dash: spec.dashed ? [12, 8] : undefined,
  }, true);

  const style: TypeStyle = { size: RAMP.zone, weight: 400, color: skin.soft, font: MONO, tracking: 0.14 };
  const eyebrow = label(spec.title, style, "left");
  // Their rule: the label sits on a paper mask over the boundary line, with
  // >=16px between it and the first enclosed node (the zone is sized for it).
  const plateW = measure(spec.title, style) + 24;
  const plate = rect(plateW, 24, 2, skin.paper, 1);
  plate.position.set((-spec.w / 2 + 24 + plateW / 2) * PX, (spec.h / 2) * PX, 0);
  eyebrow.position.set((-spec.w / 2 + 24 + 12) * PX, (spec.h / 2) * PX, 0);

  group.add(wash, outline, plate, eyebrow);
  onTop(wash, 2);
  onTop(outline, 3);
  onTop(plate, 4);
  onTop(eyebrow, 5);

  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      wash.material.opacity = 0.02 * k;
      plate.material.opacity = k;
      setStroke(outline, { opacity: 0.12 * k });
      setLabel(eyebrow, { opacity: k });
    },
  };
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export interface EdgeSpec {
  from: string;
  to: string;
  /** <= 14 characters, all caps. Omit it if the layout already says it. */
  label?: string;
  role?: EdgeRole;
  /** Optional, passive, return or async. */
  dashed?: boolean;
  /** Force the ports instead of letting the geometry pick them. */
  fromSide?: Side;
  toSide?: Side;
}

export interface Edge {
  spec: EdgeSpec;
  group: THREE.Group;
  pts: Vec[];
  /** 0 -> 1: the line draws along itself, then the head lands. */
  reveal(t: number): void;
}

const axis = (s: Side) => (s === "left" || s === "right" ? "h" : "v");

/**
 * Their port rule: a mainly-vertical run leaves the top or bottom, not the side.
 *
 * `flow` overrides the geometry. A ranked graph — a tree, an org chart, a
 * dependency DAG — is read down the frame, so every connector must leave the
 * bottom and arrive at the top however far apart two nodes happen to be
 * horizontally. Letting geometry decide there puts several connectors on the
 * same horizontal lane at the rank's y, which is rule 3 every time.
 */
function sides(a: DiagramNode, b: DiagramNode, spec: EdgeSpec, flow?: Flow): [Side, Side] {
  const dx = b.spec.x - a.spec.x;
  const dy = b.spec.y - a.spec.y;
  if (spec.fromSide && spec.toSide) return [spec.fromSide, spec.toSide];
  // Two boxes whose faces overlap on the flow axis are on the same rank, and a
  // rank-mate must use side ports whatever the hint says: a "vertical" route
  // between two boxes at the same y leaves the bottom, turns back up into the
  // band between them, and runs through both boxes to get there.
  const sameRank = Math.abs(dy) < (a.spec.h! + b.spec.h!) / 2;
  const sameColumn = Math.abs(dx) < (a.spec.w! + b.spec.w!) / 2;
  if (flow === "vertical" && !sameRank) {
    return [spec.fromSide ?? (dy > 0 ? "top" : "bottom"), spec.toSide ?? (dy > 0 ? "bottom" : "top")];
  }
  if (flow === "horizontal" && !sameColumn) {
    return [spec.fromSide ?? (dx > 0 ? "right" : "left"), spec.toSide ?? (dx > 0 ? "left" : "right")];
  }
  if (flow === "vertical" && sameRank) {
    return [spec.fromSide ?? (dx > 0 ? "right" : "left"), spec.toSide ?? (dx > 0 ? "left" : "right")];
  }
  if (flow === "horizontal" && sameColumn) {
    return [spec.fromSide ?? (dy > 0 ? "top" : "bottom"), spec.toSide ?? (dy > 0 ? "bottom" : "top")];
  }
  if (Math.abs(dy) > Math.abs(dx)) {
    const from: Side = dy > 0 ? "top" : "bottom";
    return [spec.fromSide ?? from, spec.toSide ?? (dy > 0 ? "bottom" : "top")];
  }
  const from: Side = dx > 0 ? "right" : "left";
  return [spec.fromSide ?? from, spec.toSide ?? (dx > 0 ? "left" : "right")];
}

/**
 * Rule 4: every connector on one box edge gets its own attach point at
 * `L * k / (N + 1)`, so two lines never leave from the same place. Edges are
 * ordered along the axis of their far endpoint, which is what stops the fan
 * from crossing itself on the way out.
 */
function attachPoints(nodes: Map<string, DiagramNode>, plan: { spec: EdgeSpec; from: Side; to: Side }[]) {
  const slots = new Map<string, { idx: number; key: number }[]>();
  const push = (id: string, side: Side, idx: number, key: number) => {
    const k = `${id}:${side}`;
    const list = slots.get(k) ?? [];
    list.push({ idx, key });
    slots.set(k, list);
  };

  plan.forEach((e, i) => {
    const a = nodes.get(e.spec.from)!;
    const b = nodes.get(e.spec.to)!;
    push(e.spec.from, e.from, i, axis(e.from) === "h" ? b.spec.y : b.spec.x);
    push(e.spec.to, e.to, i, axis(e.to) === "h" ? a.spec.y : a.spec.x);
  });

  const at = new Map<string, Vec>();
  const count = new Map<string, number>();
  for (const [key, list] of slots) {
    count.set(key, list.length);
    const [id, side] = key.split(":") as [string, Side];
    const n = nodes.get(id)!;
    // Along a horizontal edge, order left to right; along a vertical one, top
    // to bottom. Either way the far endpoints keep their relative order.
    list.sort((p, q) => (axis(side) === "h" ? q.key - p.key : p.key - q.key));
    const len = axis(side) === "h" ? n.spec.h! : n.spec.w!;
    list.forEach((item, k) => {
      const off = (len * (k + 1)) / (list.length + 1) - len / 2;
      const p: Vec =
        side === "right"
          ? { x: n.spec.x + n.spec.w! / 2, y: n.spec.y - off }
          : side === "left"
            ? { x: n.spec.x - n.spec.w! / 2, y: n.spec.y - off }
            : side === "top"
              ? { x: n.spec.x + off, y: n.spec.y + n.spec.h! / 2 }
              : { x: n.spec.x + off, y: n.spec.y - n.spec.h! / 2 };
      at.set(`${item.idx}:${key}`, p);
    });
  }
  return { at, count };
}

/**
 * A port with one connector on it has no reason to sit in the middle of its
 * edge: slide it to line up with the far end and the run goes straight.
 *
 * Without this, two boxes 20px out of line get a two-bend elbow with a 20px
 * jog in the middle of it, which is the single clearest tell that a diagram was
 * routed by a machine. A designer slides the port. So does this.
 */
function snapPorts(
  nodes: Map<string, DiagramNode>,
  plan: { spec: EdgeSpec; from: Side; to: Side }[],
  at: Map<string, Vec>,
  count: Map<string, number>,
) {
  const margin = NODE_R + 12;
  plan.forEach((e, i) => {
    if (axis(e.from) !== axis(e.to)) return; // a one-bend route is already clean
    const horizontal = axis(e.from) === "h";
    const kFrom = `${i}:${e.spec.from}:${e.from}`;
    const kTo = `${i}:${e.spec.to}:${e.to}`;
    const a = at.get(kFrom)!;
    const b = at.get(kTo)!;
    const delta = horizontal ? b.y - a.y : b.x - a.x;
    if (Math.abs(delta) < 0.5 || Math.abs(delta) > 2 * R) return; // straight, or a real elbow

    const fits = (n: DiagramNode, v: number) => {
      const half = (horizontal ? n.spec.h! : n.spec.w!) / 2 - margin;
      const c = horizontal ? n.spec.y : n.spec.x;
      return Math.abs(v - c) <= half;
    };
    const soleFrom = count.get(`${e.spec.from}:${e.from}`) === 1;
    const soleTo = count.get(`${e.spec.to}:${e.to}`) === 1;
    const target = horizontal ? "y" : "x";

    if (soleFrom && fits(nodes.get(e.spec.from)!, b[target])) at.set(kFrom, { ...a, [target]: b[target] });
    else if (soleTo && fits(nodes.get(e.spec.to)!, a[target])) at.set(kTo, { ...b, [target]: a[target] });
  });
}

/**
 * Rectilinear waypoints. Rule 1: no segment is ever diagonal, by construction.
 *
 * `corridor` overrides the mid coordinate of a two-bend route, which is how
 * `deconflict` below pulls two routes out of each other's lane.
 */
function waypoints(a: Vec, from: Side, b: Vec, to: Side, corridor?: number): Vec[] {
  const fa = axis(from);
  const ta = axis(to);
  if (fa === "h" && ta === "h") {
    if (Math.abs(a.y - b.y) < 0.5) return [a, b];
    const sameSide = from === to;
    if (sameSide) {
      const ext = from === "right" ? Math.max(a.x, b.x) + 64 : Math.min(a.x, b.x) - 64;
      return [a, { x: ext, y: a.y }, { x: ext, y: b.y }, b];
    }
    const mid = corridor ?? (a.x + b.x) / 2;
    return [a, { x: mid, y: a.y }, { x: mid, y: b.y }, b];
  }
  if (fa === "v" && ta === "v") {
    if (Math.abs(a.x - b.x) < 0.5) return [a, b];
    if (from === to) {
      const ext = from === "top" ? Math.max(a.y, b.y) + 64 : Math.min(a.y, b.y) - 64;
      return [a, { x: a.x, y: ext }, { x: b.x, y: ext }, b];
    }
    const mid = corridor ?? (a.y + b.y) / 2;
    return [a, { x: a.x, y: mid }, { x: b.x, y: mid }, b];
  }
  // One bend: travel on the exit axis, turn once, arrive on the entry axis.
  return fa === "h" ? [a, { x: b.x, y: a.y }, b] : [a, { x: a.x, y: b.y }, b];
}

/**
 * Round every interior corner. A quadratic with its control point on the corner
 * is exactly what their SVG `Q` elbow draws, so this is the same curve, sampled.
 */
function fillet(pts: Vec[], r = R, seg = 6): Vec[] {
  if (pts.length < 3) return pts;
  const out: Vec[] = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const prev = pts[i - 1]!;
    const next = pts[i + 1]!;
    const dIn = Math.hypot(p.x - prev.x, p.y - prev.y);
    const dOut = Math.hypot(next.x - p.x, next.y - p.y);
    const rr = Math.min(r, dIn / 2, dOut / 2);
    if (rr < 1) {
      out.push(p);
      continue;
    }
    const ix = p.x + ((prev.x - p.x) / dIn) * rr;
    const iy = p.y + ((prev.y - p.y) / dIn) * rr;
    const ox = p.x + ((next.x - p.x) / dOut) * rr;
    const oy = p.y + ((next.y - p.y) / dOut) * rr;
    for (let k = 0; k <= seg; k++) {
      const t = k / seg;
      const u = 1 - t;
      out.push({ x: u * u * ix + 2 * u * t * p.x + t * t * ox, y: u * u * iy + 2 * u * t * p.y + t * t * oy });
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}


/**
 * Rule 3, the half a layout cannot avoid on its own: two two-bend routes whose
 * mid corridors land on top of each other.
 *
 * Their answer is "redesign the layout". That is right for a hand-drawn figure
 * and useless to a generator, so the corridors are spread here instead: cluster
 * the ones within `FAN_MIN + 8`, then fan the cluster evenly.
 *
 * The fan is clamped to the band between the two endpoints. Without that clamp
 * a corridor can be pushed to just outside its own source box, and the
 * connector then leaves the node and immediately runs back underneath it — the
 * node's opaque plate hides the segment, and the line appears to start in
 * mid-air. When the band is too narrow to hold the cluster at `FAN_MIN`, the
 * ranks are genuinely too close together and `audit` says so.
 */
function deconflict(routes: { pts: Vec[]; from: Side; two: boolean }[]): {
  shift: (number | undefined)[];
  tight: string[];
} {
  const shift: (number | undefined)[] = routes.map(() => undefined);
  const tight: string[] = [];
  const margin = 24;

  const lanes = (kind: "v" | "h") => {
    const items = routes
      .map((r, i) => ({ i, r }))
      .filter(({ r }) => r.two && (axis(r.from) === "h" ? "v" : "h") === kind)
      .map(({ i, r }) => {
        const a = r.pts[0]!;
        const b = r.pts[r.pts.length - 1]!;
        // The corridor must sit between the two faces it connects.
        const lo = kind === "v" ? Math.min(a.x, b.x) : Math.min(a.y, b.y);
        const hi = kind === "v" ? Math.max(a.x, b.x) : Math.max(a.y, b.y);
        return { i, coord: kind === "v" ? r.pts[1]!.x : r.pts[1]!.y, lo: lo + margin, hi: hi - margin };
      })
      .sort((a, b) => a.coord - b.coord);

    let k = 0;
    while (k < items.length) {
      let j = k + 1;
      while (j < items.length && items[j]!.coord - items[j - 1]!.coord < FAN_MIN + 8) j++;
      const group = items.slice(k, j);
      if (group.length > 1) {
        const lo = Math.max(...group.map((g) => g.lo));
        const hi = Math.min(...group.map((g) => g.hi));
        const room = hi - lo;
        const step = Math.min(FAN_MIN + 8, room / (group.length - 1 || 1));
        if (step < FAN_MIN - 0.5) {
          tight.push(
            `rule 3: ${group.length} routes share one corridor with only ${Math.max(0, Math.round(room))}px of room ` +
              `between the boxes; move the two ranks further apart`,
          );
        }
        const centre = (lo + hi) / 2;
        group.forEach((g, n) => {
          const raw = centre + (n - (group.length - 1) / 2) * step;
          shift[g.i] = Math.round(Math.min(hi, Math.max(lo, raw)) / 8) * 8;
        });
      }
      k = j;
    }
  };
  lanes("v");
  lanes("h");
  return { shift, tight };
}

/** Weight for "which of these two do I bridge?": the lighter line hops. */
function weightOf(e: EdgeSpec): number {
  if (e.dashed) return 0;
  if (e.role === "accent") return 3;
  if (e.role === "link") return 2;
  return 1;
}

/**
 * Their bridge/hop primitive. Where a vertical run crosses a horizontal one,
 * the lighter of the two arcs over the other so both stay traceable.
 *
 * `a 8,8 0 0,1 16,0` in their SVG is a semicircle advancing along the path; the
 * same semicircle, sampled, is spliced into the polyline here.
 */
function hop(pts: Vec[], at: Vec, r = 12, seg = 8): Vec[] {
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!;
    const q = pts[i]!;
    const vertical = Math.abs(p.x - q.x) < 0.5;
    const horizontal = Math.abs(p.y - q.y) < 0.5;
    if (!vertical && !horizontal) continue;
    const lo = vertical ? Math.min(p.y, q.y) : Math.min(p.x, q.x);
    const hi = vertical ? Math.max(p.y, q.y) : Math.max(p.x, q.x);
    const along = vertical ? at.y : at.x;
    const across = vertical ? at.x : at.y;
    if (Math.abs(across - (vertical ? p.x : p.y)) > 0.5) continue;
    if (along < lo + r + 2 || along > hi - r - 2) continue; // no room: leave it crossed
    const dir = vertical ? Math.sign(q.y - p.y) : Math.sign(q.x - p.x);
    const arc: Vec[] = [];
    for (let k = 0; k <= seg; k++) {
      const a2 = Math.PI * (k / seg);
      const alongOff = -Math.cos(a2) * r * dir;
      const acrossOff = Math.sin(a2) * r;
      arc.push(vertical ? { x: at.x + acrossOff, y: at.y + alongOff } : { x: at.x + alongOff, y: at.y - acrossOff });
    }
    return [...pts.slice(0, i), ...arc, ...pts.slice(i)];
  }
  return pts;
}

/** Every proper crossing between two routes, with the lighter one chosen to hop. */
function crossings(routes: { pts: Vec[]; spec: EdgeSpec }[]): Map<number, Vec[]> {
  const out = new Map<number, Vec[]>();
  const segs = routes.flatMap((r, i) =>
    r.pts.slice(1).map((q, k) => ({ i, p: r.pts[k]!, q })).filter((s) => {
      const len = Math.hypot(s.q.x - s.p.x, s.q.y - s.p.y);
      return len > 24 && (Math.abs(s.p.x - s.q.x) < 0.5 || Math.abs(s.p.y - s.q.y) < 0.5);
    }),
  );
  for (let a = 0; a < segs.length; a++) {
    for (let b = a + 1; b < segs.length; b++) {
      const s = segs[a]!;
      const t2 = segs[b]!;
      if (s.i === t2.i) continue;
      const sVert = Math.abs(s.p.x - s.q.x) < 0.5;
      const tVert = Math.abs(t2.p.x - t2.q.x) < 0.5;
      if (sVert === tVert) continue;
      const v = sVert ? s : t2;
      const h = sVert ? t2 : s;
      const x = v.p.x;
      const y = h.p.y;
      const pad = 10; // a crossing within a corner's radius is a join, not a cross
      if (x < Math.min(h.p.x, h.q.x) + pad || x > Math.max(h.p.x, h.q.x) - pad) continue;
      if (y < Math.min(v.p.y, v.q.y) + pad || y > Math.max(v.p.y, v.q.y) - pad) continue;
      const lighter = weightOf(routes[s.i]!.spec) <= weightOf(routes[t2.i]!.spec) ? s.i : t2.i;
      out.set(lighter, [...(out.get(lighter) ?? []), { x, y }]);
    }
  }
  return out;
}

/** A triangular arrowhead at `at`, pointing along `dir`. Exported for curved and hand-built routes. */
export function arrowHead(at: Vec, dir: Vec, color: string, opacity = 1) {
  const L = 16;
  const Wd = 12;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, -L, Wd / 2, 0, -L, -Wd / 2, 0].map((v, i) => (i % 3 === 2 ? 0 : v * PX)), 3),
  );
  geo.setIndex([0, 1, 2]);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(at.x * PX, at.y * PX, 0);
  mesh.rotation.z = Math.atan2(dir.y, dir.x);
  return mesh;
}

function rectOf(n: DiagramNode, pad = 0) {
  return {
    x0: n.spec.x - n.spec.w! / 2 - pad,
    x1: n.spec.x + n.spec.w! / 2 + pad,
    y0: n.spec.y - n.spec.h! / 2 - pad,
    y1: n.spec.y + n.spec.h! / 2 + pad,
  };
}

const hits = (r: { x0: number; x1: number; y0: number; y1: number }, b: { x0: number; x1: number; y0: number; y1: number }) =>
  r.x0 < b.x1 && r.x1 > b.x0 && r.y0 < b.y1 && r.y1 > b.y0;

/**
 * Rules 2 and 6, done by search instead of by eye.
 *
 * Nodes are hard: a plate that lands on one is covered by it, and the label
 * renders as a fragment on a border. Other routes are soft: the plate is opaque
 * and painted above them, so it masks the line rather than being masked, which
 * is legal but ugly. So a clear placement always beats a masking one, and a
 * masking one always beats dropping the label.
 */
function placeLabel(
  pts: Vec[],
  plateW: number,
  plateH: number,
  boxes: { x0: number; x1: number; y0: number; y1: number }[],
  runs: { x0: number; x1: number; y0: number; y1: number }[] = [],
) {
  type Cand = { pos: Vec; score: number };
  let best: Cand | null = null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const horizontal = Math.abs(a.y - b.y) < 0.5;
    const vertical = Math.abs(a.x - b.x) < 0.5;
    if (!horizontal && !vertical) continue;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < plateH + LABEL_GAP * 2) continue;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const offs: Vec[] = horizontal
      ? [
          { x: mid.x, y: mid.y + LABEL_GAP + plateH / 2 },
          { x: mid.x, y: mid.y - LABEL_GAP - plateH / 2 },
        ]
      : [
          { x: mid.x + LABEL_GAP + plateW / 2, y: mid.y },
          { x: mid.x - LABEL_GAP - plateW / 2, y: mid.y },
        ];
    for (const pos of offs) {
      const plate = { x0: pos.x - plateW / 2, x1: pos.x + plateW / 2, y0: pos.y - plateH / 2, y1: pos.y + plateH / 2 };
      if (boxes.some((b2) => hits(plate, b2))) continue;
      // Prefer a vertical segment, as their elbow spec does, then length, and
      // pay a heavy penalty for masking another route.
      const score = len + (vertical ? 400 : 0) - (runs.some((r) => hits(plate, r)) ? 600 : 0);
      if (!best || score > best.score) best = { pos, score };
    }
  }
  return best?.pos ?? null;
}

/** How the diagram is read. A ranked graph is "vertical"; a pipeline is "horizontal". */
export type Flow = "vertical" | "horizontal";

export interface Wiring {
  nodes: DiagramNode[];
  edges: Edge[];
  group: THREE.Group;
  /** Corridors the router could not space properly: the layout is too tight. */
  tight: string[];
}

/**
 * Build every connector at once.
 *
 * It has to be one call: rule 4 needs to know how many lines share a box edge
 * before it can place any of them, and the label search needs every node box.
 */
export function wire(
  nodeList: DiagramNode[],
  specs: EdgeSpec[],
  skin: Skin = LIGHT,
  opts: { flow?: Flow } = {},
): Wiring {
  const nodes = new Map(nodeList.map((n) => [n.spec.id, n]));
  const plan = specs.map((spec) => {
    const a = nodes.get(spec.from);
    const b = nodes.get(spec.to);
    if (!a || !b) throw new Error(`edge ${spec.from}->${spec.to}: unknown node`);
    const [from, to] = sides(a, b, spec, opts.flow);
    return { spec, from, to };
  });

  const { at, count } = attachPoints(nodes, plan);
  snapPorts(nodes, plan, at, count);
  const boxes = nodeList.map((n) => rectOf(n, 8));
  const group = new THREE.Group();
  group.name = "edges";

  const raw = plan.map((e, i) => {
    const start = at.get(`${i}:${e.spec.from}:${e.from}`)!;
    const end = at.get(`${i}:${e.spec.to}:${e.to}`)!;
    const pts = waypoints(start, e.from, end, e.to);
    return { start, end, pts, from: e.from, two: pts.length === 4 };
  });
  const { shift: shifts, tight } = deconflict(raw);

  // Route for real, then bridge whatever still crosses.
  const routed = plan.map((e, i) => ({ spec: e.spec, pts: waypoints(raw[i]!.start, e.from, raw[i]!.end, e.to, shifts[i]) }));
  const hops = crossings(routed);
  const finalPts = routed.map((r, i) => {
    let pts = r.pts;
    for (const c of hops.get(i) ?? []) pts = hop(pts, c);
    return fillet(pts);
  });
  // Label plates must clear other routes too, not just nodes (their rule 6,
  // which only has to think about boxes because an SVG label is drawn last).
  const runRects = finalPts.flatMap((pts, i) =>
    pts.slice(1).map((q, k) => {
      const pPt = pts[k]!;
      return {
        i,
        x0: Math.min(pPt.x, q.x) - 6,
        x1: Math.max(pPt.x, q.x) + 6,
        y0: Math.min(pPt.y, q.y) - 6,
        y1: Math.max(pPt.y, q.y) + 6,
      };
    }),
  );

  const edges: Edge[] = plan.map((e, i) => {
    const role = e.spec.role ?? "default";
    const color = role === "accent" ? skin.accent : role === "link" ? skin.link : skin.muted;
    const pts = finalPts[i]!;
    const otherRuns = runRects.filter((r) => r.i !== i);

    const g = new THREE.Group();
    g.name = `${e.spec.from}-to-${e.spec.to}`;
    // The head is pulled back so the ribbon does not poke through its tip.
    const headBack = 14;
    const last = pts[pts.length - 1]!;
    const prev = pts[pts.length - 2]!;
    const dl = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
    const dir = { x: (last.x - prev.x) / dl, y: (last.y - prev.y) / dl };
    const trimmed = [...pts.slice(0, -1), { x: last.x - dir.x * headBack, y: last.y - dir.y * headBack }];

    const line = stroke(trimmed, {
      color,
      width: e.spec.dashed ? STROKE * 0.75 : STROKE,
      dash: e.spec.dashed ? [8, 6] : undefined,
    });
    const head = arrowHead(last, dir, color, 1);
    g.add(line, head);
    onTop(line, 6);
    onTop(head, 7);

    let text: Label | null = null;
    let plate: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial> | null = null;
    if (e.spec.label) {
      const style: TypeStyle = { size: RAMP.edge, weight: 400, color: skin.soft, font: MONO, tracking: 0.06 };
      const plateW = measure(e.spec.label, style) + 20;
      const plateH = 26;
      const pos = placeLabel(pts, plateW, plateH, boxes, otherRuns);
      if (pos) {
        plate = rect(plateW, plateH, 2, skin.paper, 1);
        plate.position.set(pos.x * PX, pos.y * PX, 0);
        text = label(e.spec.label, style);
        text.position.copy(plate.position);
        g.add(plate, text);
        onTop(plate, 8);
        onTop(text, 9);
      } else {
        g.userData.labelNeeds = Math.ceil(plateW + 24);
      }
    }

    return {
      spec: e.spec,
      group: g,
      pts,
      reveal(p: number) {
        const k = Math.min(1, Math.max(0, p));
        g.visible = k > 0.001;
        setStroke(line, { progress: Math.min(1, k / 0.8) });
        const landed = Math.min(1, Math.max(0, (k - 0.8) / 0.2));
        head.material.opacity = landed;
        head.visible = landed > 0.001;
        head.scale.setScalar(0.6 + 0.4 * landed);
        if (plate) plate.material.opacity = landed;
        if (text) setLabel(text, { opacity: landed });
      },
    };
  });

  for (const e of edges) group.add(e.group);
  return { nodes: nodeList, edges, group, tight };
}

// ---------------------------------------------------------------------------
// The audit: the six connector rules and the budget, checked in code
// ---------------------------------------------------------------------------

/**
 * What `verify-geometry.py` does for their HTML, for a scene graph instead.
 * Call it once in the builder while authoring and log what comes back; it is
 * builder-time only and allocates nothing per frame.
 */
export function audit(w: Wiring): string[] {
  const out: string[] = [...w.tight];
  const { nodes, edges } = w;

  if (nodes.length > 9) out.push(`budget: ${nodes.length} nodes, max 9 (split into overview + detail)`);
  if (edges.length > 12) out.push(`budget: ${edges.length} connectors, max 12`);
  const focal = nodes.filter((n) => n.spec.kind === "focal").length;
  if (focal > 2) out.push(`budget: ${focal} focal nodes, max 2 (accent is editorial, not a flag)`);

  for (const n of nodes) {
    const s = n.spec;
    for (const [k, v] of Object.entries({ x: s.x, y: s.y, w: s.w, h: s.h })) {
      if (v! % GRID !== 0) out.push(`grid: ${s.id}.${k} = ${v} is off the ${GRID}px grid`);
    }
  }

  const boxes = nodes.map((n) => ({ id: n.spec.id, r: rectOf(n) }));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (hits(a.r, b.r)) out.push(`layout: ${a.id} and ${b.id} overlap`);
    }
  }

  for (const e of edges) {
    // Rule 1, belt and braces: nothing diagonal survived the fillet.
    for (let i = 1; i < e.pts.length; i++) {
      const a = e.pts[i - 1]!;
      const b = e.pts[i]!;
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if (dx > 0.5 && dy > 0.5 && Math.hypot(dx, dy) > R * 1.6) {
        out.push(`rule 1: ${e.spec.from}->${e.spec.to} has a diagonal segment`);
        break;
      }
    }
    // Rule 5: transit behind a box that is not an endpoint.
    for (const b of boxes) {
      if (b.id === e.spec.from || b.id === e.spec.to) continue;
      const inside = e.pts.some((p) => p.x > b.r.x0 && p.x < b.r.x1 && p.y > b.r.y0 && p.y < b.r.y1);
      if (inside && !e.spec.dashed) {
        out.push(`rule 5: ${e.spec.from}->${e.spec.to} crosses ${b.id}, which is not an endpoint (reroute, or mark it dashed)`);
      }
    }
    if (e.spec.label && e.spec.label.length > 14) {
      out.push(`rule 2: label "${e.spec.label}" is ${e.spec.label.length} characters, max 14`);
    }
    // placeLabel found nowhere clear to sit. Say how much room it wanted: the
    // fix is always more space, and guessing how much is the slow part.
    const needs = e.group.userData.labelNeeds as number | undefined;
    if (needs) {
      out.push(
        `rule 6: label "${e.spec.label}" on ${e.spec.from}->${e.spec.to} has nowhere clear to sit; ` +
          `it needs about ${needs}px of run clear of both boxes, so widen the gap or drop the label`,
      );
    }
  }

  // Rule 3 proper: two parallel runs sharing a lane, which is not visible from
  // the endpoints alone.
  const runs: { id: string; kind: "v" | "h"; coord: number; a: number; b: number }[] = [];
  for (const e of edges) {
    for (let i = 1; i < e.pts.length; i++) {
      const p = e.pts[i - 1]!;
      const q = e.pts[i]!;
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (len < 40) continue;
      const id = `${e.spec.from}->${e.spec.to}`;
      if (Math.abs(p.x - q.x) < 0.5) runs.push({ id, kind: "v", coord: p.x, a: Math.min(p.y, q.y), b: Math.max(p.y, q.y) });
      else if (Math.abs(p.y - q.y) < 0.5) runs.push({ id, kind: "h", coord: p.y, a: Math.min(p.x, q.x), b: Math.max(p.x, q.x) });
    }
  }
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i]!;
      const b = runs[j]!;
      if (a.id === b.id || a.kind !== b.kind) continue;
      const overlap = Math.min(a.b, b.b) - Math.max(a.a, b.a);
      if (Math.abs(a.coord - b.coord) < FAN_MIN - 0.5 && overlap > 24) {
        out.push(`rule 3: ${a.id} and ${b.id} run ${Math.abs(a.coord - b.coord).toFixed(0)}px apart for ${overlap.toFixed(0)}px, min ${FAN_MIN}`);
      }
    }
  }

  // Rule 4: two attach points too close to tell apart.
  const ends: { id: string; p: Vec }[] = [];
  for (const e of edges) {
    ends.push({ id: `${e.spec.from}->${e.spec.to}`, p: e.pts[0]! });
    ends.push({ id: `${e.spec.from}->${e.spec.to}`, p: e.pts[e.pts.length - 1]! });
  }
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      const a = ends[i]!;
      const b = ends[j]!;
      const d = Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y);
      if (d < FAN_MIN - 0.5 && a.id !== b.id) {
        out.push(`rule 4: ${a.id} and ${b.id} attach ${d.toFixed(0)}px apart, min ${FAN_MIN}`);
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Node shapes beyond the rectangle
// ---------------------------------------------------------------------------

export type NodeShape = "rect" | "diamond" | "pill" | "cylinder" | "hex";

/**
 * The outline of a node, in px, centred on the origin.
 *
 * A shape is grammar, not decoration: a diamond means the flow splits here, a
 * cylinder means durable state, a pill means a terminus. Using one for a look
 * is how a diagram stops meaning anything.
 */
export function shapePath(shape: NodeShape, w: number, h: number): Vec[] {
  const x = w / 2;
  const y = h / 2;
  switch (shape) {
    case "diamond":
      return [{ x, y: 0 }, { x: 0, y }, { x: -x, y: 0 }, { x: 0, y: -y }];
    case "pill":
      return roundedRect(w, h, h / 2, 10);
    case "hex": {
      const c = Math.min(28, w / 4);
      return [
        { x: -x + c, y },
        { x: x - c, y },
        { x, y: 0 },
        { x: x - c, y: -y },
        { x: -x + c, y: -y },
        { x: -x, y: 0 },
      ];
    }
    case "cylinder": {
      // A store, drawn as a cylinder seen from slightly above: the body, with
      // the top ellipse closing it. One path, so the draw-on still works.
      const e = Math.min(18, h / 5);
      const pts: Vec[] = [];
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI * (i / 20);
        pts.push({ x: Math.cos(a) * x, y: y - e + Math.sin(a) * e });
      }
      pts.push({ x: -x, y: -y + e });
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI + Math.PI * (i / 20);
        pts.push({ x: Math.cos(a) * -x, y: -y + e + Math.sin(a) * -e });
      }
      return pts;
    }
    default:
      return roundedRect(w, h, NODE_R);
  }
}

// ---------------------------------------------------------------------------
// Compartment nodes: an entity, a class, a table
// ---------------------------------------------------------------------------

export interface Row {
  text: string;
  /** Right-hand column: a type, a cardinality, a modifier. */
  meta?: string;
  /** Keys, abstract members, the primary identifier. */
  accent?: boolean;
}

export interface CompartmentSpec {
  id: string;
  x: number;
  /** Centre of the box. Ignored when `top` is given. */
  y: number;
  /**
   * Top edge instead of the centre. A row of entities with different field
   * counts has to share a top edge, not a centre line, or the row reads as
   * though the boxes are at different depths.
   */
  top?: number;
  w?: number;
  /** Header: the entity, class or table name. */
  name: string;
  /** `<<interface>>`, a schema, a stereotype. */
  tag?: string;
  rows: Row[];
  kind?: NodeKind;
}

/**
 * A box with a header and a list of rows: an ER entity, a UML class, a table.
 *
 * Height is derived from the row count rather than chosen, which is the only
 * way a row of these lines up: five entities with different field counts must
 * share a top edge, not a centre line. The caller gives `y` as the centre, and
 * `audit` still sees an ordinary node, so routing and the connector rules apply
 * unchanged.
 */
export function compartment(spec: CompartmentSpec, skin: Skin = LIGHT): DiagramNode {
  const w = spec.w ?? 320;
  const header = 76;
  const rowH = 40;
  const h = header + spec.rows.length * rowH + 12;
  const kind = spec.kind ?? "backend";
  const t = treatment(kind, skin);

  const cy = spec.top === undefined ? spec.y : spec.top - h / 2;
  const group = new THREE.Group();
  group.name = spec.id;
  group.position.set(spec.x * PX, cy * PX, 0);

  const plate = rect(w, h, NODE_R, skin.paper, 1);
  const fill = rect(w, h, NODE_R, t.fill, t.fillOpacity);
  const outline = stroke(roundedRect(w, h, NODE_R), { color: t.stroke, opacity: t.strokeOpacity, width: STROKE }, true);
  const divider = stroke(
    [{ x: -w / 2, y: h / 2 - header }, { x: w / 2, y: h / 2 - header }],
    { color: t.stroke, opacity: 0.35, width: STROKE },
  );
  group.add(plate, fill, outline, divider);

  const texts: Label[] = [];
  const name = label(spec.name, { size: RAMP.name, weight: 500, color: skin.ink, font: SANS }, "left");
  name.position.set((-w / 2 + 20) * PX, (h / 2 - 44) * PX, 0);
  texts.push(name);
  if (spec.tag) {
    const tg = label(spec.tag, { size: RAMP.tag, weight: 400, color: skin.soft, font: MONO, tracking: 0.08 }, "left");
    tg.position.set((-w / 2 + 20) * PX, (h / 2 - 18) * PX, 0);
    texts.push(tg);
  }

  spec.rows.forEach((row, i) => {
    const y = h / 2 - header - rowH * (i + 0.5);
    const main = label(row.text, {
      size: RAMP.sub,
      weight: 400,
      color: row.accent ? skin.accent : skin.ink,
      font: MONO,
      tracking: 0,
    }, "left");
    main.position.set((-w / 2 + 20) * PX, y * PX, 0);
    texts.push(main);
    if (row.meta) {
      const metaStyle: TypeStyle = { size: RAMP.sub, weight: 400, color: skin.soft, font: MONO, tracking: 0 };
      const meta = label(row.meta, metaStyle);
      meta.position.set((w / 2 - 20 - measure(row.meta, metaStyle) / 2) * PX, y * PX, 0);
      texts.push(meta);
    }
  });

  for (const x of texts) group.add(x);
  onTop(plate, 10);
  onTop(fill, 11);
  onTop(outline, 12);
  onTop(divider, 12);
  for (const x of texts) onTop(x, 14);

  const restY = group.position.y;
  return {
    spec: { ...spec, w, h, kind, name: spec.name, y: cy },
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.position.y = restY - (1 - k) * 8 * PX;
      group.visible = k > 0.001;
      plate.material.opacity = k;
      fill.material.opacity = t.fillOpacity * k;
      setStroke(outline, { opacity: t.strokeOpacity * k, progress: 1 });
      setStroke(divider, { opacity: 0.35 * k, progress: 1 });
      for (const x of texts) setLabel(x, { opacity: k });
    },
  };
}

// ---------------------------------------------------------------------------
// Lifelines and lanes
// ---------------------------------------------------------------------------

export interface LifelineSpec {
  id: string;
  x: number;
  /** The head sits at `top`; the line runs down to `bottom`. */
  top: number;
  bottom: number;
  name: string;
  sub?: string;
  kind?: NodeKind;
}

/**
 * One actor in a sequence diagram: a head box and the dashed line below it.
 *
 * Messages between lifelines are ordinary strokes drawn at a y that reads as a
 * time, so time runs down the frame and the reveal order is the sequence. That
 * is the one diagram type where the animation and the content are the same
 * thing, and it is worth the extra primitive.
 */
export function lifeline(spec: LifelineSpec, skin: Skin = LIGHT) {
  const w = 240;
  const h = 96;
  const head = node(
    { id: spec.id, x: spec.x, y: spec.top - h / 2, w, h, name: spec.name, sub: spec.sub, kind: spec.kind ?? "backend" },
    skin,
  );
  const line = stroke(
    [{ x: spec.x, y: spec.top - h }, { x: spec.x, y: spec.bottom }],
    { color: skin.ink, opacity: 0.25, width: STROKE, dash: [10, 8] },
  );
  const group = new THREE.Group();
  group.name = `lifeline-${spec.id}`;
  group.add(head.group, line);
  onTop(line, 4);

  const bars: { mesh: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>; from: number; to: number }[] = [];
  return {
    group,
    head,
    x: spec.x,
    /** An activation bar: this actor is busy between these two message times. */
    activate(from: number, to: number, accent = false) {
      const mesh = rect(16, Math.abs(to - from), 2, accent ? skin.accent : skin.muted, 1);
      mesh.position.set(spec.x * PX, ((from + to) / 2) * PX, 0);
      group.add(mesh);
      onTop(mesh, 5);
      bars.push({ mesh, from, to });
      return mesh;
    },
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      head.reveal(k);
      setStroke(line, { progress: k, opacity: 0.25 });
    },
    revealBar(i: number, p: number) {
      const b = bars[i];
      if (!b) return;
      const k = Math.min(1, Math.max(0, p));
      b.mesh.visible = k > 0.001;
      b.mesh.material.opacity = k;
      b.mesh.scale.y = Math.max(1e-4, k);
      b.mesh.position.y = (b.from + (b.to - b.from) * k * 0.5) * PX;
    },
  };
}

export interface LaneSpec {
  /** Lanes stack down the frame; `y` is the centre of this one. */
  y: number;
  x: number;
  w: number;
  h: number;
  title: string;
  accent?: boolean;
}

/**
 * One swimlane: a titled horizontal band a process crosses.
 *
 * The title sits in a gutter outside the band, never inside it, so a lane's
 * first node can start at the band's left edge. Alternate bands carry a 2% wash
 * so the eye can follow one across a wide frame without a rule between every
 * pair.
 */
export function lane(spec: LaneSpec, index: number, skin: Skin = LIGHT) {
  const gutter = 200;
  const group = new THREE.Group();
  const wash = rect(spec.w, spec.h, 0, skin.ink, index % 2 === 0 ? 0.03 : 0.01);
  wash.position.set(spec.x * PX, spec.y * PX, 0);
  const rule = stroke(
    [{ x: spec.x - spec.w / 2 - gutter, y: spec.y + spec.h / 2 }, { x: spec.x + spec.w / 2, y: spec.y + spec.h / 2 }],
    { color: skin.ink, width: 1, opacity: 0.1 },
  );
  const style: TypeStyle = { size: RAMP.zone, weight: 400, color: spec.accent ? skin.accent : skin.soft, font: MONO, tracking: 0.14 };
  const title = label(spec.title, style, "left");
  title.position.set((spec.x - spec.w / 2 - gutter + 8) * PX, spec.y * PX, 0);
  group.add(wash, rule, title);
  onTop(wash, 2);
  onTop(rule, 3);
  onTop(title, 5);
  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      wash.material.opacity = (index % 2 === 0 ? 0.03 : 0.01) * k;
      setStroke(rule, { opacity: 0.1 * k });
      setLabel(title, { opacity: k });
    },
  };
}

// ---------------------------------------------------------------------------
// Page furniture
// ---------------------------------------------------------------------------

/** The paper. One flat fill behind everything, sized past the frame edge. */
export function backdrop(width: number, height: number, skin: Skin = LIGHT) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width * PX * 1.2, height * PX * 1.2),
    new THREE.MeshBasicMaterial({ color: skin.paper }),
  );
  mesh.position.z = -0.2;
  return mesh;
}

/**
 * Eyebrow and title, top left.
 *
 * Every diagram scene has them and they are always in the same place: a diagram
 * that has to be read needs to say what it is before the reader starts tracing.
 * The title blurs up rather than sliding, so the eye settles on it once and
 * then leaves it alone.
 */
export function header(eyebrow: string, title: string, o: { x?: number; y?: number; skin?: Skin; size?: number } = {}) {
  const skin = o.skin ?? LIGHT;
  const x = o.x ?? -800;
  const y = o.y ?? 400;
  const group = new THREE.Group();
  const eb = label(eyebrow, { size: RAMP.zone, weight: 400, color: skin.soft, font: MONO, tracking: 0.18 }, "left");
  eb.position.set(x * PX, y * PX, 0);
  const tt = label(title, { size: o.size ?? 64, weight: 500, color: skin.ink, font: SANS }, "left");
  tt.position.set(x * PX, (y - 68) * PX, 0);
  group.add(eb, tt);
  onTop(eb, 20);
  onTop(tt, 20);
  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      setLabel(eb, { opacity: k });
      setLabel(tt, { opacity: k, blur: 10 * (1 - k) });
    },
  };
}

// ---------------------------------------------------------------------------
// The scene wrapper
// ---------------------------------------------------------------------------

export interface Revealable {
  reveal(t: number): void;
}

/** One group of things that arrive together, staggered. */
export interface Wave {
  items: Revealable[];
  /** Frame the first item starts on. */
  at: number;
  /** Frames between one item and the next. */
  stagger?: number;
  /** Frames each item takes. */
  dur?: number;
  ease?: (t: number) => number;
}

export interface StageApi {
  add(...objects: THREE.Object3D[]): void;
  skin: Skin;
  width: number;
  height: number;
}

/**
 * Everything every diagram scene does the same way: load the faces, lay the
 * paper, set the camera, put the eyebrow and title top left, and run the waves.
 *
 * It exists because the interesting part of a diagram scene is the diagram, and
 * a scene that spends forty lines on furniture before it gets there is forty
 * lines in which the furniture can be wrong. A wave is a group of things that
 * arrive together: zones, then nodes, then connectors, in that order, always.
 */
export function stage(
  ctx: ThreeSceneContext,
  opts: { eyebrow: string; title: string; fonts: FontFile[]; skin?: Skin; titleSize?: number },
  build: (api: StageApi) => Wave[],
): ThreeSceneUpdate {
  const skin = opts.skin ?? LIGHT;
  return withFonts(ctx, opts.fonts, () => {
    fitCamera(ctx.camera, ctx.height);
    ctx.scene.add(backdrop(ctx.width, ctx.height, skin));
    const head = header(opts.eyebrow, opts.title, { skin, size: opts.titleSize });
    ctx.scene.add(head.group);

    const art = new THREE.Group();
    art.position.y = -40 * PX; // the header owns the top of the frame
    ctx.scene.add(art);

    const waves = build({
      add: (...objects) => art.add(...objects),
      skin,
      width: ctx.width,
      height: ctx.height,
    });

    return ({ frame }) => {
      head.reveal(prog(frame, 0, 14, outCubic));
      for (const w of waves) {
        const stagger = w.stagger ?? 6;
        const dur = w.dur ?? 14;
        const ease = w.ease ?? outQuart;
        w.items.forEach((item, i) => item.reveal(prog(frame, w.at + i * stagger, dur, ease)));
      }
      art.scale.setScalar(1.015 - 0.015 * prog(frame, 0, 150, outCubic));
    };
  });
}

/**
 * Report the audit through the one channel the toolchain forwards, so a diagram
 * that breaks a connector rule fails the project's check instead of shipping.
 */
export function check(...wirings: Wiring[]) {
  const problems = wirings.flatMap(audit);
  if (problems.length) console.error("diagram audit: " + problems.join(" | "));
}

/**
 * A self-transition: out of a node and back into it.
 *
 * The orthogonal router cannot make one, because both ends are the same box.
 * It is the one place a connector may leave the grid, and it sits outside the
 * node so it never covers the name.
 */
export function selfEdge(
  n: DiagramNode,
  text: string,
  o: { side?: "top" | "right"; skin?: Skin; role?: EdgeRole } = {},
): Revealable & { group: THREE.Group } {
  const skin = o.skin ?? LIGHT;
  const side = o.side ?? "top";
  const color = o.role === "accent" ? skin.accent : o.role === "link" ? skin.link : skin.muted;
  const pts = selfLoop({ x: n.spec.x, y: n.spec.y }, n.spec.w!, n.spec.h!, side);
  const group = new THREE.Group();
  const last = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2]!;
  const d = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
  const dir = { x: (last.x - prev.x) / d, y: (last.y - prev.y) / d };
  const line = stroke(pts.slice(0, -1), { color, width: STROKE });
  const head = arrowHead(last, dir, color);
  group.add(line, head);
  onTop(line, 6);
  onTop(head, 7);

  const style: TypeStyle = { size: RAMP.edge, weight: 400, color: skin.soft, font: MONO, tracking: 0.06 };
  const plateW = measure(text, style) + 20;
  const plate = rect(plateW, 26, 2, skin.paper, 1);
  const lp = side === "top" ? { x: n.spec.x, y: n.spec.y + n.spec.h! / 2 + 72 } : { x: n.spec.x + n.spec.w! / 2 + 72, y: n.spec.y };
  plate.position.set(lp.x * PX, lp.y * PX, 0);
  const label3 = label(text, style);
  label3.position.copy(plate.position);
  group.add(plate, label3);
  onTop(plate, 8);
  onTop(label3, 9);

  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      setStroke(line, { progress: Math.min(1, k / 0.8) });
      const landed = Math.min(1, Math.max(0, (k - 0.8) / 0.2));
      head.material.opacity = landed;
      plate.material.opacity = landed;
      setLabel(label3, { opacity: landed });
    },
  };
}

/**
 * One message in a sequence diagram: a horizontal run from one lifeline to
 * another at a y that reads as a time.
 *
 * Deliberately not routed by `wire()`. A sequence has no topology to route —
 * time is the y axis, the lifelines are fixed, and every message is a straight
 * line. Putting it through the orthogonal router would invent elbows that mean
 * nothing.
 */
export function message(
  from: number,
  to: number,
  y: number,
  text: string,
  o: { skin?: Skin; dashed?: boolean; role?: EdgeRole } = {},
): Revealable & { group: THREE.Group } {
  const skin = o.skin ?? LIGHT;
  const color = o.role === "accent" ? skin.accent : o.role === "link" ? skin.link : skin.muted;
  const dir = Math.sign(to - from) || 1;
  const end = to - dir * 14;
  const group = new THREE.Group();
  const line = stroke([{ x: from, y }, { x: end, y }], {
    color,
    width: o.dashed ? STROKE * 0.75 : STROKE,
    dash: o.dashed ? [8, 6] : undefined,
  });
  const head = arrowHead({ x: to, y }, { x: dir, y: 0 }, color);
  group.add(line, head);
  onTop(line, 6);
  onTop(head, 7);

  const style: TypeStyle = { size: RAMP.edge, weight: 400, color: skin.soft, font: MONO, tracking: 0.06 };
  const text3 = label(text, style);
  text3.position.set(((from + to) / 2) * PX, (y + 26) * PX, 0);
  group.add(text3);
  onTop(text3, 9);

  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      setStroke(line, { progress: Math.min(1, k / 0.75) });
      const landed = Math.min(1, Math.max(0, (k - 0.75) / 0.25));
      head.material.opacity = landed;
      setLabel(text3, { opacity: landed });
    },
  };
}
```

## 2. API at a glance

| Call | What |
| --- | --- |
| `stage(ctx, opts, build)` | The scene wrapper: fonts, paper, camera, header, and the reveal waves. Every diagram scene is one of these |
| `check(...wirings)` | Report the audit through the error channel, so a broken diagram fails the project's check |
| `node(spec, skin)` | One box: opaque plate, tinted fill, hairline outline, type tag, name, mono sublabel. `shape` picks rect / diamond / pill / cylinder / hex |
| `compartment(spec, skin)` | A header plus rows: an ER entity, a UML class, a table. Height derives from the row count; `top` aligns a row of them by their top edge |
| `zone(spec, skin)` | A tier or boundary: ink wash, hairline, eyebrow on a paper plate over the line. Max 3 |
| `lane(spec, i, skin)` | One swimlane band, title in a gutter outside it, alternating wash |
| `lifeline(spec, skin)` | A sequence actor: head box, dashed line, `activate(from, to)` bars |
| `message(from, to, y, text)` | One sequence message. Deliberately not routed: time is the y axis, so every message is a straight line |
| `wire(nodes, specs, skin, opts)` | **Every connector at once**, and all the routing decisions below. `opts.flow` is `"vertical"` for a ranked graph, `"horizontal"` for a pipeline |
| `selfEdge(node, text, opts)` | A self-transition, the one connector allowed to leave the grid |
| `audit(wiring)` | The six connector rules and the complexity budget, as a list of problems |
| `stroke(pts, style, closed)` | A polyline as a mitred ribbon, with `progress` and dashes in the shader |
| `rect`, `polyFill`, `roundedRect`, `shapePath`, `arrowHead` | The primitives the chart and shape kits build on |
| `backdrop`, `header` | The paper and the eyebrow/title block, if you are not using `stage` |
| `LIGHT` / `DARK` / `SERIES` | Semantic roles, and the series palette for chart types with overlapping entities |
| `RAMP`, `GRID`, `R`, `NODE_R`, `STROKE`, `LABEL_GAP`, `FAN_MIN`, `W`, `H` | The measurements. Pick node sizes from `W` and `H`; do not invent them |

## 3. What `wire` decides for you

These are the parts of the grammar a generator gets wrong by hand, so `wire()`
owns them. You choose the nodes and what connects to what; it chooses the lines.

- **Ports.** A mainly-vertical run leaves the top or bottom; a mainly-horizontal
  one leaves the side. `flow` overrides that for a ranked graph, except between
  two boxes on the same rank, which always use side ports.
- **Attach points.** `N` connectors on one box edge sit at `L * k / (N + 1)`, so
  no two ever leave from the same place.
- **Port snapping.** A port with only one connector slides to line up with the
  far end and the run goes straight. Without it, two boxes 20px out of line get
  an elbow with a 20px jog, the clearest single tell of machine routing.
- **Corridor deconfliction.** Elbow routes sharing a lane are fanned apart,
  clamped to the band between their two endpoints. When the band is too narrow
  the ranks are genuinely too close and `audit` says so.
- **Crossing hops.** Where a vertical run crosses a horizontal one, the lighter
  of the two arcs over the other.
- **Label placement.** The longest segment through open canvas wins, vertical
  preferred. Node boxes are hard obstacles; other routes are soft, because the
  plate is opaque and painted above them. If nothing is clear the label is
  dropped and `audit` reports how much room it needed.

What is still yours: which nodes exist, where they sit, which one is focal, and
whether the picture is worth drawing at all.

## 4. Why it is built this way

- **Ribbons, not lines.** WebGL ignores `linewidth`, so a `LineBasicMaterial`
  stroke is one device pixel — half a composition px at 2x capture. That is
  where "my diagram looks washed out in the export" comes from. Every stroke
  here is triangles, mitred at the joins, with its width in px.
- **Arc length on the geometry.** Each vertex carries its normalised distance
  along the path and its absolute distance in px. The first gives the draw-on
  for free, including around corners; the second gives dashes that stay the same
  length whatever the route does.
- **Quadratic corners.** Their SVG elbow is `Q mid,y1 mid,y1+8`, a quadratic
  with its control point on the corner. The fillet samples exactly that curve.
- **An opaque plate under every node and label.** Their mask rect. In 3D it is
  also what makes `renderOrder` sufficient: everything sits at z = 0 with depth
  testing off, and paint order alone decides what covers what.
- **A group's renderOrder beats its children's.** three.js sorts by the nearest
  ancestor Group's order first. A label that must sit above a group goes in its
  own group with a higher order, not merely a higher `renderOrder` of its own.
- **Weight caps at 500.** Their node names are 600. This repo gets hierarchy
  from size, and `type.ts` enforces the same cap everywhere else.
