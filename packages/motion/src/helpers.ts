import { Easing, type EasingFunction } from "./easing";
import { interpolate } from "./interpolate";

export interface StaggerOptions {
  frame: number;
  /** Index of the item in the list. */
  index: number;
  /** Frames between successive item starts. */
  each?: number;
  /** Frames each item's animation lasts. */
  duration?: number;
  /** Frames before the first item starts. */
  delay?: number;
  easing?: EasingFunction;
}

/**
 * Progress (0..1) for the `index`-th item of a staggered list animation.
 * const p = stagger({ frame, index: i, each: 4, duration: 20 });
 */
export function stagger({
  frame,
  index,
  each = 4,
  duration = 20,
  delay = 0,
  easing = Easing.outSmooth,
}: StaggerOptions): number {
  const start = delay + index * each;
  const raw = Math.min(1, Math.max(0, (frame - start) / duration));
  return easing(raw);
}

export interface TimelineSegment {
  /** Start frame of this segment. */
  at: number;
  /** Duration of this segment in frames. */
  dur: number;
  ease?: EasingFunction;
}

/**
 * Progress (0..1) per segment of a declarative timeline:
 * const [intro, hold, outro] = timeline(frame, [
 *   { at: 0, dur: 20 }, { at: 20, dur: 60 }, { at: 80, dur: 20 },
 * ]);
 */
export function timeline(
  frame: number,
  segments: TimelineSegment[],
): number[] {
  return segments.map(({ at, dur, ease = Easing.outSmooth }) => {
    const raw = Math.min(1, Math.max(0, (frame - at) / dur));
    return ease(raw);
  });
}

/** Shorthand: eased 0..1 progress between two frames. */
export function progress(
  frame: number,
  from: number,
  to: number,
  ease: EasingFunction = Easing.outSmooth,
): number {
  return interpolate(frame, [from, to], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}
