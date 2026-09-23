/**
 * The one animation helper this package ships. For anything a scene's own
 * transforms can express directly, reach for Three.js first —
 * `THREE.MathUtils.lerp`/`damp`/`smoothstep`, `Quaternion.slerp`,
 * `AnimationMixer.setTime`, `CatmullRomCurve3` — this exists only for the
 * common "map a frame range to a scalar" case those don't cover ergonomically.
 * No external animation library: this is the whole story.
 */

export type EasingFunction = (t: number) => number;

/** A handful of named easings, enough to avoid linear motion everywhere. */
export const Easing = {
  linear: ((t) => t) as EasingFunction,
  easeIn: ((t) => t * t) as EasingFunction,
  easeOut: ((t) => 1 - (1 - t) * (1 - t)) as EasingFunction,
  easeInOut: ((t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)) as EasingFunction,
} satisfies Record<string, EasingFunction>;

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
