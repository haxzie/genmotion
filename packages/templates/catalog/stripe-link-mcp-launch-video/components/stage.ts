import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";

/**
 * The stage: an orthographic camera where 1 world unit = 100 composition px.
 * Layout is authored in a 1080x1080 design space (top-left origin, y down),
 * centred in whatever frame the project uses.
 */
export const DESIGN = 1080;
export const U = 100;

export function setupStage(ctx: ThreeSceneContext, background: string) {
  const w = ctx.width / U;
  const h = ctx.height / U;
  const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 100);
  cam.position.set(0, 0, 20);
  cam.lookAt(0, 0, 0);
  ctx.setCamera(cam);
  ctx.scene.background = new THREE.Color(background);
  return cam;
}

/** Design px (top-left origin) → world. */
export const wx = (x: number) => (x - DESIGN / 2) / U;
export const wy = (y: number) => (DESIGN / 2 - y) / U;

/** Place an object's centre at design px (x, y). */
export function place(o: THREE.Object3D, x: number, y: number, z = 0) {
  o.position.set(wx(x), wy(y), z);
  return o;
}

export type Draw = (g: OffscreenCanvasRenderingContext2D, w: number, h: number) => void;

/** A plane textured with a 2x canvas drawn once. Size in design px. */
export function canvasPlane(name: string, wPx: number, hPx: number, draw: Draw, anchor: "center" | "left" = "center") {
  const S = 2;
  const canvas = new OffscreenCanvas(Math.ceil(wPx * S), Math.ceil(hPx * S));
  const g = canvas.getContext("2d")!;
  g.scale(S, S);
  draw(g, wPx, hPx);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(wPx / U, hPx / U);
  if (anchor === "left") geo.translate(wPx / U / 2, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.userData.wPx = wPx;
  return mesh;
}

export function rr(g: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** Set opacity on every material in a subtree. */
export function setOpacity(o: THREE.Object3D, a: number) {
  o.traverse((c) => {
    const m = (c as THREE.Mesh).material as THREE.Material | undefined;
    if (m) {
      m.opacity = a;
      m.transparent = true;
    }
    c.visible = a > 0.001;
  });
}

/** Eased 0→1 over [start, start+dur]. */
export const enter = (frame: number, start: number, dur = 12) =>
  interpolate(frame, [start, start + dur], [0, 1], Easing.easeOut);
export const leave = (frame: number, start: number, dur = 8) =>
  interpolate(frame, [start, start + dur], [0, 1], Easing.easeIn);
/** Entrance with a small overshoot. */
export const pop = (frame: number, start: number, dur = 12) =>
  interpolate(frame, [start, start + dur, start + dur + 6], [0, 1.05, 1], Easing.easeOut);

/** Show a left-anchored canvas plane only up to `frac` of its width. */
export function revealLeft(mesh: THREE.Mesh, frac: number) {
  const f = Math.max(0.0001, Math.min(1, frac));
  mesh.scale.x = f;
  const map = (mesh.material as THREE.MeshBasicMaterial).map!;
  map.repeat.x = f;
}
