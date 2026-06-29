export interface SpringConfig {
  mass?: number;
  stiffness?: number;
  damping?: number;
}

export interface SpringOptions {
  frame: number;
  fps: number;
  from?: number;
  to?: number;
  config?: SpringConfig;
  /** Frames to wait before the spring starts. */
  delay?: number;
  /** Stretch/compress the spring so it settles in exactly this many frames. */
  durationInFrames?: number;
}

const DEFAULT_CONFIG = { mass: 1, stiffness: 170, damping: 26 };

// Cache simulated positions per (config, fps). Positions are appended lazily,
// so repeated evaluation across frames is O(1) amortized and fully deterministic.
const simulationCache = new Map<string, number[]>();

const SETTLE_THRESHOLD = 0.005;

function simulate(key: string, mass: number, stiffness: number, damping: number, fps: number, upToIndex: number): number[] {
  let positions = simulationCache.get(key);
  if (!positions) {
    positions = [0];
    simulationCache.set(key, positions);
  }
  if (positions.length > upToIndex) return positions;

  const dt = 1 / fps;
  // Re-derive velocity at the end of the cached trajectory by stepping from scratch
  // is wasteful; instead cache velocity alongside via a parallel array convention:
  // store velocity in a side map.
  let velocity = velocityCache.get(key) ?? 0;
  let position = positions[positions.length - 1]!;
  for (let i = positions.length; i <= upToIndex; i++) {
    // Semi-implicit Euler with 4 substeps per frame for stability
    const substeps = 4;
    const h = dt / substeps;
    for (let s = 0; s < substeps; s++) {
      const springForce = -stiffness * (position - 1);
      const dampingForce = -damping * velocity;
      const acceleration = (springForce + dampingForce) / mass;
      velocity += acceleration * h;
      position += velocity * h;
    }
    positions.push(position);
  }
  velocityCache.set(key, velocity);
  return positions;
}

const velocityCache = new Map<string, number>();

/** Frames a spring with this config takes to settle (cached). */
const settleCache = new Map<string, number>();

function settleDuration(mass: number, stiffness: number, damping: number, fps: number): number {
  const key = `${mass}/${stiffness}/${damping}/${fps}`;
  const cached = settleCache.get(key);
  if (cached !== undefined) return cached;
  const positions = simulate(key, mass, stiffness, damping, fps, fps * 30);
  let settled = positions.length - 1;
  for (let i = positions.length - 1; i >= 0; i--) {
    if (Math.abs(positions[i]! - 1) > SETTLE_THRESHOLD) {
      settled = i + 1;
      break;
    }
  }
  settleCache.set(key, settled);
  return settled;
}

/**
 * Physics-based spring animation, deterministic per frame.
 * Returns `from` at frame<=delay and approaches `to` as the spring settles.
 */
export function spring({
  frame,
  fps,
  from = 0,
  to = 1,
  config = {},
  delay = 0,
  durationInFrames,
}: SpringOptions): number {
  const { mass, stiffness, damping } = { ...DEFAULT_CONFIG, ...config };
  let localFrame = frame - delay;
  if (localFrame <= 0) return from;

  if (durationInFrames !== undefined && durationInFrames > 0) {
    const natural = settleDuration(mass, stiffness, damping, fps);
    localFrame = (localFrame / durationInFrames) * natural;
  }

  const key = `${mass}/${stiffness}/${damping}/${fps}`;
  const index = Math.floor(localFrame);
  const positions = simulate(key, mass, stiffness, damping, fps, index + 1);
  // Linear blend between simulated frames for sub-frame smoothness
  const a = positions[Math.min(index, positions.length - 1)]!;
  const b = positions[Math.min(index + 1, positions.length - 1)]!;
  const t = localFrame - index;
  const value = a + (b - a) * t;
  return from + (to - from) * value;
}

/** Common spring presets. */
export const springPresets = {
  /** Default — snappy with a soft landing. */
  default: { mass: 1, stiffness: 170, damping: 26 },
  /** Gentle, no overshoot. */
  gentle: { mass: 1, stiffness: 120, damping: 30 },
  /** Bouncy entrance. */
  bouncy: { mass: 1, stiffness: 220, damping: 14 },
  /** Heavy, slow settle. */
  molasses: { mass: 2, stiffness: 90, damping: 28 },
  /** Quick UI pop. */
  stiff: { mass: 0.8, stiffness: 320, damping: 28 },
} satisfies Record<string, SpringConfig>;
