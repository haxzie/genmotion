import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

/**
 * A 2.5D stage measured in the reference film's pixels: 1280 x 720, origin
 * top-left, y down. An orthographic camera makes 1 world unit = 1 reference
 * pixel (1.5 output px at 1080p), so layouts read straight off the reference.
 * The 3D character still turns and occludes for real (ortho keeps depth).
 */
export const REF_W = 1280;
export const REF_H = 720;

export const X = (x: number) => x - REF_W / 2;
export const Y = (y: number) => REF_H / 2 - y;

export function setupStage(ctx: ThreeSceneContext, bg: string) {
  const { width, height, scene } = ctx;
  const aspect = width / height;
  let hw = REF_W / 2;
  let hh = REF_H / 2;
  if (aspect > REF_W / REF_H) hw = hh * aspect;
  else hh = hw / aspect;
  const cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, -5000, 5000);
  cam.position.set(0, 0, 0);
  ctx.setCamera(cam);
  scene.background = new THREE.Color(bg);
  return { cam, hw, hh };
}

/** Put an object at reference pixel (x, y), on layer z (higher = in front). */
export function place(obj: THREE.Object3D, x: number, y: number, z?: number): void {
  obj.position.x = X(x);
  obj.position.y = Y(y);
  if (z !== undefined) obj.position.z = z;
}
