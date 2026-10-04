import * as THREE from "three";

/** World units per composition px on the z = 0 plane: 1 unit = 100 px. */
export const PX = 0.01;
/** Canvas px per composition px for every canvas texture. */
export const RES = 2;

export function unitDistance(height: number, fovDeg = 50): number {
  return (height * PX) / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
}

/** Camera on +z looking at the origin, so px sizes are true on-screen px at z = 0. */
export function fitCamera(camera: THREE.Camera, height: number, fovDeg = 50): number {
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = fovDeg;
  cam.near = 0.1;
  cam.far = 400;
  cam.updateProjectionMatrix();
  const d = unitDistance(height, fovDeg);
  cam.position.set(0, 0, d);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  return d;
}

/**
 * Reference frames are composed in 1920x1080 pixel space with the origin top-left.
 * These convert a reference pixel coordinate to stage world units (centre origin, y up).
 */
export const rx = (x: number) => (x - 960) * PX;
export const ry = (y: number) => (540 - y) * PX;
