import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

/** Design frame. Everything is authored in these px; other aspects fit by height. */
export const W = 1920;
export const H = 1080;

/** Orthographic camera where 1 world unit = 1 px of the 1920×1080 design frame. */
export function orthoStage(ctx: ThreeSceneContext) {
  const aspect = ctx.width / ctx.height;
  const halfH = H / 2;
  const halfW = Math.max(W / 2, halfH * aspect);
  const hh = halfW / aspect;
  const cam = new THREE.OrthographicCamera(-halfW, halfW, hh, -hh, -5000, 5000);
  cam.position.set(0, 0, 1000);
  ctx.setCamera(cam);
  return cam;
}

/**
 * Perspective camera where, at z = 0, 1 world unit = 1 design px (fov 50).
 * Returns the camera distance so moves can be expressed relative to it.
 */
export function perspStage(ctx: ThreeSceneContext, fov = 50) {
  const cam = ctx.camera as THREE.PerspectiveCamera;
  cam.fov = fov;
  cam.near = 1;
  cam.far = 40000;
  const aspect = ctx.width / ctx.height;
  // fit the 1920×1080 frame by width when the comp is narrower than 16:9
  const visH = aspect < W / H ? W / aspect : H;
  const dist = visH / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  cam.position.set(0, 0, dist);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  return { cam, dist };
}

/** Deterministic PRNG. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Smooth cubic ease-out / in-out on 0..1 */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(t)));
export const easeInOutCubic = (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeInCubic = (t: number) => Math.pow(clamp01(t), 3);
/** 0..1 progress of frame through [a,b] */
export const seg = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

/**
 * Smooth keyframes: a cubic Hermite through [frame, ...values] keys with Catmull-Rom
 * tangents, so motion never stops at a key (C1 continuous). The first and last keys
 * ease (zero tangent). Writes into `out` and returns it.
 */
export function splineKeys(keys: number[][], G: number, out: number[]): number[] {
  const n = keys.length;
  const dim = keys[0].length - 1;
  if (G <= keys[0][0]) { for (let d = 0; d < dim; d++) out[d] = keys[0][d + 1]; return out; }
  if (G >= keys[n - 1][0]) { for (let d = 0; d < dim; d++) out[d] = keys[n - 1][d + 1]; return out; }
  let i = 0;
  while (i < n - 2 && G > keys[i + 1][0]) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const h = k1[0] - k0[0];
  const t = (G - k0[0]) / h;
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  for (let d = 1; d <= dim; d++) {
    const m0 = i === 0 ? 0 : (k1[d] - keys[i - 1][d]) / (k1[0] - keys[i - 1][0]);
    const m1 = i + 1 === n - 1 ? 0 : (keys[i + 2][d] - k0[d]) / (keys[i + 2][0] - k0[0]);
    out[d - 1] = h00 * k0[d] + h10 * h * m0 + h01 * k1[d] + h11 * h * m1;
  }
  return out;
}
