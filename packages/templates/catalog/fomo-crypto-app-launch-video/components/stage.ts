/**
 * The stage every scene shares: a perspective camera calibrated so that the
 * z = 0 plane maps 1:1 onto the 1280×720 composition, with helpers that take
 * coordinates straight from the reference video (x right, y DOWN, in px).
 *
 * Every position in this project was measured off the reference frames in
 * those pixel coordinates, so scenes pass the measured numbers in unchanged.
 */
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

export const W = 1280;
export const H = 720;
export const FOV = 30;
/** Camera distance at which one world unit at z = 0 is exactly one px. */
export const DIST = H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

/** Reference px → world. */
export const X = (px: number) => px - W / 2;
export const Y = (py: number) => H / 2 - py;

export function stage(ctx: ThreeSceneContext): THREE.PerspectiveCamera {
  const { renderer, camera } = ctx;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = FOV;
  cam.aspect = W / H;
  cam.near = 10;
  cam.far = 20000;
  cam.position.set(0, 0, DIST);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  return cam;
}

/** Place an object at reference px (x, y) on the z = 0 plane (or at depth z). */
export function place(o: THREE.Object3D, x: number, y: number, z = 0) {
  o.position.set(X(x), Y(y), z);
}

/** Uniform world scale that makes something `px` big at depth z appear `px` big on screen. */
export const depthScale = (z: number) => (DIST - z) / DIST;

/**
 * Orthographic stage in the same px coordinates. The reference's coins tumble
 * with almost no perspective (an edge-on coin is a line wherever it is in the
 * frame), so scenes built around a flipping coin use this instead.
 */
export function orthoStage(ctx: ThreeSceneContext): THREE.OrthographicCamera {
  const { renderer } = ctx;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 1, 8000);
  cam.position.set(0, 0, 4000);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  ctx.setCamera(cam);
  return cam;
}
