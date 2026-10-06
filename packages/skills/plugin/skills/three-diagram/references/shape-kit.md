# The shape kit: `components/shapes.ts`

Routed from SKILL.md. Copy it into `components/shapes.ts`.

The geometry the box-and-arrow and chart kits do not cover: circles and wedges
(Venn, polar, radar), arcs (flywheel arrows, self-transitions), cubic ribbons
(Sankey), trapezoids (funnel, pyramid), regular polygons (radar webs), and an
axonometric projection (exploded views, plans).

Everything returns px points for `stroke()` / `polyFill()` rather than meshes, so
a shape can be stroked, filled, both, or fed to the draw-on reveal. `isoSolid`
is the one exception: it returns a built group, because a box is three shaded
faces plus an outline and nobody should assemble that by hand.

Needs `components/diagram.ts` (`diagram-kit.md`).

Contents: 1 The module - 2 API at a glance - 3 Axonometry

## 1. The module

```ts
import * as THREE from "three";
import { PX } from "./stage";
import { LIGHT, STROKE, type Skin, type Vec, polyFill, setStroke, stroke } from "./diagram";

/**
 * The shape kit: the geometry the box-and-arrow and chart kits do not cover.
 *
 * Circles and wedges (Venn, polar, radar, pie), arcs (flywheel arrows, self
 * transitions), cubic ribbons (Sankey), trapezoids (funnel, pyramid), regular
 * polygons (radar webs) and an axonometric projection (exploded views, plans).
 *
 * Everything returns px points for `stroke()` / `polyFill()` rather than meshes,
 * so a shape can be stroked, filled, both, or fed to the draw-on reveal.
 */

/** Points around a circle. Stroke them closed, or fill them. */
export function circle(c: Vec, r: number, seg = 48): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return pts;
}

/** An open arc from `a0` to `a1` radians. The path a flywheel arrow follows. */
export function arc(c: Vec, r: number, a0: number, a1: number, seg = 32): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (a1 - a0) * (i / seg);
    pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return pts;
}

/** A closed annular wedge: polar bar, radar slice, donut segment. */
export function wedge(c: Vec, r0: number, r1: number, a0: number, a1: number, seg = 24): Vec[] {
  return [...arc(c, r1, a0, a1, seg), ...arc(c, r0, a1, a0, seg)];
}

/** A regular polygon. The radar web's rings, and its spokes' endpoints. */
export function polygon(c: Vec, r: number, sides: number, rotation = Math.PI / 2): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return pts;
}

/** A funnel or pyramid level: a trapezoid centred on `c`. */
export function trapezoid(c: Vec, topW: number, bottomW: number, h: number): Vec[] {
  return [
    { x: c.x - topW / 2, y: c.y + h / 2 },
    { x: c.x + topW / 2, y: c.y + h / 2 },
    { x: c.x + bottomW / 2, y: c.y - h / 2 },
    { x: c.x - bottomW / 2, y: c.y - h / 2 },
  ];
}

/**
 * A Sankey band: a quantity leaving one stage at `[aTop, aBottom]` and arriving
 * at the next at `[bTop, bBottom]`, with the width carrying the amount.
 *
 * The edges are cubics with horizontal handles at the midpoint, which is what
 * keeps a band readable where several cross: the flow leaves and arrives
 * perpendicular to its stage, so the eye can pick up either end.
 */
export function ribbon(x0: number, aTop: number, aBottom: number, x1: number, bTop: number, bBottom: number, seg = 32): Vec[] {
  const curve = (y0: number, y1: number) => {
    const out: Vec[] = [];
    const mx = (x0 + x1) / 2;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const u = 1 - t;
      out.push({
        x: u * u * u * x0 + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * x1,
        y: u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1,
      });
    }
    return out;
  };
  return [...curve(aTop, bTop), ...curve(aBottom, bBottom).reverse()];
}

/**
 * A rounded self-transition: out of one edge of a box and back into it.
 *
 * State machines need one and the orthogonal router cannot make one, because
 * both endpoints are on the same node. It is the one place a loop is allowed to
 * leave the grid, and it stays outside the box so it never hides a label.
 */
export function selfLoop(c: Vec, w: number, h: number, side: "top" | "right" = "top", r = 40): Vec[] {
  if (side === "top") {
    const y = c.y + h / 2;
    return [
      { x: c.x - r / 2, y },
      ...arc({ x: c.x, y: y + r * 0.35 }, r * 0.8, Math.PI * 1.15, Math.PI * -0.15, 24),
      { x: c.x + r / 2, y },
    ];
  }
  const x = c.x + w / 2;
  return [
    { x, y: c.y + r / 2 },
    ...arc({ x: x + r * 0.35, y: c.y }, r * 0.8, Math.PI * 0.65, Math.PI * -0.65, 24),
    { x, y: c.y - r / 2 },
  ];
}

// ---------------------------------------------------------------------------
// Axonometry
// ---------------------------------------------------------------------------

/**
 * A true isometric projection: 30 degrees off horizontal on both ground axes.
 *
 * Their exploded and plan types fake this with hand-computed SVG coordinates.
 * Here it is one projection function, which means a part can be moved in z and
 * the drawing simply follows — an exploded view animates by raising `z`, which
 * is the whole reason those two types are worth having in a video at all.
 */
export const ISO = Math.PI / 6;

export function iso(x: number, y: number, z: number): Vec {
  return {
    x: (x - y) * Math.cos(ISO),
    y: (x + y) * Math.sin(ISO) + z,
  };
}

/** The three visible faces of an axis-aligned box, back to front. */
export function isoBox(o: { x: number; y: number; z: number; w: number; d: number; h: number }) {
  const { x, y, z, w, d, h } = o;
  const p = (dx: number, dy: number, dz: number) => iso(x + dx, y + dy, z + dz);
  return {
    top: [p(0, 0, h), p(w, 0, h), p(w, d, h), p(0, d, h)],
    left: [p(0, d, 0), p(0, d, h), p(w, d, h), p(w, d, 0)],
    right: [p(w, 0, 0), p(w, 0, h), p(w, d, h), p(w, d, 0)],
  };
}

/**
 * An isometric box drawn as three shaded faces plus its outline.
 *
 * The three faces take one colour at three opacities, never three colours: the
 * shading is lighting, and a second hue in it reads as a second meaning.
 */
export function isoSolid(
  o: { x: number; y: number; z: number; w: number; d: number; h: number },
  color: string,
  skin: Skin = LIGHT,
  accentFace = false,
) {
  const faces = isoBox(o);
  const group = new THREE.Group();
  const shades: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>[] = [];
  void accentFace;
  // Opaque: the three faces are lighting on one colour, and any translucency
  // turns a stack of parts into mud where they overlap.
  const base = 1;
  for (const [face, lit] of [
    [faces.top, 1],
    [faces.right, 0.78],
    [faces.left, 0.6],
  ] as const) {
    const mesh = polyFill(face, color, base * lit);
    group.add(mesh);
    shades.push(mesh);
  }
  const edges = [
    stroke(faces.top, { color: skin.ink, width: STROKE, opacity: 0.5 }, true),
    stroke(faces.left, { color: skin.ink, width: STROKE, opacity: 0.5 }, true),
    stroke(faces.right, { color: skin.ink, width: STROKE, opacity: 0.5 }, true),
  ];
  for (const e of edges) group.add(e);
  group.renderOrder = 6;

  return {
    group,
    faces,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      shades.forEach((m, i) => (m.material.opacity = base * [1, 0.78, 0.6][i]! * k));
      for (const e of edges) setStroke(e, { opacity: 0.5 * k });
    },
    /** Lift the part along z, which is what an exploded view animates. */
    lift(dz: number) {
      group.position.y = dz * PX;
    },
  };
}
```

## 2. API at a glance

| Call | What |
| --- | --- |
| `circle(c, r, seg)` | Points around a circle. Stroke closed, or fill |
| `arc(c, r, a0, a1)` | An open arc: the path a flywheel arrow follows |
| `wedge(c, r0, r1, a0, a1)` | A closed annular wedge: polar bar, radar slice, donut segment |
| `polygon(c, r, sides)` | A regular polygon: the radar web's rings and its spoke ends |
| `trapezoid(c, topW, bottomW, h)` | One funnel or pyramid level |
| `ribbon(x0, aTop, aBottom, x1, bTop, bBottom)` | A Sankey band, width carrying the amount |
| `selfLoop(c, w, h, side)` | A rounded self-transition, out of a box and back into it |
| `iso(x, y, z)` | True isometric projection: 30 degrees on both ground axes |
| `isoBox(o)` | The three visible faces of an axis-aligned box |
| `isoSolid(o, color, skin)` | Those faces shaded and outlined, with `reveal` and `lift(dz)` |

## 3. Axonometry

This is the one place the port is better than the original rather than merely
equivalent. Their exploded and plan types hand-compute the projected coordinates
for every part. Here it is one projection function over real geometry, so:

- An **exploded view animates by raising `z`**. `lift(dz)` is the whole
  explosion, and nothing is recomputed.
- A **plan is an exploded view that was never exploded**, so both types share
  one primitive.
- A part's projected centre is `(x + y) / 2 + z`. Centre the object on the
  origin in x and y and that collapses to `z`, which is what makes leader lines
  to an exploded stack trivial. Forget it and every leader points at the wrong
  part.

Two rules the projection cannot enforce for you:

- **Paint back to front.** Sort by `x + y` and give each solid an increasing
  `renderOrder`. The whole illusion of depth is paint order, and getting it
  wrong is the one way an axonometric drawing reads as broken.
- **Translate by the projected centre of the grid**, not by half its width. An
  iso drawing is not centred on the middle of its own footprint, and skipping
  this leaves the figure high and right with half the frame empty.
