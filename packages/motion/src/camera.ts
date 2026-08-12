import { Easing, type EasingFunction } from "./easing";
import { random } from "./random";

/**
 * Camera math. Pure — no DOM, no React, no clock.
 *
 * A camera is a view transform over a *world*: a canvas `world`× the size of
 * the frame, in which scene content is laid out. The camera says which world
 * point sits at frame centre and how tight the crop is; the transform follows.
 * This is the whole reason the primitive exists — scaling a div puts the author
 * in charge of a non-commutative matrix and a transform-origin they can't see.
 *
 * Everything here is a pure function of the frame, so preview scrubbing, the
 * export renderer's sequential sweep, and out-of-order evaluation all agree.
 */

/** Camera position at an instant. `x`/`y` are normalized 0..1 of the world. */
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  /** Roll, in degrees. */
  rotation: number;
  /** Pitch, in degrees — tips the world plane away from the viewer. */
  tiltX: number;
  /** Yaw, in degrees. */
  tiltY: number;
}

/** Perspective tilt of the world plane, in degrees. */
export interface CameraTilt {
  x?: number;
  y?: number;
}

export interface CameraKeyframe {
  /** Frame this keyframe lands on. */
  at: number;
  /** Normalized 0..1 across the world's width. Inherits if omitted. */
  x?: number;
  /** Normalized 0..1 across the world's height. Inherits if omitted. */
  y?: number;
  /** 1 = one world pixel per frame pixel. Inherits if omitted. */
  zoom?: number;
  /** Roll in degrees. Inherits if omitted. */
  rotation?: number;
  /** Perspective tilt in degrees. Each axis inherits independently if omitted. */
  tilt?: CameraTilt;
  /** Easing for the segment ENDING at this keyframe. */
  ease?: EasingFunction;
  /**
   * "linear" (default) travels a straight line with log-interpolated zoom.
   * "smooth" uses the van Wijk & Nuij optimal path — natural for a map, but it
   * arcs *outward* on a pure pan, so it is opt-in per segment.
   */
  path?: "linear" | "smooth";
  /** Id of an element to aim at. Resolved by <Camera>, never here. */
  focus?: string;
  /** With `focus`: fraction of the frame the element should occupy (0..1]. */
  fit?: number;
  /** With `fit`: "contain" (default) fits the whole element, "cover" fills. */
  fitMode?: "contain" | "cover";
}

export interface CameraGeometry {
  /** Frame width in px. */
  width: number;
  /** Frame height in px. */
  height: number;
  /** World size as a multiple of the frame. 1 = exactly the frame. */
  world: number;
  /** Viewer distance in px for perspective tilt. Defaults to 2× frame width. */
  perspective?: number;
}

/** Viewer distance, in px. Shallower = stronger, more distorted perspective. */
export function perspectiveDistance(geometry: CameraGeometry): number {
  return geometry.perspective ?? geometry.width * 2;
}

/**
 * How much of the camera's motion a plane at depth `z` picks up.
 *
 * This is just the perspective divide: a plane `z` px behind the screen sits
 * `P + z` from the viewer, so it projects at `P / (P + z)` — and something that
 * projects at half scale also travels half as far when the camera moves. So one
 * physical distance gives parallax and scale together, instead of the author
 * hand-tuning a coefficient for each.
 *
 *   z = 0        → 1     the screen plane; moves with the world
 *   z = P        → 0.5   half speed, half scale
 *   z → ∞        → 0     pinned to the screen (that is what <Overlay> is for)
 *   z < 0        → > 1   in front of the screen; overtakes the camera
 */
export function depthForZ(z: number, geometry: CameraGeometry): number {
  const P = perspectiveDistance(geometry);
  // At z = −P the plane is level with the viewer and the projection blows up.
  const denom = Math.max(P + z, P * 1e-3);
  return P / denom;
}

/** Inverse of `depthForZ` — the depth a plane at `z` would have had. */
export function zForDepth(depth: number, geometry: CameraGeometry): number {
  if (depth <= 0) return Infinity;
  return (perspectiveDistance(geometry) * (1 - depth)) / depth;
}

/** A 2D affine transform, in CSS `matrix(a,b,c,d,e,f)` order. */
export type CameraMatrix = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

/** Per-keyframe values resolved from a measured `focus` target. */
export interface CameraFocusOverride {
  x?: number;
  y?: number;
  zoom?: number;
}

export interface DriftOptions {
  /** Peak sway in FRAME pixels (so it reads the same at any zoom). */
  amount?: number;
  /** Cycles per second. */
  speed?: number;
  /** Peak roll in degrees. */
  rotate?: number;
  seed?: string;
}

export interface ShakeOptions {
  /** Frame the shake starts on. */
  at: number;
  /** Peak displacement in FRAME pixels. */
  amount?: number;
  /** How long it decays over, in frames. */
  duration?: number;
  /** Jolts per second. */
  frequency?: number;
  /** Peak roll in degrees. */
  rotate?: number;
  seed?: string;
}

export interface CameraAtOptions {
  geometry: CameraGeometry;
  fps: number;
  /** Parallel to the SORTED keyframes; supplies measured `focus` values. */
  overrides?: ReadonlyArray<CameraFocusOverride | undefined>;
  drift?: DriftOptions;
  shake?: ShakeOptions | ShakeOptions[];
  /** Keep the frame inside the world. On by default. */
  clamp?: boolean;
}

export const CAMERA_DEFAULTS: CameraState = {
  x: 0.5,
  y: 0.5,
  zoom: 1,
  rotation: 0,
  tiltX: 0,
  tiltY: 0,
};

/**
 * How close the far edge of a tilted plane may get to the horizon, as a
 * fraction of the viewer distance. Past the horizon a screen point unprojects
 * to infinity: the world plane no longer covers the frame at any camera
 * position, so "never show the void" stops being satisfiable. Tilt is scaled
 * back to hold this margin.
 */
const HORIZON_MARGIN = 0.35;

/** Cameras accelerate AND decelerate — the house `outSmooth` is an entrance ease. */
const DEFAULT_CAMERA_EASE: EasingFunction = Easing.inOutCubic;

const RHO = Math.SQRT2;
const RHO2 = 2;
const RHO4 = 4;
/** Below this (world px²) a move counts as "no pan". */
const PAN_EPSILON_SQ = 1e-12;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Fold -0 into 0. `-z·sin(0)` yields -0, which is valid CSS but ugly and
 * makes matrices that are mathematically equal compare unequal. */
function nz(v: number): number {
  return v === 0 ? 0 : v;
}

type ResolvedKeyframe = CameraState &
  Pick<CameraKeyframe, "at" | "ease" | "path" | "focus" | "fit" | "fitMode">;

/**
 * Sort by `at` and fill every omitted field from the previous keyframe.
 *
 * Equal `at` values are kept, not merged: they express a hard cut (the camera
 * is at the earlier one up to that frame and the later one from it onwards).
 * `cameraAt` only ever interpolates across a strictly-increasing pair, so the
 * zero-length segment between them is never fed to `interpolate`, which throws
 * on a non-increasing input range.
 */
export function resolveCameraKeyframes(
  keyframes: readonly CameraKeyframe[],
): ResolvedKeyframe[] {
  const sorted = [...keyframes].sort((a, b) => a.at - b.at);
  const out: ResolvedKeyframe[] = [];
  let prev: CameraState = CAMERA_DEFAULTS;
  for (const kf of sorted) {
    const resolved: ResolvedKeyframe = {
      at: kf.at,
      x: kf.x ?? prev.x,
      y: kf.y ?? prev.y,
      zoom: kf.zoom ?? prev.zoom,
      rotation: kf.rotation ?? prev.rotation,
      tiltX: kf.tilt?.x ?? prev.tiltX,
      tiltY: kf.tilt?.y ?? prev.tiltY,
      ease: kf.ease,
      path: kf.path,
      focus: kf.focus,
      fit: kf.fit,
      fitMode: kf.fitMode,
    };
    out.push(resolved);
    prev = resolved;
  }
  return out;
}

/**
 * The van Wijk & Nuij (2003) optimal zoom-and-pan path, in world pixels.
 * `w` is the viewport width expressed in world px — the units must match the
 * centre coordinates or the metric stops being scale-invariant.
 */
function vanWijkPath(
  ux0: number,
  uy0: number,
  w0: number,
  ux1: number,
  uy1: number,
  w1: number,
): (t: number) => { cx: number; cy: number; w: number } {
  const dx = ux1 - ux0;
  const dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;

  // No pan (and therefore also the identical-endpoints case): the general form
  // divides by |d|, so it must not be used here. This reduces to pure log zoom.
  if (d2 < PAN_EPSILON_SQ) {
    return (t) => ({
      cx: ux0 + dx * t,
      cy: uy0 + dy * t,
      w: w0 * Math.pow(w1 / w0, t),
    });
  }

  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + RHO4 * d2) / (2 * w0 * RHO2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - RHO4 * d2) / (2 * w1 * RHO2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / RHO;
  const coshr0 = Math.cosh(r0);
  const sinhr0 = Math.sinh(r0);

  return (t) => {
    const s = t * S;
    const u =
      (w0 / (RHO2 * d1)) * (coshr0 * Math.tanh(RHO * s + r0) - sinhr0);
    return {
      cx: ux0 + u * dx,
      cy: uy0 + u * dy,
      w: (w0 * coshr0) / Math.cosh(RHO * s + r0),
    };
  };
}

/**
 * Widest the viewport gets along a "smooth" path. A pure pan bulges out to
 * sqrt(w² + d²) at its midpoint; if that exceeds the world we fall back to the
 * straight path rather than let the clamp kink the geodesic.
 */
function smoothPathMaxWidth(
  ux0: number,
  uy0: number,
  w0: number,
  ux1: number,
  uy1: number,
  w1: number,
): number {
  const dx = ux1 - ux0;
  const dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;
  if (d2 < PAN_EPSILON_SQ) return Math.max(w0, w1);
  // The path's width peaks where cosh() is minimised; b0 > 0 means r0 < 0,
  // which puts that peak strictly inside the segment.
  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + RHO4 * d2) / (2 * w0 * RHO2 * d1);
  if (b0 >= 0) return Math.max(w0, w1);
  return Math.max(w0, w1, w0 * Math.sqrt(b0 * b0 + 1));
}

function stateAtSegment(
  a: ResolvedKeyframe,
  b: ResolvedKeyframe,
  t: number,
  geometry: CameraGeometry,
): CameraState {
  const rotation = lerp(a.rotation, b.rotation, t);
  const tiltX = lerp(a.tiltX, b.tiltX, t);
  const tiltY = lerp(a.tiltY, b.tiltY, t);

  if (b.path === "smooth") {
    const worldW = geometry.width * geometry.world;
    const worldH = geometry.height * geometry.world;
    const w0 = geometry.width / a.zoom;
    const w1 = geometry.width / b.zoom;
    const ux0 = a.x * worldW;
    const uy0 = a.y * worldH;
    const ux1 = b.x * worldW;
    const uy1 = b.y * worldH;

    // A bulge wider than the world would be clamped mid-arc, which reads as a
    // kink. Straight-line motion is the better failure.
    const maxW = smoothPathMaxWidth(ux0, uy0, w0, ux1, uy1, w1);
    if (maxW <= worldW && (maxW * geometry.height) / geometry.width <= worldH) {
      const point = vanWijkPath(ux0, uy0, w0, ux1, uy1, w1)(t);
      return {
        x: point.cx / worldW,
        y: point.cy / worldH,
        zoom: geometry.width / point.w,
        rotation,
        tiltX,
        tiltY,
      };
    }
  }

  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    // Log space: linear zoom decelerates hard and reads as a lurch then a crawl.
    zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), t)),
    rotation,
    tiltX,
    tiltY,
  };
}

function applyOverride(
  kf: ResolvedKeyframe,
  override: CameraFocusOverride | undefined,
): ResolvedKeyframe {
  if (!override) return kf;
  return {
    ...kf,
    x: override.x ?? kf.x,
    y: override.y ?? kf.y,
    zoom: override.zoom ?? kf.zoom,
  };
}

/** Smooth, non-repeating ambient sway. Two incommensurate sines, no clock. */
function driftOffset(
  frame: number,
  fps: number,
  drift: DriftOptions,
): { dx: number; dy: number; rotation: number } {
  const amount = drift.amount ?? 0;
  const rotate = drift.rotate ?? 0;
  if (amount === 0 && rotate === 0) return { dx: 0, dy: 0, rotation: 0 };

  const speed = drift.speed ?? 0.4;
  const seed = drift.seed ?? "drift";
  const w1 = (2 * Math.PI * speed) / fps;
  const w2 = w1 * 0.633;
  const px = random(seed + ":px") * Math.PI * 2;
  const py = random(seed + ":py") * Math.PI * 2;
  const pr = random(seed + ":pr") * Math.PI * 2;

  return {
    dx:
      amount *
      (0.6 * Math.sin(frame * w1 + px) + 0.4 * Math.sin(frame * w2 + px * 1.7)),
    dy:
      amount *
      (0.6 * Math.sin(frame * w2 + py) + 0.4 * Math.sin(frame * w1 + py * 1.3)),
    rotation: rotate * Math.sin(frame * w2 * 0.8 + pr),
  };
}

/**
 * Decaying impact shake. Noise is sampled at `frequency` and smoothstepped
 * between samples, so the jolt is controllable rather than per-frame hash.
 */
function shakeOffset(
  frame: number,
  fps: number,
  shake: ShakeOptions,
): { dx: number; dy: number; rotation: number } {
  const duration = shake.duration ?? 12;
  const elapsed = frame - shake.at;
  if (elapsed < 0 || elapsed >= duration) {
    return { dx: 0, dy: 0, rotation: 0 };
  }

  const amount = shake.amount ?? 0;
  const rotate = shake.rotate ?? 0;
  const decay = 1 - clamp01(elapsed / duration);
  const seed = shake.seed ?? "shake";
  const k = (elapsed * (shake.frequency ?? 14)) / fps;
  const i = Math.floor(k);
  const fract = k - i;
  const smooth = fract * fract * (3 - 2 * fract);

  const sample = (axis: string, n: number) =>
    random(`${seed}:${axis}:${n}`) * 2 - 1;
  const noise = (axis: string) =>
    lerp(sample(axis, i), sample(axis, i + 1), smooth);

  return {
    dx: amount * decay * noise("x"),
    dy: amount * decay * noise("y"),
    rotation: rotate * decay * noise("r"),
  };
}

/**
 * Perspective terms for a tilt. The projected depth of a frame point (sx, sy),
 * measured relative to the viewer distance, is `1 + (A·sx + B·sy)/P` — so
 * `A`/`B` are the per-axis rates at which the plane recedes across the frame.
 */
function tiltTerms(tiltX: number, tiltY: number) {
  const a = (tiltX * Math.PI) / 180;
  const b = (tiltY * Math.PI) / 180;
  const cosA = Math.cos(a);
  const cosB = Math.cos(b);
  const tanB = Math.tan(b);
  return {
    a,
    b,
    cosA,
    cosB,
    sinA: Math.sin(a),
    tanB,
    degenerate: Math.abs(cosA) < 1e-6 || Math.abs(cosB) < 1e-6,
    // Recession rates: A along x, B along y.
    A: -tanB / cosA,
    B: Math.tan(a),
  };
}

/**
 * Headroom before the horizon enters the frame, as a fraction of the viewer
 * distance. 1 is flat-on; 0 means a frame corner sits exactly on the horizon.
 */
export function horizonHeadroom(
  tiltX: number,
  tiltY: number,
  geometry: CameraGeometry,
): number {
  const t = tiltTerms(tiltX, tiltY);
  if (t.degenerate) return -Infinity;
  const P = perspectiveDistance(geometry);
  const worst =
    P - (Math.abs(t.A) * geometry.width) / 2 - (Math.abs(t.B) * geometry.height) / 2;
  return worst / P;
}

/**
 * Scale a tilt back until the horizon stays out of frame. Returns the tilt
 * unchanged when it already clears `HORIZON_MARGIN`.
 *
 * Note this is independent of zoom: the recession rates are expressed in frame
 * space, so how far you can tip the plane depends only on the tilt angles, the
 * viewer distance, and the frame's aspect.
 */
export function clampTilt(
  tiltX: number,
  tiltY: number,
  geometry: CameraGeometry,
): { tiltX: number; tiltY: number } {
  if (tiltX === 0 && tiltY === 0) return { tiltX, tiltY };
  if (horizonHeadroom(tiltX, tiltY, geometry) >= HORIZON_MARGIN) {
    return { tiltX, tiltY };
  }
  // Headroom falls monotonically as the angles grow, so bisect the scale.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (horizonHeadroom(tiltX * mid, tiltY * mid, geometry) >= HORIZON_MARGIN) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { tiltX: tiltX * lo, tiltY: tiltY * lo };
}

/**
 * The world-space box the frame covers, as offsets from the camera centre.
 *
 * Unprojects the four frame corners onto the world plane. Without tilt this is
 * the rolled viewport rectangle; with tilt it is a trapezoid, and its bounding
 * box is what the clamp has to keep inside the world. The shape does not depend
 * on where the camera is — only on zoom, roll and tilt — so the camera centre
 * simply translates it.
 *
 * Returns null when a corner lies at or past the horizon.
 */
function viewportBounds(
  state: CameraState,
  geometry: CameraGeometry,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const t = tiltTerms(state.tiltX, state.tiltY);
  if (t.degenerate) return null;

  const P = perspectiveDistance(geometry);
  const { width: W, height: H } = geometry;
  const theta = (state.rotation * Math.PI) / 180;
  // Inverse of the roll+scale part: (1/z)·R(−θ).
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const inv = 1 / state.zoom;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const sx of [-W / 2, W / 2]) {
    for (const sy of [-H / 2, H / 2]) {
      const den = P + t.A * sx + t.B * sy;
      if (!(den > 1e-6)) return null;
      // Undo the perspective divide, then the 3D rotation, on the z=0 plane.
      const k = P / den;
      const qx = (sx * k) / t.cosB;
      const qy = (k * (sy - sx * t.sinA * t.tanB)) / t.cosA;
      // Undo roll and zoom to land back in world units.
      const ox = inv * (cosT * qx + sinT * qy);
      const oy = inv * (-sinT * qx + cosT * qy);
      if (ox < minX) minX = ox;
      if (ox > maxX) maxX = ox;
      if (oy < minY) minY = oy;
      if (oy > maxY) maxY = oy;
    }
  }
  return { minX, maxX, minY, maxY };
}

/** Smallest zoom that still keeps the frame inside the world at this attitude. */
export function minZoomForWorld(
  geometry: CameraGeometry,
  rotationDegrees = 0,
  tiltX = 0,
  tiltY = 0,
): number {
  const probe: CameraState = {
    ...CAMERA_DEFAULTS,
    zoom: 1,
    rotation: rotationDegrees,
    tiltX,
    tiltY,
  };
  const b = viewportBounds(probe, geometry);
  if (!b) return Infinity;
  const { width: W, height: H, world } = geometry;
  // Extents scale as 1/zoom, so the zoom that just fits is extent-at-1 / world.
  return Math.max((b.maxX - b.minX) / (W * world), (b.maxY - b.minY) / (H * world));
}

/**
 * Keep the frame inside the world. Note the legal range for `x`/`y` shrinks as
 * zoom drops — at world=1 only dead centre is legal — so two keyframes that
 * clamp differently can turn an intended push-in into a diagonal pan. See
 * `cameraClampWarnings`.
 */
export function clampCamera(
  state: CameraState,
  geometry: CameraGeometry,
): CameraState {
  const bounds = viewportBounds(state, geometry);
  // Horizon in frame — no camera position covers the world, so leave the
  // author's value alone rather than snap somewhere arbitrary.
  if (!bounds) return state;

  const worldW = geometry.width * geometry.world;
  const worldH = geometry.height * geometry.world;
  const { minX, maxX, minY, maxY } = bounds;

  const fit = (
    c: number,
    lo: number,
    hi: number,
    extent: number,
  ): number =>
    // When the footprint is bigger than the world there is no legal position;
    // centring the footprint keeps the void symmetric.
    hi - lo <= extent
      ? Math.min(Math.max(c, -lo), extent - hi)
      : extent / 2 - (lo + hi) / 2;

  return {
    ...state,
    x: fit(state.x * worldW, minX, maxX, worldW) / worldW,
    y: fit(state.y * worldH, minY, maxY, worldH) / worldH,
  };
}

/** Camera position at `frame`. Pure: identical for any evaluation order. */
export function cameraAt(
  frame: number,
  keyframes: readonly CameraKeyframe[],
  options: CameraAtOptions,
): CameraState {
  const { geometry, fps, overrides, drift, shake, clamp = true } = options;
  const resolved = resolveCameraKeyframes(keyframes);

  let state: CameraState;
  if (resolved.length === 0) {
    state = CAMERA_DEFAULTS;
  } else {
    // Largest index whose `at` has been reached. Because it is the LAST such
    // index, the pair (i, i+1) always has a strictly increasing `at`, so equal
    // `at` values act as a cut instead of producing a zero-length segment.
    let i = -1;
    for (let k = 0; k < resolved.length; k++) {
      if (resolved[k]!.at <= frame) i = k;
      else break;
    }

    if (i < 0) {
      state = applyOverride(resolved[0]!, overrides?.[0]);
    } else if (i >= resolved.length - 1) {
      state = applyOverride(resolved[i]!, overrides?.[i]);
    } else {
      const a = applyOverride(resolved[i]!, overrides?.[i]);
      const b = applyOverride(resolved[i + 1]!, overrides?.[i + 1]);
      const ease = resolved[i + 1]!.ease ?? DEFAULT_CAMERA_EASE;
      // Ease exactly once, here. Every channel then lerps on this same `t` —
      // easing a second time downstream would stall the first third of the move.
      const t = ease(clamp01((frame - a.at) / (b.at - a.at)));
      state = stateAtSegment(a, b, t, geometry);
    }
  }

  // Drift and shake perturb the camera PARAMETERS, before any depth lerp, so a
  // depth={0} layer stays genuinely locked to the screen through both.
  if (drift || shake) {
    const worldW = geometry.width * geometry.world;
    const worldH = geometry.height * geometry.world;
    let dx = 0;
    let dy = 0;
    let dr = 0;

    if (drift) {
      const d = driftOffset(frame, fps, drift);
      dx += d.dx;
      dy += d.dy;
      dr += d.rotation;
    }
    if (shake) {
      for (const s of Array.isArray(shake) ? shake : [shake]) {
        const o = shakeOffset(frame, fps, s);
        dx += o.dx;
        dy += o.dy;
        dr += o.rotation;
      }
    }

    // Offsets are authored in FRAME px so they read the same at any zoom;
    // dividing by zoom converts them to the world px the centre lives in.
    state = {
      ...state,
      x: state.x + dx / state.zoom / worldW,
      y: state.y + dy / state.zoom / worldH,
      rotation: state.rotation + dr,
    };
  }

  if (!clamp) return state;

  // Tilt first: how far the plane may tip is what decides whether a legal
  // camera position exists at all, so the position clamp reads the capped tilt.
  const tilt = clampTilt(state.tiltX, state.tiltY, geometry);
  return clampCamera(
    { ...state, tiltX: tilt.tiltX, tiltY: tilt.tiltY },
    geometry,
  );
}

/**
 * The view matrix for a layer at `depth`: 1 is world-locked, 0 is screen-locked,
 * fractions are parallax.
 *
 * The camera PARAMETERS are lerped, never the matrices — a componentwise lerp
 * of two rotation matrices is not a rotation matrix, it shears. Zoom uses z^d
 * so parallax composes multiplicatively, which is what depth means.
 */
export function cameraMatrix(
  state: CameraState,
  geometry: CameraGeometry,
  depth = 1,
): CameraMatrix {
  const worldW = geometry.width * geometry.world;
  const worldH = geometry.height * geometry.world;

  const zoom = Math.pow(state.zoom, depth);
  const theta = ((state.rotation * depth) * Math.PI) / 180;
  const cx = lerp(worldW / 2, state.x * worldW, depth);
  const cy = lerp(worldH / 2, state.y * worldH, depth);

  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const a = zoom * cos;
  const b = zoom * sin;
  const c = -zoom * sin;
  const d = zoom * cos;
  const e = geometry.width / 2 - (a * cx + c * cy);
  const f = geometry.height / 2 - (b * cx + d * cy);

  return [nz(a), nz(b), nz(c), nz(d), nz(e), nz(f)];
}

/** Map a frame-space point back into world px. Used to resolve `focus` targets. */
export function invertCameraMatrix(
  m: CameraMatrix,
  sx: number,
  sy: number,
): { x: number; y: number } {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (det === 0 || !Number.isFinite(det)) return { x: 0, y: 0 };
  const px = sx - e;
  const py = sy - f;
  return {
    x: (d * px - c * py) / det,
    y: (-b * px + a * py) / det,
  };
}

/**
 * Serialize to CSS, or null if any component is non-finite.
 *
 * A single NaN/Infinity (a `fit` against a zero-size rect, say) makes the whole
 * declaration invalid, so the browser silently drops it and the world snaps to
 * identity for that frame. Returning null lets the caller hold the last good
 * value instead.
 */
export function cameraMatrixToCss(m: CameraMatrix): string | null {
  for (const v of m) {
    if (!Number.isFinite(v)) return null;
  }
  return `matrix(${m[0]},${m[1]},${m[2]},${m[3]},${m[4]},${m[5]})`;
}

/**
 * The full CSS transform for a layer, including perspective tilt.
 *
 * Without tilt this is exactly the 2D matrix. With tilt the recentring
 * translation is pulled back out in front of the rotations, so the plane pivots
 * about the frame centre — the point the camera is looking at — rather than
 * about the world's top-left origin where `transform-origin` sits. The
 * perspective itself is NOT here: it lives on the parent as the `perspective`
 * property, so every depth layer shares one vanishing point.
 */
export function cameraTransform(
  state: CameraState,
  geometry: CameraGeometry,
  depth = 1,
): string | null {
  const m = cameraMatrix(state, geometry, depth);
  const tiltX = state.tiltX * depth;
  const tiltY = state.tiltY * depth;
  if (tiltX === 0 && tiltY === 0) return cameraMatrixToCss(m);

  // e/f already fold in the translate to frame centre; subtract it back off so
  // the rotations sit between the translate and the scale.
  const parts = [m[0], m[1], m[2], m[3], m[4] - geometry.width / 2, m[5] - geometry.height / 2];
  for (const v of parts) {
    if (!Number.isFinite(v)) return null;
  }
  if (!Number.isFinite(tiltX) || !Number.isFinite(tiltY)) return null;
  return (
    `translate(${geometry.width / 2}px,${geometry.height / 2}px) ` +
    `rotateX(${tiltX}deg) rotateY(${tiltY}deg) ` +
    `matrix(${parts[0]},${parts[1]},${parts[2]},${parts[3]},${parts[4]},${parts[5]})`
  );
}

/** Zoom that frames a world-space rect at `fit` of the frame. */
export function zoomToFit(
  rect: { width: number; height: number },
  geometry: CameraGeometry,
  fit = 1,
  mode: "contain" | "cover" = "contain",
): number {
  if (rect.width <= 0 || rect.height <= 0 || fit <= 0) return Number.NaN;
  const sx = geometry.width / rect.width;
  const sy = geometry.height / rect.height;
  return (mode === "cover" ? Math.max(sx, sy) : Math.min(sx, sy)) * fit;
}

/**
 * Authoring mistakes worth a dev-time warning. The clamp one matters most: a
 * push-in whose endpoints clamp by different amounts becomes a pan the author
 * never wrote, and nothing about the output says so.
 */
export function cameraClampWarnings(
  keyframes: readonly CameraKeyframe[],
  geometry: CameraGeometry,
): string[] {
  const warnings: string[] = [];
  const resolved = resolveCameraKeyframes(keyframes);
  let worstZoom = Infinity;

  for (const kf of resolved) {
    if (kf.focus) continue; // measured later; its declared value is just a fallback
    const clamped = clampCamera(kf, geometry);
    if (
      Math.abs(clamped.x - kf.x) > 1e-6 ||
      Math.abs(clamped.y - kf.y) > 1e-6
    ) {
      warnings.push(
        `Camera keyframe at frame ${kf.at} was clamped to stay inside the world ` +
          `(x ${kf.x.toFixed(3)}→${clamped.x.toFixed(3)}, ` +
          `y ${kf.y.toFixed(3)}→${clamped.y.toFixed(3)}). ` +
          `At zoom ${kf.zoom.toFixed(2)} with world=${geometry.world}, x and y are ` +
          `limited to the centre of the frame. Raise \`world\` or \`zoom\`.`,
      );
    }
    worstZoom = Math.min(worstZoom, kf.zoom);
  }

  for (const kf of resolved) {
    const capped = clampTilt(kf.tiltX, kf.tiltY, geometry);
    if (
      Math.abs(capped.tiltX - kf.tiltX) > 1e-6 ||
      Math.abs(capped.tiltY - kf.tiltY) > 1e-6
    ) {
      warnings.push(
        `Camera keyframe at frame ${kf.at} tilts far enough to bring the horizon ` +
          `into frame, so it was reduced to ` +
          `(${capped.tiltX.toFixed(1)}°, ${capped.tiltY.toFixed(1)}°). ` +
          `Raise \`perspective\` for a longer lens, or tilt less.`,
      );
    } else if (Math.max(Math.abs(kf.tiltX), Math.abs(kf.tiltY)) > 25) {
      // Legal, but past roughly this angle a tilt stops reading as a camera
      // and starts reading as a page folded in half.
      warnings.push(
        `Camera keyframe at frame ${kf.at} tilts ` +
          `(${kf.tiltX.toFixed(1)}°, ${kf.tiltY.toFixed(1)}°). ` +
          `Tilts beyond ~25° read as a CSS effect rather than a camera; ` +
          `8–20° is the cinematic range.`,
      );
    }
  }

  if (Number.isFinite(worstZoom)) {
    const needed = minZoomForWorld(geometry, 0);
    if (worstZoom < needed - 1e-6) {
      warnings.push(
        `Camera zoom drops to ${worstZoom.toFixed(2)} but world=${geometry.world} ` +
          `needs at least ${needed.toFixed(2)} to fill the frame. ` +
          `Set world={${(1 / worstZoom).toFixed(2)}} or higher.`,
      );
    }
  }

  return warnings;
}
