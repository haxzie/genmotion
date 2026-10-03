export type Ease = (t: number) => number;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0..1 progress of `frame` through [start, start + dur], eased. */
export const prog = (frame: number, start: number, dur: number, ease: Ease = (t) => t) =>
  ease(clamp01((frame - start) / dur));

export const linear: Ease = (t) => t;
export const outQuad: Ease = (t) => 1 - (1 - t) ** 2;
export const outCubic: Ease = (t) => 1 - (1 - t) ** 3;
export const outQuart: Ease = (t) => 1 - (1 - t) ** 4;
export const outQuint: Ease = (t) => 1 - (1 - t) ** 5;
export const outExpo: Ease = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
export const inQuad: Ease = (t) => t * t;
export const inCubic: Ease = (t) => t * t * t;
export const inQuart: Ease = (t) => t ** 4;
export const inExpo: Ease = (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10));
export const inOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const inOutQuart: Ease = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);
export const inOutExpo: Ease = (t) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
export const inOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/** cubic-bezier(x1, y1, x2, y2), CSS-identical, deterministic. */
export function bezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (s: number) => ((ax * s + bx) * s + cx) * s;
  const fy = (s: number) => ((ay * s + by) * s + cy) * s;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 40; i++) {
      if (fx(s) < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return fy(s);
  };
}

/**
 * Piecewise keyframe track: keys [[frame, value], ...], each segment eased by
 * the ease given on its END key (default inOutCubic). Clamped at both ends.
 */
export type Key = [number, number, Ease?];
export function track(keys: Key[]): (f: number) => number {
  return (f) => {
    if (f <= keys[0]![0]) return keys[0]![1];
    for (let i = 1; i < keys.length; i++) {
      const [f1, v1, e] = keys[i]!;
      if (f <= f1) {
        const [f0, v0] = keys[i - 1]!;
        const t = f1 === f0 ? 1 : (f - f0) / (f1 - f0);
        return lerp(v0, v1, (e ?? inOutCubic)(t));
      }
    }
    return keys[keys.length - 1]![1];
  };
}

/** Linear interpolation through sampled keys (for measured curves). */
export function sampled(keys: [number, number][]): (f: number) => number {
  return track(keys.map(([a, b]) => [a, b, linear] as Key));
}

/** Deterministic hash of an integer to [0, 1). */
export function hash1(n: number): number {
  let t = (Math.imul(n | 0, 0x9e3779b1) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
