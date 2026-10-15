/**
 * Text set along a curve, one plane per glyph, each turned to the curve's
 * tangent — "just got" rides the ribbon this way in the reference.
 *
 * The path is a polyline in reference px (y down). Glyph positions come from
 * the kerned prefix widths of the whole string, so spacing matches the word
 * set flat.
 */
import * as THREE from "three";
import { text, setText, measure, type TextMesh, type TextStyle } from "./text";
import { X, Y } from "./stage";

export interface PathText {
  group: THREE.Group;
  glyphs: TextMesh[];
  /** arc offset (px along the path) of each glyph's centre, relative to the string start */
  centers: number[];
  /** place the string with its start at arc length s0, baseline `offset` px below the path (+ = below) */
  layout(s0: number, offset: number, stretch?: number): void;
  /** arc length on the path whose x is `x` */
  arcAtX(x: number): number;
  pointAt(s: number): { x: number; y: number; angle: number };
}

export function pathText(str: string, style: TextStyle, path: [number, number][], name: string): PathText {
  // dense polyline with cumulative arc length
  const pts: { x: number; y: number; s: number }[] = [];
  let s = 0;
  for (let i = 0; i < path.length; i++) {
    if (i > 0) s += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    pts.push({ x: path[i][0], y: path[i][1], s });
  }
  const pointAt = (q: number) => {
    let i = 0;
    while (i < pts.length - 2 && pts[i + 1].s < q) i++;
    const a = pts[i];
    const b = pts[i + 1];
    const t = (q - a.s) / (b.s - a.s || 1);
    // smooth tangent: average of neighbouring segments
    const a0 = pts[Math.max(0, i - 1)];
    const b1 = pts[Math.min(pts.length - 1, i + 2)];
    const ang0 = Math.atan2(b.y - a0.y, b.x - a0.x);
    const ang1 = Math.atan2(b1.y - a.y, b1.x - a.x);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: ang0 + (ang1 - ang0) * t };
  };
  const arcAtX = (x: number) => {
    let i = 0;
    while (i < pts.length - 2 && pts[i + 1].x < x) i++;
    const a = pts[i];
    const b = pts[i + 1];
    return a.s + ((x - a.x) / (b.x - a.x || 1)) * (b.s - a.s);
  };

  const group = new THREE.Group();
  group.name = name;
  const glyphs: TextMesh[] = [];
  const centers: number[] = [];
  const chars = Array.from(str);
  for (let i = 0; i < chars.length; i++) {
    const pre = measure(chars.slice(0, i).join(""), style).advance;
    const adv = measure(chars.slice(0, i + 1).join(""), style).advance - pre;
    centers.push(pre + adv / 2);
    if (chars[i] === " ") {
      glyphs.push(null as unknown as TextMesh);
      continue;
    }
    const g = text(chars[i], { ...style, align: "center" }, `${name}-${i}-${chars[i]}`);
    group.add(g);
    glyphs.push(g);
  }

  return {
    group,
    glyphs,
    centers,
    pointAt,
    arcAtX,
    layout(s0, offset, stretch = 1) {
      glyphs.forEach((g, i) => {
        if (!g) return;
        const p = pointAt(s0 + centers[i] * stretch);
        // normal pointing "down" the screen (y down): (-sin, cos)
        const nx = -Math.sin(p.angle);
        const ny = Math.cos(p.angle);
        g.position.set(X(p.x + nx * offset), Y(p.y + ny * offset), 0);
        g.rotation.z = -p.angle;
        g.scale.x = stretch;
      });
    },
  };
}

export { setText };
