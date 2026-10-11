/**
 * The one animation helper this package ships. For anything a scene's own
 * transforms can express directly, reach for Three.js first —
 * `THREE.MathUtils.lerp`/`damp`/`smoothstep`, `Quaternion.slerp`,
 * `AnimationMixer.setTime`, `CatmullRomCurve3` — this exists only for the
 * common "map a frame range to a scalar" case those don't cover ergonomically.
 * No external animation library: this is the whole story.
 */

export type EasingFunction = (t: number) => number;

/**
 * Named easings, enough to avoid linear motion everywhere.
 *
 * The `ease*` four are the original set and stay exactly as they were. The
 * rest were being re-declared in almost every Three.js project — `outCubic`,
 * `outQuart` and `inOutCubic` appeared in a third of the templates — so they
 * live here instead of in each one's `components/ease.ts`.
 */
export const Easing = {
  linear: ((t) => t) as EasingFunction,
  easeIn: ((t) => t * t) as EasingFunction,
  easeOut: ((t) => 1 - (1 - t) * (1 - t)) as EasingFunction,
  easeInOut: ((t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)) as EasingFunction,

  inCubic: ((t) => t * t * t) as EasingFunction,
  outCubic: ((t) => 1 - (1 - t) ** 3) as EasingFunction,
  inOutCubic: ((t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)) as EasingFunction,
  outQuad: ((t) => 1 - (1 - t) ** 2) as EasingFunction,
  outQuart: ((t) => 1 - (1 - t) ** 4) as EasingFunction,
  outExpo: ((t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))) as EasingFunction,
  inOutSine: ((t) => -(Math.cos(Math.PI * t) - 1) / 2) as EasingFunction,
  outBack: ((t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2) as EasingFunction,
} satisfies Record<string, EasingFunction>;

/**
 * `ease` run only to `k` of its curve, rescaled to end at 1.
 *
 * A count-up that must still be moving on its last frame uses
 * `trunc(Easing.outQuart, 0.85)`: without it the number parks before the land
 * and the punch has nothing to punch.
 */
export const trunc =
  (ease: EasingFunction, k: number): EasingFunction =>
  (t) =>
    ease(k * t) / ease(k);

/** A CSS `cubic-bezier(x1, y1, x2, y2)` timing function. */
export function bezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const xAt = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dxAt = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Newton–Raphson, then bisect if the slope is too flat to converge.
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = xAt(t) - x;
      if (Math.abs(dx) < 1e-6) return ((ay * t + by) * t + cy) * t;
      const d = dxAt(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const dx = xAt(t) - x;
      if (Math.abs(dx) < 1e-6) break;
      if (dx > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

/**
 * Map `input` through `inputRange` to `outputRange`, clamped at both ends.
 * Ranges may have more than two points: interpolate(f, [0, 10, 20], [0, 1, 0]).
 * Pure — same inputs always produce the same output, frame in, value out.
 */
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  easing?: EasingFunction,
): number {
  if (inputRange.length < 2 || inputRange.length !== outputRange.length) {
    throw new Error("interpolate: inputRange and outputRange must be the same length, and at least 2");
  }

  const first = inputRange[0]!;
  const last = inputRange[inputRange.length - 1]!;
  if (input <= first) return outputRange[0]!;
  if (input >= last) return outputRange[outputRange.length - 1]!;

  let i = 1;
  while (i < inputRange.length - 1 && inputRange[i]! < input) i++;

  const x0 = inputRange[i - 1]!;
  const x1 = inputRange[i]!;
  const y0 = outputRange[i - 1]!;
  const y1 = outputRange[i]!;

  let progress = (input - x0) / (x1 - x0);
  if (easing) progress = easing(progress);
  return y0 + (y1 - y0) * progress;
}
