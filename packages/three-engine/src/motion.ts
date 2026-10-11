/**
 * The frame-math primitives every Three.js project re-derives.
 *
 * An audit of the 14 Three.js templates found these written out again in each
 * one, and drifted: ten copies of `measure`, seven of `prog`, five of
 * `withFonts`, three mutually incompatible definitions of `PX`. Drift is worse
 * than duplication — a fix in one never reaches the others, and the skill text
 * can only document one of them.
 *
 * Everything here is a pure function of its arguments, so a scene built on it
 * draws the same pixels on every machine and at every seek.
 */

import type { EasingFunction } from "./interpolate";

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 0→1 progress of `frame` across `dur` frames starting at `start`, eased.
 *
 * `prog` and `between` exist as a pair on purpose. The templates disagreed
 * about what a third positional number meant — a duration in some, an end
 * frame in others — and both readings are plausible at a call site, so the
 * mistake was silent and retimed the shot. Two names, each unambiguous:
 *
 *   prog(f, 10, 20)     frames 10 → 30   (start, duration)
 *   between(f, 10, 20)  frames 10 → 20   (from, to)
 */
export const prog = (frame: number, start: number, dur: number, ease: EasingFunction = (t) => t) =>
  ease(clamp01(dur === 0 ? (frame >= start ? 1 : 0) : (frame - start) / dur));

/** 0→1 progress of `frame` from frame `from` to frame `to`, eased. */
export const between = (frame: number, from: number, to: number, ease: EasingFunction = (t) => t) =>
  prog(frame, from, to - from, ease);

/**
 * A deterministic stand-in for `Math.random`, which scenes may not call.
 *
 * Integer in, the same number in [0, 1) out, forever. Seed it from an index
 * (`hash1(i)`) so a hundred particles each get their own fixed value and the
 * export matches the preview.
 */
export function hash1(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** `hash1` over two dimensions — a grid cell's own value. */
export const hash2 = (x: number, y: number) => hash1(x * 73856093 + y * 19349663);

/**
 * Keyframes `[frame, value][]` with monotone cubic (Fritsch–Carlson)
 * interpolation: velocity is continuous through every key, so motion never
 * stalls at one, and it never overshoots between them. Clamped at both ends.
 *
 * Returns a function of frame so the solve happens once, in the builder.
 */
export function track(keys: readonly (readonly [number, number])[]): (frame: number) => number {
  const n = keys.length;
  if (n === 0) throw new Error("track: needs at least one key");
  const t = keys.map((k) => k[0]);
  const v = keys.map((k) => k[1]);
  if (n === 1) return () => v[0]!;

  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((v[i + 1]! - v[i]!) / (t[i + 1]! - t[i]!));
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0]!;
  m[n - 1] = d[n - 2]!;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d[i]!;
    const b = m[i + 1]! / d[i]!;
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      m[i] = k * a * d[i]!;
      m[i + 1] = k * b * d[i]!;
    }
  }

  return (x: number) => {
    if (x <= t[0]!) return v[0]!;
    if (x >= t[n - 1]!) return v[n - 1]!;
    let i = 0;
    while (x > t[i + 1]!) i++;
    const h = t[i + 1]! - t[i]!;
    const u = (x - t[i]!) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * v[i]! +
      (u3 - 2 * u2 + u) * h * m[i]! +
      (-2 * u3 + 3 * u2) * v[i + 1]! +
      (u3 - u2) * h * m[i + 1]!
    );
  };
}

/**
 * A critically-ish damped spring sampled in closed form at `t` seconds.
 *
 * Closed form rather than integrated per step, because an integrated spring
 * depends on every frame before it — which is exactly what a seek does not
 * provide. This one is a pure function of t and renders the same at any seek.
 */
export function springValue(t: number, { stiffness = 170, damping = 26, mass = 1 } = {}): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

/** `springValue` driven from a frame number. */
export const springIn = (
  frame: number,
  start: number,
  fps: number,
  config?: Parameters<typeof springValue>[1],
) => springValue((frame - start) / fps, config);
