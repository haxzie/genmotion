import { interpolate, Easing } from "@genmotion/three-engine";

/** 0→1 eased in over `dur` frames from `start`. */
export const enter = (frame: number, start: number, dur = 12) =>
  interpolate(frame, [start, start + dur], [0, 1], Easing.easeOut);

/** 0→1 accelerating out over `dur` frames from `start`. */
export const leave = (frame: number, start: number, dur = 8) =>
  interpolate(frame, [start, start + dur], [0, 1], Easing.easeIn);

/** 0→1 with a small overshoot: the springy pop the reference uses everywhere. */
export const pop = (frame: number, start: number, dur = 14, over = 1.08) =>
  interpolate(
    frame,
    [start, start + dur * 0.6, start + dur],
    [0, over, 1],
    Easing.easeOut,
  );

/** Eased 0→1 for camera and big travelling moves. */
export const glide = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], Easing.easeInOut);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic PRNG. Call it in the builder, never in the frame callback. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The sunburst's turn, shared by 03 and 04 so the rays line up across the cut. */
export const RAY_SPIN = 0.006;
export const RAY_START = 0.2;
