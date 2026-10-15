/**
 * Keyframe curves measured off the reference video.
 *
 * `curve([[frame, value], …])` returns f(frame) through every key with a
 * monotone cubic (Fritsch–Carlson): it passes exactly through the measured
 * samples, never overshoots between them, and holds the end values outside
 * the range. That is what lets a motion tracked every 2 frames play back
 * smoothly at every frame without inventing wobble the source never had.
 */
export type Key = readonly [number, number];

export function curve(keys: readonly Key[]): (f: number) => number {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  if (n === 1) return () => ys[0];
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (f: number) => {
    if (f <= xs[0]) return ys[0];
    if (f >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && f > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (f - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

/** Piecewise-linear keys (for things that genuinely move at constant rate, or step). */
export function linear(keys: readonly Key[]): (f: number) => number {
  return (f: number) => {
    if (f <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [x0, y0] = keys[i];
      const [x1, y1] = keys[i + 1];
      if (f <= x1) return y0 + ((y1 - y0) * (f - x0)) / (x1 - x0);
    }
    return keys[keys.length - 1][1];
  };
}

/** Step keys: the value of the last key at or before f. */
export function step(keys: readonly Key[]): (f: number) => number {
  return (f: number) => {
    let v = keys[0][1];
    for (const [x, y] of keys) if (f >= x) v = y;
    return v;
  };
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0→1 between frames a and b with an easing applied. */
export const ramp = (f: number, a: number, b: number, ease: (t: number) => number = (t) => t) =>
  ease(clamp01((f - a) / (b - a)));
export const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn3 = (t: number) => t * t * t;
export const easeInOut3 = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
