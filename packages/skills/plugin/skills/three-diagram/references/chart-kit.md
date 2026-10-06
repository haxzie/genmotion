# The chart kit: `components/chart.ts`

Routed from SKILL.md. Copy it into `components/chart.ts`.

Scales, axes and the marks every quantitative type is made of. Same contract as
`diagram.ts` — composition px, y up, origin at the frame centre — so a chart and
a box-and-arrow diagram can sit in one scene on one grid.

Charts here are editorial, not analytical: hairline axes, no chart junk, one
accent, and the numbers readable at a glance from a sofa.

Needs `components/diagram.ts` (`diagram-kit.md`) and `components/type.ts`.

Contents: 1 The module - 2 API at a glance - 3 Rules the marks encode

## 1. The module

```ts
import * as THREE from "three";
import { PX } from "./stage";
import { label, measure, onTop, setLabel, type Label, type TypeStyle } from "./type";
import { GRID, LIGHT, MONO, RAMP, SANS, STROKE, type Skin, type Vec, polyFill, rect, setStroke, stroke } from "./diagram";

/**
 * The chart kit: scales, axes, and the marks every quantitative type is made of.
 *
 * Same contract as `diagram.ts` — composition px, y up, origin at the frame
 * centre — so a chart and a box-and-arrow diagram can sit in one scene on one
 * grid. Charts here are editorial, not analytical: hairline axes, no chart junk,
 * one accent, and the numbers readable at a glance from a sofa.
 */

export const TICK = 12; // px of tick outside the axis line
export const PLOT_PAD = 16; // px of air between the data and the axis

// ---------------------------------------------------------------------------
// Scales
// ---------------------------------------------------------------------------

export interface Linear {
  (v: number): number;
  invert(px: number): number;
  domain: [number, number];
  range: [number, number];
  ticks(count?: number): number[];
}

/** Value -> px. `nice` rounds the domain out to whole tick steps first. */
export function linear(domain: [number, number], range: [number, number], nice = true): Linear {
  let [d0, d1] = domain;
  if (nice) {
    const step = tickStep(d0, d1, 5);
    d0 = Math.floor(d0 / step) * step;
    d1 = Math.ceil(d1 / step) * step;
  }
  if (d1 === d0) d1 = d0 + 1;
  const f = ((v: number) => range[0] + ((v - d0) / (d1 - d0)) * (range[1] - range[0])) as Linear;
  f.domain = [d0, d1];
  f.range = range;
  f.invert = (px: number) => d0 + ((px - range[0]) / (range[1] - range[0])) * (d1 - d0);
  f.ticks = (count = 5) => {
    const step = tickStep(d0, d1, count);
    const out: number[] = [];
    for (let v = Math.ceil(d0 / step) * step; v <= d1 + 1e-9; v += step) out.push(Math.round(v / step) * step);
    return out;
  };
  return f;
}

/** 1, 2, 2.5 or 5 times a power of ten — the only tick steps that read as round. */
export function tickStep(d0: number, d1: number, count: number): number {
  const raw = Math.abs(d1 - d0) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const norm = raw / mag;
  const step = norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.75 ? 2.5 : norm >= 1.2 ? 2 : 1;
  return step * mag;
}

export interface Band {
  (key: string): number;
  bandwidth: number;
  step: number;
  keys: string[];
}

/** Category -> px of the band centre. `pad` is the share of each step left empty. */
export function band(keys: string[], range: [number, number], pad = 0.3): Band {
  const span = range[1] - range[0];
  const step = span / Math.max(1, keys.length);
  const f = ((k: string) => {
    const i = keys.indexOf(k);
    return range[0] + step * (i + 0.5);
  }) as Band;
  f.bandwidth = step * (1 - pad);
  f.step = step;
  f.keys = keys;
  return f;
}

// ---------------------------------------------------------------------------
// Axes
// ---------------------------------------------------------------------------

export interface AxisSpec {
  orient: "bottom" | "left";
  /** The axis line runs along this coordinate: y for bottom, x for left. */
  at: number;
  /** Extent of the line along its own direction. */
  from: number;
  to: number;
  /** Tick positions in px, with the text to draw at each. */
  ticks: { at: number; text: string }[];
  /** Eyebrow naming the quantity. Omit when the ticks already say it. */
  title?: string;
  /** Faint rules across the plot, for a chart read by value rather than shape. */
  grid?: { length: number } | undefined;
}

/**
 * One axis: a hairline, its ticks, its labels and an optional eyebrow.
 *
 * Their rule, kept: the axis is structure, not content. It is `rule` weight, the
 * labels are `soft`, and nothing about it competes with a mark.
 */
export function axis(spec: AxisSpec, skin: Skin = LIGHT) {
  const group = new THREE.Group();
  group.name = `axis-${spec.orient}`;
  const bottom = spec.orient === "bottom";

  const line = stroke(
    bottom
      ? [{ x: spec.from, y: spec.at }, { x: spec.to, y: spec.at }]
      : [{ x: spec.at, y: spec.from }, { x: spec.at, y: spec.to }],
    { color: skin.rule, width: STROKE, opacity: 1 },
  );
  group.add(line);
  onTop(line, 3);

  const style: TypeStyle = { size: RAMP.sub, weight: 400, color: skin.soft, font: MONO, tracking: 0 };
  const texts: Label[] = [];
  const marks: ReturnType<typeof stroke>[] = [];
  for (const t of spec.ticks) {
    const p: Vec = bottom ? { x: t.at, y: spec.at } : { x: spec.at, y: t.at };
    const tick = stroke(
      bottom
        ? [p, { x: p.x, y: p.y - TICK / 2 }]
        : [p, { x: p.x - TICK / 2, y: p.y }],
      { color: skin.rule, width: STROKE },
    );
    marks.push(tick);
    group.add(tick);
    onTop(tick, 3);

    if (spec.grid) {
      const g = stroke(
        bottom
          ? [{ x: t.at, y: spec.at }, { x: t.at, y: spec.at + spec.grid.length }]
          : [{ x: spec.at, y: t.at }, { x: spec.at + spec.grid.length, y: t.at }],
        { color: skin.ink, width: 1, opacity: 0.06 },
      );
      marks.push(g);
      group.add(g);
      onTop(g, 1);
    }

    // A left axis is right-aligned against its ticks; `label` only anchors
    // left or centre, so the centre is pushed back by half the ink.
    const text = label(t.text, style);
    const w = measure(t.text, style);
    text.position.set(
      (bottom ? t.at : spec.at - TICK - 8 - w / 2) * PX,
      (bottom ? spec.at - TICK - 14 : t.at) * PX,
      0,
    );
    texts.push(text);
    group.add(text);
    onTop(text, 5);
  }

  if (spec.title) {
    const eyebrow = label(spec.title, { size: RAMP.tag, weight: 400, color: skin.soft, font: MONO, tracking: 0.14 }, "left");
    eyebrow.position.set(
      (bottom ? spec.from : spec.at - TICK - 8) * PX,
      (bottom ? spec.at - TICK - 48 : spec.to + 28) * PX,
      0,
    );
    if (!bottom) eyebrow.position.x = (spec.at - TICK - 8) * PX;
    texts.push(eyebrow);
    group.add(eyebrow);
    onTop(eyebrow, 5);
  }

  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      setStroke(line, { progress: k, opacity: 1 });
      for (const m of marks) setStroke(m, { opacity: k, progress: 1 });
      for (const t of texts) setLabel(t, { opacity: k });
    },
  };
}

// ---------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------

export interface MarkStyle {
  color?: string;
  opacity?: number;
  /** Hairline around the mark, for a fill too pale to hold its own edge. */
  outline?: string;
}

export interface Mark {
  group: THREE.Group;
  /** 0 -> 1. A bar grows from its baseline; a dot scales; an area wipes. */
  reveal(t: number): void;
}

/**
 * One bar, growing from its baseline.
 *
 * It grows rather than fades because a bar's length is its value: a bar that
 * fades in at full length has already told you the answer before the eye
 * arrives, and a row of them lands as a block instead of as a comparison.
 */
export function bar(o: {
  x: number;
  baseline: number;
  value: number;
  thickness: number;
  horizontal?: boolean;
  style?: MarkStyle;
  skin?: Skin;
}): Mark {
  const skin = o.skin ?? LIGHT;
  const s = o.style ?? {};
  const len = o.value - o.baseline;
  const group = new THREE.Group();
  const body = rect(
    o.horizontal ? Math.abs(len) : o.thickness,
    o.horizontal ? o.thickness : Math.abs(len),
    4,
    s.color ?? skin.muted,
    s.opacity ?? 1,
  );
  group.add(body);
  onTop(body, 6);

  const sign = Math.sign(len) || 1;
  const place = (k: number) => {
    const grown = Math.abs(len) * k;
    if (o.horizontal) {
      body.scale.x = Math.max(1e-4, k);
      body.position.set((o.baseline + (sign * grown) / 2) * PX, o.x * PX, 0);
    } else {
      body.scale.y = Math.max(1e-4, k);
      body.position.set(o.x * PX, (o.baseline + (sign * grown) / 2) * PX, 0);
    }
  };
  place(1);

  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      body.material.opacity = s.opacity ?? 1;
      place(k);
    },
  };
}

/** A dot: scatter point, bubble, beeswarm member, dumbbell end, line vertex. */
export function dot(at: Vec, r: number, style: MarkStyle = {}, skin: Skin = LIGHT, seg = 24): Mark {
  const pts: Vec[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push({ x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r });
  }
  const group = new THREE.Group();
  const fill = polyFill(pts, style.color ?? skin.muted, style.opacity ?? 1);
  group.add(fill);
  onTop(fill, 7);
  let ring: ReturnType<typeof stroke> | null = null;
  if (style.outline) {
    ring = stroke(pts, { color: style.outline, width: STROKE }, true);
    group.add(ring);
    onTop(ring, 8);
  }
  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      group.scale.setScalar(0.4 + 0.6 * k);
      fill.material.opacity = (style.opacity ?? 1) * k;
      if (ring) setStroke(ring, { opacity: k });
    },
  };
}

/** A series as a polyline, drawing along itself. Line, slopegraph, bump, ridge. */
export function series(pts: Vec[], style: MarkStyle = {}, skin: Skin = LIGHT, width = 3): Mark {
  const line = stroke(pts, { color: style.color ?? skin.muted, width, opacity: style.opacity ?? 1 });
  const group = new THREE.Group();
  group.add(line);
  onTop(line, 7);
  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      setStroke(line, { progress: k });
    },
  };
}

/** A filled band under or between series. Area, streamgraph layer, ridgeline. */
export function area(pts: Vec[], style: MarkStyle = {}, skin: Skin = LIGHT): Mark {
  const group = new THREE.Group();
  const fill = polyFill(pts, style.color ?? skin.muted, style.opacity ?? 0.18);
  group.add(fill);
  onTop(fill, 6);
  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      fill.material.opacity = (style.opacity ?? 0.18) * k;
      group.scale.y = 0.6 + 0.4 * k;
    },
  };
}

/** One cell of a grid: heatmap, matrix, kanban slot, calendar. */
export function cell(o: { x: number; y: number; w: number; h: number; style?: MarkStyle; skin?: Skin }): Mark {
  const skin = o.skin ?? LIGHT;
  const s = o.style ?? {};
  const group = new THREE.Group();
  const body = rect(o.w, o.h, 4, s.color ?? skin.muted, s.opacity ?? 1);
  body.position.set(o.x * PX, o.y * PX, 0);
  group.add(body);
  onTop(body, 6);
  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      body.material.opacity = (s.opacity ?? 1) * k;
      body.scale.setScalar(0.9 + 0.1 * k);
    },
  };
}

/**
 * The number on the mark.
 *
 * A chart in a video is read once, at speed, from across a room. Their figures
 * carry an axis and expect the reader to trace; ours carry the number, because
 * nobody pauses a video to measure a bar against a gridline.
 */
export function value(text: string, at: Vec, o: { skin?: Skin; size?: number; align?: "center" | "left"; accent?: boolean } = {}) {
  const skin = o.skin ?? LIGHT;
  const style: TypeStyle = {
    size: o.size ?? RAMP.name,
    weight: 500,
    color: o.accent ? skin.accent : skin.ink,
    font: SANS,
  };
  const text3 = label(text, style, o.align ?? "center");
  text3.position.set(at.x * PX, at.y * PX, 0);
  onTop(text3, 9);
  return {
    mesh: text3,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      setLabel(text3, { opacity: k });
      text3.position.y = (at.y - (1 - k) * 6) * PX;
    },
  };
}

/** A category name under a bar, beside a row, or at the end of a series. */
export function tag(
  text: string,
  at: Vec,
  o: { skin?: Skin; align?: "center" | "left" | "right"; accent?: boolean; color?: string } = {},
) {
  const skin = o.skin ?? LIGHT;
  const style: TypeStyle = {
    size: RAMP.sub,
    weight: 400,
    // `color` overrides the role: a label sitting on a filled mark needs
    // contrast against that fill, not against the paper.
    color: o.color ?? (o.accent ? skin.accent : skin.soft),
    font: MONO,
    tracking: 0,
  };
  const align = o.align ?? "center";
  const mesh = label(text, style, align === "right" ? "center" : align);
  const w = measure(text, style);
  mesh.position.set((align === "right" ? at.x - w / 2 : at.x) * PX, at.y * PX, 0);
  onTop(mesh, 9);
  return { mesh, reveal: (p: number) => setLabel(mesh, { opacity: Math.min(1, Math.max(0, p)) }) };
}

/**
 * The legend, as a strip below the art.
 *
 * Their rule, and it survives the port unchanged: a legend inside the plot
 * collides with the marks. It goes under everything, after a hairline, or it
 * does not go in.
 */
export function legend(items: { text: string; color: string }[], o: { x: number; y: number; width: number; skin?: Skin }) {
  const skin = o.skin ?? LIGHT;
  const group = new THREE.Group();
  const rule = stroke([{ x: o.x, y: o.y + 28 }, { x: o.x + o.width, y: o.y + 28 }], { color: skin.ink, width: 1, opacity: 0.1 });
  group.add(rule);
  onTop(rule, 3);

  const style: TypeStyle = { size: RAMP.sub, weight: 400, color: skin.soft, font: MONO, tracking: 0.06 };
  const parts: Label[] = [];
  let cursor = o.x;
  for (const item of items) {
    const swatch = rect(16, 16, 2, item.color, 1);
    swatch.position.set((cursor + 8) * PX, o.y * PX, 0);
    group.add(swatch);
    onTop(swatch, 6);
    const text = label(item.text, style, "left");
    text.position.set((cursor + 28) * PX, o.y * PX, 0);
    group.add(text);
    parts.push(text);
    onTop(text, 9);
    cursor += 28 + measure(item.text, style) + 40;
  }
  return {
    group,
    reveal(p: number) {
      const k = Math.min(1, Math.max(0, p));
      group.visible = k > 0.001;
      setStroke(rule, { opacity: 0.1 * k });
      for (const t of parts) setLabel(t, { opacity: k });
    },
  };
}

/** A plot frame on the grid: where the marks may go, in px. */
export function plot(o: { x: number; y: number; w: number; h: number }) {
  const left = o.x - o.w / 2;
  const bottom = o.y - o.h / 2;
  return {
    left,
    right: left + o.w,
    bottom,
    top: bottom + o.h,
    w: o.w,
    h: o.h,
    /** Snap a px value to the structural grid. */
    snap: (v: number) => Math.round(v / GRID) * GRID,
  };
}
```

## 2. API at a glance

| Call | What |
| --- | --- |
| `linear(domain, range, nice)` | Value to px, with `ticks(n)` that only ever returns round numbers |
| `band(keys, range, pad)` | Category to px of the band centre, plus `bandwidth` |
| `tickStep(d0, d1, n)` | 1, 2, 2.5 or 5 times a power of ten: the only steps that read as round |
| `axis(spec, skin)` | A hairline, its ticks, its labels, an optional eyebrow and optional grid rules |
| `plot({x, y, w, h})` | The frame the marks go in: `left`, `right`, `top`, `bottom`, `snap` |
| `bar(o)` | One bar, growing from its baseline. `horizontal` for a Gantt row or a bar chart on its side |
| `dot(at, r, style, skin)` | Scatter point, bubble, beeswarm member, dumbbell end, line vertex |
| `series(pts, style, skin, w)` | A series as a polyline, drawing along itself |
| `area(pts, style, skin)` | A filled band: area, streamgraph layer, ridgeline |
| `cell(o)` | One grid cell: heatmap, matrix, treemap rectangle |
| `value(text, at, o)` | The number on the mark, in the sans |
| `tag(text, at, o)` | A category name, in the mono. `color` overrides the role when the label sits on a fill |
| `legend(items, o)` | A strip below the art, after a hairline. Never inside the plot |

## 3. Rules the marks encode

- **A bar grows; it does not fade.** A bar's length is its value, and one that
  fades in at full length has told you the answer before the eye arrives. A row
  of them then lands as a block instead of as a comparison.
- **The number goes on the mark.** Their figures carry an axis and expect the
  reader to trace against it. Nobody pauses a video to measure a bar against a
  gridline, so every mark that matters carries its own number.
- **One hue, varying opacity.** A reader can order one hue by eye and cannot
  order a spectrum without the key. `SERIES` exists only for the few types with
  genuinely overlapping entities, and `accent` stays reserved for the focal one.
- **The legend is a strip under the art.** Inside the plot it collides with the
  marks. If it will not fit underneath, the chart has too many series.
- **Axes are structure, not content.** `rule` weight, `soft` labels, grid rules
  at 6% ink or absent. Nothing about an axis competes with a mark.
