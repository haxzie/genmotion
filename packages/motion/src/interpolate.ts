import type { EasingFunction } from "./easing";

export type ExtrapolateType = "clamp" | "extend" | "identity";

export interface InterpolateOptions {
  easing?: EasingFunction;
  extrapolateLeft?: ExtrapolateType;
  extrapolateRight?: ExtrapolateType;
}

/**
 * Map a frame (or any input) through an input range to an output range.
 * Ranges may have multiple segments: interpolate(f, [0, 10, 20], [0, 1, 0]).
 * Pure: same inputs always produce the same output.
 */
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options: InterpolateOptions = {},
): number {
  if (inputRange.length < 2) {
    throw new Error("interpolate: inputRange must have at least 2 values");
  }
  if (inputRange.length !== outputRange.length) {
    throw new Error(
      `interpolate: inputRange (${inputRange.length}) and outputRange (${outputRange.length}) must have the same length`,
    );
  }
  for (let i = 1; i < inputRange.length; i++) {
    if (inputRange[i]! <= inputRange[i - 1]!) {
      throw new Error("interpolate: inputRange must be strictly increasing");
    }
  }

  const {
    easing,
    extrapolateLeft = "extend",
    extrapolateRight = "extend",
  } = options;

  const first = inputRange[0]!;
  const last = inputRange[inputRange.length - 1]!;

  if (input < first) {
    if (extrapolateLeft === "identity") return input;
    if (extrapolateLeft === "clamp") return outputRange[0]!;
  }
  if (input > last) {
    if (extrapolateRight === "identity") return input;
    if (extrapolateRight === "clamp") return outputRange[outputRange.length - 1]!;
  }

  // Find the segment that contains the input (extend uses the edge segments)
  let i = 1;
  while (i < inputRange.length - 1 && inputRange[i]! < input) i++;

  const x0 = inputRange[i - 1]!;
  const x1 = inputRange[i]!;
  const y0 = outputRange[i - 1]!;
  const y1 = outputRange[i]!;

  let progress = (input - x0) / (x1 - x0);
  if (easing && progress >= 0 && progress <= 1) {
    progress = easing(progress);
  }
  return y0 + (y1 - y0) * progress;
}
