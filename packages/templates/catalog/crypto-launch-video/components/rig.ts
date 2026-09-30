/**
 * A "subject rig": a pivot that places a chosen point of a flat layout
 * (`fx, fy`, top-left origin, y down) at a screen pixel (`sx, sy`), at an
 * apparent scale `s`, tilted by rx / ry and rolled by rz. Poses are keyed in
 * reference seconds and joined with a smooth Hermite spline so multi-key
 * moves glide instead of stopping at every key.
 */
import * as THREE from "three";
import { CAM_Z, px, py } from "./kit";

export interface Pose { t: number; fx: number; fy: number; sx: number; sy: number; s: number; rx: number; ry: number; rz: number; hold?: boolean }

const FIELDS = ["fx", "fy", "sx", "sy", "s", "rx", "ry", "rz"] as const;

/** Smooth (Catmull-Rom tangents, zero at ends and holds) interpolation over keyed values. */
export function spline(t: number, ts: number[], vs: number[], holds: boolean[] = []) {
  const n = ts.length;
  if (t <= ts[0]!) return vs[0]!;
  if (t >= ts[n - 1]!) return vs[n - 1]!;
  let i = 0;
  while (i < n - 2 && t > ts[i + 1]!) i++;
  const tan = (k: number) => {
    if (k === 0 || k === n - 1 || holds[k]) return 0;
    // monotone: flat at turning points, clipped so a segment never overshoots
    const d0 = (vs[k]! - vs[k - 1]!) / (ts[k]! - ts[k - 1]!);
    const d1 = (vs[k + 1]! - vs[k]!) / (ts[k + 1]! - ts[k]!);
    if (d0 * d1 <= 0) return 0;
    const m = (d0 + d1) / 2;
    const lim = 3 * Math.min(Math.abs(d0), Math.abs(d1));
    return Math.sign(m) * Math.min(Math.abs(m), lim);
  };
  const t0 = ts[i]!, t1 = ts[i + 1]!, h = t1 - t0;
  const u = (t - t0) / h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * vs[i]! + (u3 - 2 * u2 + u) * h * tan(i) + (-2 * u3 + 3 * u2) * vs[i + 1]! + (u3 - u2) * h * tan(i + 1);
}

/** Simple keyed spline for a scalar: [[t, v], ...]. */
export const sk = (t: number, keys: [number, number][]) => spline(t, keys.map((k) => k[0]), keys.map((k) => k[1]));

export function poseAt(t: number, keys: Pose[]): Pose {
  const ts = keys.map((k) => k.t);
  const holds = keys.map((k) => !!k.hold);
  const out = { t } as Pose;
  for (const f of FIELDS) out[f] = spline(t, ts, keys.map((k) => k[f]), holds);
  return out;
}

/** pivot sits at the focus; inner holds the layout (offset so the focus is at the pivot). */
export function applyPose(pivot: THREE.Object3D, inner: THREE.Object3D, p: Pose) {
  const z = CAM_Z * (1 - 1 / p.s);
  pivot.position.set(px(p.sx) / p.s, py(p.sy) / p.s, z);
  pivot.rotation.set(p.rx, p.ry, p.rz, "ZXY");
  inner.position.set(-p.fx, p.fy, 0);
}

const P = (t: number, fx: number, fy: number, sx: number, sy: number, s: number, rx: number, ry: number, rz: number, hold = false): Pose =>
  ({ t, fx, fy, sx, sy, s, rx, ry, rz, hold });

/** The dashboard's swing-in: its top-left corner rising out of the bottom right. Shared by scenes 4 and 5. */
export const DASH_ENTRY: Pose[] = [
  P(19.95, 0, 0, 1560, 1250, 1.0, -0.25, 1.2, -0.12),
  P(20.2, 0, 0, 960, 720, 1.0, -0.3, 0.95, 0.04),
  P(20.3, 0, 0, 780, 430, 0.95, -0.35, 0.75, 0.12),
  P(20.4, 0, 0, 680, 250, 0.9, -0.38, 0.6, 0.12),
  P(20.6, 0, 0, 450, 180, 0.75, -0.4, 0.42, 0.1),
  P(21.0, 0, 0, 400, 200, 0.66, -0.45, 0.3, 0.08),
];

/** Scene 5, shot A: tilted glide over the whole dashboard (20.3 → 24.9). */
export const DASH_TILT: Pose[] = [
  ...DASH_ENTRY.slice(2),
  P(21.4, 0, 0, 460, 260, 0.82, -0.5, 0.25, 0.06),
  P(21.8, 0, 0, 460, 200, 0.72, -0.5, 0.22, 0.06),
  P(22.05, 0, 0, 420, 140, 0.5, -0.3, 0.18, 0.03),
  P(22.6, 700, 1000, 700, 560, 1.02, -0.26, -0.2, 0.065),
  P(23.4, 700, 1500, 760, 520, 0.98, -0.3, -0.15, 0.04),
  P(24.2, 1016, 2300, 1000, 650, 0.95, -0.42, 0, -0.045),
  P(24.6, 1200, 2200, 950, 564, 0.73, -0.12, 0, 0),
  P(24.9, 1200, 2200, 950, 540, 0.72, -0.04, 0, 0),
];

/** Scene 5, shot B: flat close-ups — header, rewards, table (24.9 → 28.9). */
export const DASH_FLAT: Pose[] = [
  P(24.9, 0, 0, 380, 200, 1.0, 0, 0, 0),
  P(25.25, 0, 0, 370, 280, 1.0, 0, 0, 0),
  P(25.6, 0, 0, 362, 272, 1.01, 0, 0, 0),
  P(26.0, 173, 870, 404, 352, 1.07, 0, 0, 0),
  P(26.6, 173, 870, 388, 288, 1.12, 0, 0, 0),
  P(27.1, 173, 1800, 82, 73, 1.0, 0, 0, 0),
  P(28.9, 173, 1800, 78, 45, 1.0, 0, 0, 0),
];
