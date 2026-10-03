import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

/**
 * Pixel-space stage. The whole film is flat motion graphics, so every scene
 * renders through an orthographic camera where 1 world unit = 1 composition px
 * and the origin is the frame centre, y up.
 *
 * Reference measurements are taken in screen pixels (x right from the left
 * edge, y down from the top) on a 1920x1080 frame; `sx`/`sy` convert them.
 */
export const W = 1920;
export const H = 1080;
/** Canvas pixels per composition px for every canvas texture. */
export const RES = 2;
/** World units per composition px (pixel stage). */
export const PX = 1;

/** Screen x (px from left of a 1920 frame) -> world x. */
export const sx = (x: number) => x - W / 2;
/** Screen y (px from top of a 1080 frame) -> world y. */
export const sy = (y: number) => H / 2 - y;

export function pixelStage(ctx: ThreeSceneContext, bg: THREE.ColorRepresentation) {
  const { width, height } = ctx;
  // Keep the 1920x1080 design fitting any aspect: scale the design to cover the height.
  const zoom = height / H;
  const cam = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -2000, 2000);
  cam.zoom = zoom;
  cam.position.set(0, 0, 100);
  cam.updateProjectionMatrix();
  ctx.setCamera(cam);
  ctx.renderer.toneMapping = THREE.NoToneMapping;
  ctx.renderer.outputColorSpace = THREE.SRGBColorSpace;
  ctx.scene.background = new THREE.Color(bg);
  return cam;
}

/** A flat colour plane, unlit, transparent so it sorts with type. */
export function plane(w: number, h: number, color: THREE.ColorRepresentation, name: string) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }),
  );
  m.name = name;
  return m;
}
