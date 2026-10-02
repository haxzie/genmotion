# The rig: stage, units and the ease module

Two small modules every Three.js film starts from. Copy them into `components/` once; every scene imports them. Both compile against `three` r185 and `@genmotion/three-engine` as they are, with the project's strict TypeScript settings, and contain no randomness and no wall-clock timers.

Contents: 1 `components/stage.ts` · 2 `components/ease.ts` · 3 Using them · 4 Orthographic and pixel-space scenes

## 1. `components/stage.ts`

One unit = 100 composition px on the z = 0 plane, the convention the 3D product templates use. Sizes in px are then true on-screen sizes, in any aspect.

```ts
import * as THREE from "three";

/** World units per composition px on the z = 0 plane: 1 unit = 100 px. */
export const PX = 0.01;
/** Canvas px per composition px for every canvas texture (capture runs at up to 2x DPR). */
export const RES = 2;

/** Camera distance at which the z = 0 plane shows `height / 100` units, i.e. 100 px per unit. */
export function unitDistance(height: number, fovDeg = 50): number {
  return (height * PX) / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
}

/** Put the camera on +z, looking at the origin, so sizes given in px are true on-screen px at z = 0. */
export function fitCamera(camera: THREE.Camera, height: number, fovDeg = 50): number {
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = fovDeg;
  cam.near = 0.1;
  cam.far = 400;
  cam.updateProjectionMatrix();
  const d = unitDistance(height, fovDeg);
  cam.position.set(0, 0, d);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(); // so project()/matrixWorld are right before the first render
  return d;
}

/** Composition px per world unit for an object `dist` units in front of a perspective camera. */
export function pxPerUnit(height: number, fovDeg: number, dist: number): number {
  return height / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2) * dist);
}

/** Half the visible frame, in world units, at z = 0 after fitCamera. */
export function halfFrame(width: number, height: number) {
  return { halfW: (width / 2) * PX, halfH: (height / 2) * PX };
}

/** Scale that fits a block `wPx` x `hPx` inside the frame minus a margin, never above 1. */
export function fitBlock(width: number, height: number, wPx: number, hPx: number, margin = 0.08): number {
  return Math.min(1, (width * (1 - 2 * margin)) / wPx, (height * (1 - 2 * margin)) / hPx);
}

/**
 * A layer glued to the camera, 1 unit = 1 composition px, for flashes, floods, wipes,
 * grain and captions that must never move with the shot. Call `fit()` after any fov change.
 * renderOrder 900 on the GROUP: three.js sorts by the nearest ancestor Group's order first,
 * so this is what puts a cover layer above type the world wrapped in onTop() (`three-type`).
 * A Group nested inside it starts again at its own order (0): give it 900 too.
 */
export function overlay(scene: THREE.Scene, camera: THREE.PerspectiveCamera, height: number, dist = 1) {
  const group = new THREE.Group();
  group.name = "overlay";
  group.renderOrder = 900;
  group.userData.pickable = false;
  group.position.z = -dist;
  camera.add(group);
  scene.add(camera); // a camera's children only render when the camera is in the scene
  const fit = () => group.scale.setScalar((2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist) / height);
  fit();
  return { group, fit };
}
```

## 2. `components/ease.ts`

The house curves from `motion-language` (its `references/easing.md` has the formulas and when to use each), typed, plus the two things the engine's `interpolate` cannot do: a multi-key move that does not stop at interior keys, and zoom in log space.

```ts
export type Ease = (t: number) => number;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0..1 progress of `frame` through [start, start + dur], eased. */
export const prog = (frame: number, start: number, dur: number, ease: Ease = (t) => t) =>
  ease(clamp01((frame - start) / dur));

export const outQuad: Ease = (t) => 1 - (1 - t) ** 2;
export const outCubic: Ease = (t) => 1 - (1 - t) ** 3;
export const outQuart: Ease = (t) => 1 - (1 - t) ** 4;
export const inCubic: Ease = (t) => t * t * t;
export const inOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const inOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
/** `ease` run only to `k` of its curve, rescaled to end at 1: still moving on its last frame (a count that must not park before the land uses trunc(outQuart, 0.85)). */
export const trunc = (ease: Ease, k: number): Ease => (t) => ease(k * t) / ease(k);

/** cubic-bezier(x1, y1, x2, y2) solved by Newton then bisection: CSS-identical, deterministic. */
export function bezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sy = (s: number) => ((ay * s + by) * s + cy) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const err = sx(s) - t;
      const d = dx(s);
      if (Math.abs(err) < 1e-6) return sy(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0, hi = 1;
    s = t;
    for (let i = 0; i < 30; i++) {
      if (sx(s) < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return sy(s);
  };
}
/** The house entrance ease. */
export const outSmooth = bezier(0.25, 1, 0.5, 1);

/** Keys [0 -> peak at 60% -> 1], outQuad each half: the house pop (1.06 headline, 1.08 button). */
export const pop = (frame: number, start: number, dur = 14, peak = 1.08) => {
  const k = start + dur * 0.6;
  if (frame <= start) return 0;
  if (frame < k) return lerp(0, peak, 1 - (1 - (frame - start) / (k - start)) ** 2);
  return lerp(peak, 1, 1 - (1 - clamp01((frame - k) / (start + dur - k))) ** 2);
};

/**
 * Monotone cubic (Fritsch-Carlson) through keys: passes every key, never overshoots,
 * never stops at an interior key. `startSlope`/`endSlope` (value per frame) let a move
 * enter or leave at speed, for a camera that carries across a cut.
 */
export function glide(keys: number[], vals: number[], startSlope = 0, endSlope = 0): (frame: number) => number {
  const n = keys.length;
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((vals[i + 1]! - vals[i]!) / (keys[i + 1]! - keys[i]!));
  m[0] = startSlope;
  m[n - 1] = endSlope;
  for (let i = 1; i < n - 1; i++) {
    const a = d[i - 1]!, b = d[i]!;
    if (a * b <= 0) continue; // a turn or a hold: stop here on purpose
    const h0 = keys[i]! - keys[i - 1]!, h1 = keys[i + 1]! - keys[i]!;
    const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / a + w2 / b);
  }
  return (frame) => {
    if (frame <= keys[0]!) return vals[0]!;
    if (frame >= keys[n - 1]!) return vals[n - 1]!;
    let i = 0;
    while (frame > keys[i + 1]!) i++;
    const h = keys[i + 1]! - keys[i]!, s = (frame - keys[i]!) / h;
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * vals[i]! + (s3 - 2 * s2 + s) * h * m[i]! +
      (-2 * s3 + 3 * s2) * vals[i + 1]! + (s3 - s2) * h * m[i + 1]!;
  };
}

/** Zoom or camera distance interpolated in log space, so a push feels even all the way in. */
export const logLerp = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));

const TAU = Math.PI * 2;
/** Drift: two incommensurate sines. amp in world units, hz 0.18-0.4. */
export function drift(time: number, amp: number, hz = 0.25) {
  const w = TAU * hz;
  return {
    x: amp * (0.65 * Math.sin(w * time) + 0.35 * Math.sin(0.633 * w * time + 1.7)),
    y: amp * 0.6 * (0.65 * Math.sin(0.81 * w * time + 2.1) + 0.35 * Math.sin(0.52 * w * time + 0.4)),
  };
}
/** Drift that is exactly zero on the first and last frame of the scene (progress 0 and 1). */
export function restDrift(progress: number, ampX: number, ampY: number) {
  return { x: ampX * Math.sin(TAU * progress), y: ampY * Math.sin(Math.PI * progress) * Math.sin(TAU * progress) };
}
/** 1 at each event time (seconds), decaying: flashes, shakes, fov punches. */
export function kick(time: number, times: number[], sharp = 12): number {
  let v = 0;
  for (const t0 of times) if (time >= t0) v = Math.max(v, Math.exp(-(time - t0) * sharp));
  return v;
}
/** Deterministic hash of an integer to [0, 1): per-item jitter, per-frame shake. */
export function hash1(n: number): number {
  let t = (Math.imul(n | 0, 0x9e3779b1) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
```

## 3. Using them

```ts
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { glide, logLerp, prog, inOutCubic, restDrift } from "../components/ease";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { camera, height } = ctx;
  const cam = camera as THREE.PerspectiveCamera;
  const D0 = fitCamera(cam, height);               // z = 0 is now 100 px per unit
  const pan = glide([0, 40, 80], [0, 220, 300]);   // x in px: glides through the middle key
  return ({ frame, progress }) => {
    const push = prog(frame, 20, 36, inOutCubic);  // 36f readable push
    const d = restDrift(progress, 4 * PX, 2.5 * PX);
    cam.position.set(pan(frame) * PX + d.x, d.y, logLerp(D0, D0 / 1.6, push)); // 1.6x, log space
  };
}
```

- Each scene receives its own camera from the host, built fresh for that scene: nothing parented to it (an `overlay()` group, a light) and no position set in one scene survives the cut, so every scene calls `fitCamera` (or sets its camera) itself.
- Lay everything out in composition px times `PX`. A headline 120 px tall at z = 0 is exactly 120 px on screen at the fitted distance, in 16:9 and 9:16 alike.
- Anything at another depth scales by `D0 / (D0 − z)`: an object at z = +2 (towards the camera) appears `D0 / (D0 − 2)` times larger. Use it to place parallax layers on purpose.
- `logLerp(D0, D0 / k, t)` is a zoom of k× on the z = 0 plane: apparent size goes as 1 / distance, so interpolate the distance's log.

## 4. Orthographic and pixel-space scenes

Flat films (whiteboard, chat UI, 2D compositors) are easier in a pixel camera: 1 unit = 1 px, origin top-left, y down via negative positions.

```ts
const cam = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -100, 100);
cam.position.set(width / 2, -height / 2, 10);  // (0,0) is the top-left corner; place things at (x, -y)
ctx.setCamera(cam);
// zoom: cam.zoom = z; cam.updateProjectionMatrix(); drift: move cam.position by px
```

- Zoom on an orthographic camera is `cam.zoom` (log-interpolate it too), and pans are camera position in px, so a keyed one-shot film is `[frame, x, y, zoom]` keys through `glide`.
- Drift in px divided by the current zoom, so it reads the same at every magnification.
