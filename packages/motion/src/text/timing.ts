import { Easing, type EasingFunction } from "../easing";

/**
 * Frames of clear air left between the end of an exit and the end of the
 * element's window. Cutting mid-exit reads as a dropped frame, so an automatic
 * exit always lands early — this is the house "5–8 frames" rule, in code.
 */
export const EXIT_TAIL_PAD = 6;

/** How much faster an exit runs than its entrance, when not stated. */
const EXIT_SPEED = 0.65;

export interface EnterWindow {
  at: number;
  duration: number;
  stagger: number;
  easing: EasingFunction;
}

export interface ExitWindow extends EnterWindow {}

export interface ResolveExitOptions {
  /** Last frame of the element's own window (Sequence length, or the scene). */
  windowEnd: number;
  /** Largest stagger rank across the units. */
  maxRank: number;
  duration: number;
  stagger: number;
}

/**
 * The frame an automatic exit must start on so that the LAST unit finishes
 * exactly EXIT_TAIL_PAD frames before the window ends.
 *
 * Clamped at 0: on a window too short to hold a full exit, starting late and
 * being clipped is worse than starting immediately.
 */
export function autoExitAt({
  windowEnd,
  maxRank,
  duration,
  stagger,
}: ResolveExitOptions): number {
  const span = duration + stagger * maxRank;
  return Math.max(0, windowEnd - EXIT_TAIL_PAD - span);
}

/** Default exit duration for an effect, derived from its entrance. */
export function defaultExitDuration(enterDuration: number): number {
  return Math.max(4, Math.round(enterDuration * EXIT_SPEED));
}

/** Exits decelerate into nothing; entrances land softly. */
export const DEFAULT_EXIT_EASE: EasingFunction = Easing.inOutCubic;

/** Eased 0..1 progress of one unit within a staggered window. */
export function unitProgress(
  frame: number,
  window: EnterWindow,
  rank: number,
): number {
  const start = window.at + rank * window.stagger;
  const raw = (frame - start) / Math.max(1, window.duration);
  return window.easing(Math.min(1, Math.max(0, raw)));
}
