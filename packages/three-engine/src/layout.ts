import * as THREE from "three";

/**
 * Layout for Three.js scenes, solved once in the builder.
 *
 * A Three.js scene has two coordinate systems with opposite conventions: a
 * canvas texture is drawn top-left with y down, and a plane is positioned from
 * its centre with y up. Every UI element crosses that boundary, and across the
 * template catalog the conversion was written out longhand at 721 call sites —
 * `60 - CW / 2 + PAD + 98`, where `98` is half a measured text width worked out
 * by hand. One wrong term and a row sits 17px off with nothing to say so.
 *
 * The other half of the problem is that container sizes were *declared*
 * (`const H = 600`) rather than derived, so adding a row to a card overflowed
 * it into the footer. Here a container's size is the sum of its children.
 *
 * Solve in the builder, animate the meshes. The solve is a pure function of
 * its input, so it costs nothing per frame and renders identically everywhere.
 */

/** A box in layout space: top-left origin, y down, design pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A rect with a name, which is all the audit needs. */
export interface NamedRect extends Rect {
  name: string;
}

/**
 * Something that can be laid out: an object with a known intrinsic size.
 *
 * This is the protocol that makes a label, a chip, a row and a device mockup
 * interchangeable to the solver. `size` is what the solver reads; `object` is
 * what it positions.
 */
export interface Element {
  object: THREE.Object3D;
  /** Intrinsic size in design px — a chip is as wide as its text plus padding. */
  size: { w: number; h: number };
}

export type Padding = number | [number, number] | [number, number, number, number];

export interface BoxSpec {
  /** Addressable in `rect()`, `place()` and the audit. Unnamed boxes still lay out. */
  name?: string;
  /** Fixed size. Omitted on a container means "as big as the children need". */
  w?: number;
  h?: number;
  /** Share of the leftover space on the main axis. A bare `{ grow: 1 }` is a spacer. */
  grow?: number;
  dir?: "row" | "col";
  gap?: number;
  /** `n` | `[y, x]` | `[top, right, bottom, left]`, as in CSS. */
  pad?: Padding;
  /** Distribution along the main axis. */
  main?: "start" | "center" | "end" | "between";
  /** Alignment across it. `stretch` is the default for a child with no cross size. */
  cross?: "start" | "center" | "end" | "stretch";
  children?: BoxSpec[];
  /**
   * An element whose intrinsic size feeds the solve and whose object `mount`
   * positions. Its size wins over `w`/`h`.
   */
  element?: Element;
}

interface Inset {
  t: number;
  r: number;
  b: number;
  l: number;
}

function inset(p: Padding | undefined): Inset {
  if (p == null) return { t: 0, r: 0, b: 0, l: 0 };
  if (typeof p === "number") return { t: p, r: p, b: p, l: p };
  if (p.length === 2) return { t: p[0], r: p[1], b: p[0], l: p[1] };
  return { t: p[0], r: p[1], b: p[2], l: p[3] };
}

interface Node {
  spec: BoxSpec;
  children: Node[];
  /** Intrinsic size, before any growing. */
  base: { w: number; h: number };
  rect: Rect;
}

/** Pass 1: bottom-up, what does this box need? */
function measure(spec: BoxSpec): Node {
  const children = (spec.children ?? []).map(measure);
  const pad = inset(spec.pad);
  const gap = spec.gap ?? 0;
  const row = (spec.dir ?? "col") === "row";

  let w: number;
  let h: number;
  if (spec.element) {
    w = spec.element.size.w;
    h = spec.element.size.h;
  } else if (children.length === 0) {
    w = spec.w ?? 0;
    h = spec.h ?? 0;
  } else {
    const gaps = gap * Math.max(0, children.length - 1);
    const sumW = children.reduce((a, c) => a + c.base.w, 0);
    const sumH = children.reduce((a, c) => a + c.base.h, 0);
    const maxW = children.reduce((a, c) => Math.max(a, c.base.w), 0);
    const maxH = children.reduce((a, c) => Math.max(a, c.base.h), 0);
    w = spec.w ?? (row ? sumW + gaps : maxW) + pad.l + pad.r;
    h = spec.h ?? (row ? maxH : sumH + gaps) + pad.t + pad.b;
  }
  // An explicit w/h always wins, including over an element's intrinsic size.
  if (spec.w != null) w = spec.w;
  if (spec.h != null) h = spec.h;
  return { spec, children, base: { w, h }, rect: { x: 0, y: 0, w, h } };
}

/** Pass 2: top-down, where does everything actually go? */
function position(node: Node, x: number, y: number, w: number, h: number): void {
  node.rect = { x, y, w, h };
  if (node.children.length === 0) return;

  const spec = node.spec;
  const pad = inset(spec.pad);
  const gap = spec.gap ?? 0;
  const row = (spec.dir ?? "col") === "row";
  const main = spec.main ?? "start";
  const cross = spec.cross ?? "stretch";

  const innerX = x + pad.l;
  const innerY = y + pad.t;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const mainSize = row ? innerW : innerH;
  const gaps = gap * Math.max(0, node.children.length - 1);
  const used = node.children.reduce((a, c) => a + (row ? c.base.w : c.base.h), 0) + gaps;
  const free = Math.max(0, mainSize - used);
  const totalGrow = node.children.reduce((a, c) => a + (c.spec.grow ?? 0), 0);

  // `between` only has anything to distribute when nothing is growing.
  const spread = main === "between" && totalGrow === 0 && node.children.length > 1
    ? free / (node.children.length - 1)
    : 0;
  let cursor = 0;
  if (totalGrow === 0 && spread === 0) {
    if (main === "center") cursor = free / 2;
    else if (main === "end") cursor = free;
  }

  for (const child of node.children) {
    const grow = child.spec.grow ?? 0;
    const cw = row ? child.base.w + (totalGrow > 0 ? (free * grow) / totalGrow : 0) : child.base.w;
    const ch = row ? child.base.h : child.base.h + (totalGrow > 0 ? (free * grow) / totalGrow : 0);

    // Cross axis: stretch fills, everything else keeps the intrinsic size.
    let cx: number;
    let cy: number;
    let fw = cw;
    let fh = ch;
    if (row) {
      cx = innerX + cursor;
      if (cross === "stretch" && child.spec.h == null && !child.spec.element) fh = innerH;
      cy = innerY + (cross === "center" ? (innerH - fh) / 2 : cross === "end" ? innerH - fh : 0);
    } else {
      cy = innerY + cursor;
      if (cross === "stretch" && child.spec.w == null && !child.spec.element) fw = innerW;
      cx = innerX + (cross === "center" ? (innerW - fw) / 2 : cross === "end" ? innerW - fw : 0);
    }
    position(child, cx, cy, fw, fh);
    cursor += (row ? cw : ch) + gap + spread;
  }
}

export interface PlaceOptions {
  /** Depth of the placed object, in the parent group's units. Default 0. */
  z?: number;
  /**
   * World units per design pixel. 1 for a pixel-space stage (1 unit = 1px),
   * 0.01 for the `PX` convention. Default 1.
   */
  unit?: number;
}

export interface Layout {
  /** The solved root size. On a container with no fixed `h`, this grew to fit. */
  readonly size: { w: number; h: number };
  /** A named box, in layout space (top-left origin, y down). */
  rect(name: string): Rect;
  /** Every named box. */
  all(): NamedRect[];
  /**
   * Position `object` over a named box, converting layout space (top-left,
   * y down) to Three.js space (centre origin, y up) with the root's centre at
   * the parent's origin. This is the conversion that was being written by hand.
   */
  place(object: THREE.Object3D, name: string, options?: PlaceOptions): void;
  /** `place` every box that carries an element, and add it to `parent`. */
  mount(parent: THREE.Object3D, options?: PlaceOptions): void;
  /** Layout problems in the solved tree. See `auditRects`. */
  audit(options?: AuditOptions): AuditFinding[];
}

/** Solve a box tree. Call once, in the builder. */
export function solve(spec: BoxSpec): Layout {
  const root = measure(spec);
  position(root, 0, 0, root.base.w, root.base.h);

  const named = new Map<string, Node>();
  const elements: Node[] = [];
  (function walk(n: Node) {
    if (n.spec.name) {
      if (named.has(n.spec.name)) {
        throw new Error(`solve: two boxes are named "${n.spec.name}" — names address a box, so they must be unique`);
      }
      named.set(n.spec.name, n);
    }
    if (n.spec.element) elements.push(n);
    n.children.forEach(walk);
  })(root);

  const size = { w: root.rect.w, h: root.rect.h };

  const toWorld = (r: Rect, { z = 0, unit = 1 }: PlaceOptions = {}) => ({
    x: (r.x + r.w / 2 - size.w / 2) * unit,
    y: (size.h / 2 - r.y - r.h / 2) * unit,
    z,
  });

  const layout: Layout = {
    size,
    rect(name) {
      const n = named.get(name);
      if (!n) throw new Error(`layout: no box named "${name}"`);
      return { ...n.rect };
    },
    all() {
      return [...named].map(([name, n]) => ({ name, ...n.rect }));
    },
    place(object, name, options) {
      const p = toWorld(layout.rect(name), options);
      object.position.set(p.x, p.y, p.z);
    },
    mount(parent, options) {
      for (const n of elements) {
        const p = toWorld(n.rect, options);
        n.spec.element!.object.position.set(p.x, p.y, p.z);
        parent.add(n.spec.element!.object);
      }
    },
    audit(options) {
      return auditRects(layout.all(), options);
    },
  };
  return layout;
}

/**
 * One layout problem.
 *
 * `severity` matters because the rules are not equally certain. A partial
 * overlap is a fact: two things are drawn over each other. A near-miss is a
 * guess — two edges a few pixels apart are *usually* a mistake, but two
 * left-aligned labels whose right edges happen to land 1px apart are not
 * related at all. Treat `error` as a failure and `warning` as something to
 * look at.
 */
export interface AuditFinding {
  rule: "overlap" | "near-miss" | "grid" | "empty";
  severity: "error" | "warning";
  message: string;
}

export interface AuditOptions {
  /**
   * Spacing grid. Every edge and size is expected to land on it. 0 disables
   * the check, which is the default: a grid is a house rule, not a law.
   */
  grid?: number;
  /** Two edges this close but not equal read as a mistake. Default 6px. */
  nearMiss?: number;
  /** Boxes to leave out — a full-frame backdrop legitimately covers everything. */
  ignore?: readonly string[];
}

const area = (r: Rect) => r.w * r.h;
const contains = (a: Rect, b: Rect) =>
  a.x <= b.x + 1 && a.y <= b.y + 1 && a.x + a.w >= b.x + b.w - 1 && a.y + a.h >= b.y + b.h - 1;

/**
 * Layout problems in a set of named boxes, as plain English.
 *
 * Deliberately a free function over rects rather than a method, so the same
 * rules run on two different things: the layout tree solved in the builder,
 * and the boxes `describeSceneObjects` projects out of a *rendered* frame.
 * Only the second catches a scene whose per-frame code moved something into a
 * collision, which is most of them.
 *
 * Containment is legal — a card holds its rows. A partial overlap is two
 * things fighting over the same pixels, which never is.
 */
export function auditRects(rects: readonly NamedRect[], options: AuditOptions = {}): AuditFinding[] {
  const { grid = 0, nearMiss = 6, ignore = [] } = options;
  const skip = new Set(ignore);
  const boxes = rects.filter((r) => !skip.has(r.name));
  const out: AuditFinding[] = [];
  const add = (rule: AuditFinding["rule"], severity: AuditFinding["severity"], message: string) =>
    out.push({ rule, severity, message });

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (contains(a, b) || contains(b, a)) continue;
      const ow = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oh = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ow > 1 && oh > 1) {
        // Name the smaller one second: it is usually the one that moved.
        const [big, small] = area(a) >= area(b) ? [a, b] : [b, a];
        add("overlap", "error", `${small.name} and ${big.name} overlap by ${Math.round(ow)}x${Math.round(oh)}px`);
      }
    }
  }

  // Near-miss alignment, on all four edges.
  //
  // Centre-aligned boxes of different sizes legitimately have unequal edges —
  // a 44px mark beside 34px text in a `cross: "center"` row is correct, and an
  // early version of this rule reported all three pairs of it as mistakes. So
  // a pair whose centres agree on an axis is aligned, and is left alone.
  const axes = [
    { axis: "x", size: "w", near: "left", far: "right" },
    { axis: "y", size: "h", near: "top", far: "bottom" },
  ] as const;
  for (const { axis, size, near, far } of axes) {
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const centred = Math.abs(a[axis] + a[size] / 2 - (b[axis] + b[size] / 2)) <= 0.5;
        if (centred) continue;
        for (const [edge, av, bv] of [
          [near, a[axis], b[axis]],
          [far, a[axis] + a[size], b[axis] + b[size]],
        ] as const) {
          const d = Math.abs(av - bv);
          if (d > 0.5 && d <= nearMiss) {
            add(
              "near-miss",
              "warning",
              `${a.name} and ${b.name} ${edge} edges are ${d.toFixed(1)}px apart — align them or separate them properly`,
            );
          }
        }
      }
    }
  }

  if (grid > 0) {
    for (const b of boxes) {
      for (const [k, v] of Object.entries({ x: b.x, y: b.y, w: b.w, h: b.h })) {
        if (Math.abs(v % grid) > 0.01 && Math.abs((v % grid) - grid) > 0.01) {
          add("grid", "warning", `${b.name}.${k} = ${v} is off the ${grid}px grid`);
        }
      }
    }
  }

  for (const b of boxes) {
    if (b.w < 1 || b.h < 1) add("empty", "error", `${b.name} is ${b.w}x${b.h} — it will never be seen`);
  }

  return out;
}
