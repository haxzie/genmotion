export type Ease = (t: number) => number;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0..1 progress of `frame` through [start, start + dur], eased. */
export const prog = (frame: number, start: number, dur: number, ease: Ease = (t) => t) =>
  ease(clamp01((frame - start) / Math.max(1e-6, dur)));

export const linear: Ease = (t) => t;
export const outQuad: Ease = (t) => 1 - (1 - t) ** 2;
export const outCubic: Ease = (t) => 1 - (1 - t) ** 3;
export const outQuart: Ease = (t) => 1 - (1 - t) ** 4;
export const outExpo: Ease = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
export const inQuad: Ease = (t) => t * t;
export const inCubic: Ease = (t) => t * t * t;
export const inOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const inOutQuart: Ease = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);
export const inOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/** cubic-bezier(x1, y1, x2, y2), CSS-identical, deterministic. */
export function bezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sy = (s: number) => ((ay * s + by) * s + cy) * s;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 40; i++) {
      if (sx(s) < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return sy(s);
  };
}
/** The house entrance ease. */
export const outSmooth = bezier(0.25, 1, 0.5, 1);

/**
 * Keyframed value: keys are [frame, value] pairs; each segment eased by `ease`
 * (default inOutCubic). Holds the end values outside the range.
 */
export function keys(k: [number, number][], ease: Ease = inOutCubic) {
  return (frame: number) => {
    if (frame <= k[0]![0]) return k[0]![1];
    for (let i = 0; i < k.length - 1; i++) {
      const [f0, v0] = k[i]!;
      const [f1, v1] = k[i + 1]!;
      if (frame <= f1) return lerp(v0, v1, ease(clamp01((frame - f0) / (f1 - f0))));
    }
    return k[k.length - 1]![1];
  };
}

/**
 * Monotone cubic (Fritsch-Carlson) through keys: passes every key, never overshoots,
 * never stops at an interior key unless the direction turns.
 */
export function glide(k: [number, number][]): (frame: number) => number {
  const keysF = k.map((p) => p[0]);
  const vals = k.map((p) => p[1]);
  const n = keysF.length;
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((vals[i + 1]! - vals[i]!) / (keysF[i + 1]! - keysF[i]!));
  for (let i = 1; i < n - 1; i++) {
    const a = d[i - 1]!, b = d[i]!;
    if (a * b <= 0) continue;
    const h0 = keysF[i]! - keysF[i - 1]!, h1 = keysF[i + 1]! - keysF[i]!;
    const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / a + w2 / b);
  }
  return (frame) => {
    if (frame <= keysF[0]!) return vals[0]!;
    if (frame >= keysF[n - 1]!) return vals[n - 1]!;
    let i = 0;
    while (frame > keysF[i + 1]!) i++;
    const h = keysF[i + 1]! - keysF[i]!, s = (frame - keysF[i]!) / h;
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * vals[i]! + (s3 - 2 * s2 + s) * h * m[i]! +
      (-2 * s3 + 3 * s2) * vals[i + 1]! + (s3 - s2) * h * m[i + 1]!;
  };
}

/** Deterministic hash of an integer to [0, 1). */
export function hash1(n: number): number {
  let t = (Math.imul(n | 0, 0x9e3779b1) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
