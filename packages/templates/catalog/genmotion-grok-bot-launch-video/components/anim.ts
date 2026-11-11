/** Easing curves and a keyframe track with per-segment easing. */
export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  in: (t: number) => t * t * t,
  inQuad: (t: number) => t * t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
} satisfies Record<string, Ease>;

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 0→1 between frames a and b, eased. */
export function prog(f: number, a: number, b: number, e: Ease = ease.out): number {
  return e(clamp01((f - a) / (b - a)));
}

/**
 * Piecewise keyframes: `frames` ascending, one value per frame, and either one
 * easing for every segment or one per segment. Clamped at both ends.
 */
export function keys(f: number, frames: number[], values: number[], e: Ease | Ease[] = ease.inOut): number {
  const n = frames.length;
  if (f <= frames[0]!) return values[0]!;
  if (f >= frames[n - 1]!) return values[n - 1]!;
  let i = 0;
  while (f > frames[i + 1]!) i++;
  const t = (f - frames[i]!) / (frames[i + 1]! - frames[i]!);
  const fn = Array.isArray(e) ? e[i] ?? ease.inOut : e;
  return values[i]! + (values[i + 1]! - values[i]!) * fn(t);
}

/** Deterministic hash → [0,1). */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Monotone cubic (Fritsch–Carlson) through keyframes: velocity is continuous
 * across every key, it never overshoots, and equal neighbouring values hold
 * perfectly still. Use this for paths so motion flows through keys instead of
 * stopping at each one.
 */
export function smooth(f: number, frames: number[], values: number[]): number {
  const n = frames.length;
  if (f <= frames[0]!) return values[0]!;
  if (f >= frames[n - 1]!) return values[n - 1]!;
  let i = 0;
  while (f > frames[i + 1]!) i++;
  const slope = (k: number) => (values[k + 1]! - values[k]!) / (frames[k + 1]! - frames[k]!);
  const tangent = (k: number) => {
    if (k === 0) return slope(0);
    if (k === n - 1) return slope(n - 2);
    const a = slope(k - 1);
    const b = slope(k);
    if (a * b <= 0) return 0;
    const ha = frames[k]! - frames[k - 1]!;
    const hb = frames[k + 1]! - frames[k]!;
    const w1 = 2 * hb + ha;
    const w2 = hb + 2 * ha;
    return (w1 + w2) / (w1 / a + w2 / b);
  };
  const h = frames[i + 1]! - frames[i]!;
  const t = (f - frames[i]!) / h;
  const m0 = tangent(i) * h;
  const m1 = tangent(i + 1) * h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * values[i]! + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * values[i + 1]! + (t3 - t2) * m1;
}

/**
 * A damped spring chasing a stepped target (value held from each key until the
 * next), integrated deterministically from the first key up to frame f.
 * `k` is stiffness per frame², `zeta` the damping ratio (<1 overshoots).
 */
export function spring(f: number, frames: number[], values: number[], k = 0.12, zeta = 0.75): number {
  let x = values[0]!;
  let v = 0;
  const c = 2 * zeta * Math.sqrt(k);
  const SUB = 4;
  const dt = 1 / SUB;
  let idx = 0;
  const end = Math.max(frames[0]!, f);
  for (let t = frames[0]!; t < end; t += dt) {
    while (idx + 1 < frames.length && t >= frames[idx + 1]!) idx++;
    const target = values[idx]!;
    const step = Math.min(dt, end - t);
    v += (k * (target - x) - c * v) * step;
    x += v * step;
  }
  return x;
}

/** A smooth 0→1→0 hump centred on c, half-width w. */
export function bump(f: number, c: number, w: number): number {
  const t = (f - c) / w;
  if (t <= -1 || t >= 1) return 0;
  const s = Math.cos((t * Math.PI) / 2);
  return s * s;
}
