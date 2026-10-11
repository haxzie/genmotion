/**
 * Shared stage, easing, fonts and seeded randomness for the whole film.
 *
 * Stage: 1 world unit = 100 composition px at z = 0 when the camera sits at
 * `stageDistance`. A page drawn in CSS px therefore shows 1:1 at zoom 1, and
 * `zoom` is simply "how many screen px per page px".
 */
import * as THREE from "three";
import type { ThreeFrame, ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";

export const PX = 0.01;
export const FOV = 30;

/** Distance at which 1 world unit reads as 100 px. */
export function stageDistance(height: number): number {
  return (height * PX) / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
}

export function fitCamera(camera: THREE.Camera, height: number): number {
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = FOV;
  cam.near = 0.05;
  cam.far = 600;
  const d = stageDistance(height);
  cam.position.set(0, 0, d);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  return d;
}

/* ---------------------------------------------------------------- framing */

/**
 * Everything aspect-dependent, in one place. The film was composed for 16:9 and
 * re-framed for 1:1: a square frame gets slimmer bars, a slightly wider lens on
 * the UI, and the red line's lock zoom is fitted to the frame's width.
 */
export function framing(width: number, height: number) {
  const aspect = width / height;
  const wide = aspect > 1.5;
  return {
    wide,
    /** letterbox bar, as a fraction of the height (top and bottom each) */
    bar: wide ? (1 - width / 2.39 / height) / 2 : 0.085,
    /** multiplier on UI zooms, so buttons and dialogs still fit a narrower frame */
    fit: Math.pow(Math.min(1, aspect / (16 / 9)), 0.4),
    /** zoom at which the punch line is held: its longest variant fills ~86% of the width */
    lock: Math.min(1.95, (width * 0.86) / 740),
    /** left edge of the HUD counter, px from centre */
    hudX: -(width / 2 - width * 0.078),
  };
}

/* ----------------------------------------------------------------- easing */

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const inCubic = (t: number) => t * t * t;
export const outQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const outExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const inOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const inOutQuint = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);

/** Eased 0→1 progress of a move that starts at `start` and lasts `dur` frames. */
export const prog = (f: number, start: number, dur: number, ease: (t: number) => number = outCubic) =>
  ease(clamp01((f - start) / Math.max(1e-6, dur)));

export const lerp = THREE.MathUtils.lerp;

/** Piecewise keyed value: keys sorted by frame, each segment eased. */
export function keyed(f: number, keys: [number, number][], ease: (t: number) => number = inOutCubic): number {
  if (f <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1] = keys[i]!;
    const [f0, v0] = keys[i - 1]!;
    if (f <= f1) return lerp(v0, v1, ease((f - f0) / Math.max(1e-6, f1 - f0)));
  }
  return keys[keys.length - 1]![1];
}

/** Deterministic PRNG (mulberry32). Call in the builder, never per frame. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap deterministic hash noise for per-frame jitter: same (i) → same value. */
export const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* ------------------------------------------------------------------ fonts */

export const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';

/**
 * Build the scene only once Inter has loaded, inside the export's frame
 * barrier, so no texture is ever drawn in a fallback face.
 */
export function withFonts(ctx: ThreeSceneContext, build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  let ready = false;
  doc.fonts.forEach((face) => {
    if (face.status === "loaded" && face.family.replace(/"/g, "") === "Inter") ready = true;
  });
  if (ready) return build();

  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = `fonts:${interUrl}`;
  ctx.manager.itemStart(key);
  new FontFace("Inter", `url(${interUrl})`, { weight: "100 900" })
    .load()
    .then((face) => {
      (doc.fonts as unknown as Set<FontFace>).add(face);
    })
    .catch(() => undefined)
    .then(() => {
      update = build();
      if (last) update(last);
    })
    .finally(() => ctx.manager.itemEnd(key));
  return (frame) => {
    last = frame;
    update?.(frame);
  };
}
