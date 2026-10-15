/**
 * The coin-train rig shared by the black shot (scene 4) and its continuation
 * on the gradient (scene 5): a perspective camera with the measured focal
 * length, and the wheel the coins ride.
 */
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

/** Focal length in composition px (vertical FOV ≈ 16.2°). */
export const FOCAL = 2529.4;
export const WHEEL = { cx: -0.1223, cy: -4.3899, r: 5.3048, step: 15.4707, pitch: 3.39 };

export function trainCamera(ctx: ThreeSceneContext): THREE.PerspectiveCamera {
  const { renderer } = ctx;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cam = new THREE.PerspectiveCamera(2 * THREE.MathUtils.radToDeg(Math.atan(360 / FOCAL)), 1280 / 720, 0.1, 500);
  cam.position.set(0, 0, 0);
  cam.lookAt(0, 0, -1);
  cam.updateProjectionMatrix();
  ctx.setCamera(cam);
  return cam;
}

/** Put coin `i` of the train on the wheel at phase S (deg), depth z, facing yaw (deg). */
export function trainPose(o: THREE.Object3D, S: number, i: number, z: number, yaw: number, pitch = WHEEL.pitch) {
  const a = THREE.MathUtils.degToRad(S - WHEEL.step * i);
  o.position.set(WHEEL.cx + WHEEL.r * Math.sin(a), WHEEL.cy + WHEEL.r * Math.cos(a), -z);
  o.rotation.order = "YXZ";
  o.rotation.set(THREE.MathUtils.degToRad(-pitch), THREE.MathUtils.degToRad(yaw), 0);
}
