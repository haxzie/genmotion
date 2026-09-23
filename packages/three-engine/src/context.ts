import * as THREE from "three";

/** What a scene's builder is handed once, when it is set up. */
export interface ThreeSceneContext {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  /** Perspective camera, already framed to the canvas. Replace with `setCamera`. */
  camera: THREE.Camera;
  /** Render with a different camera (orthographic, say) from here on. */
  setCamera(camera: THREE.Camera): void;
  /**
   * Pass this to every loader — `new THREE.TextureLoader(ctx.manager)`. The
   * export's frame barrier waits on it, so a texture still in flight can't be
   * captured as a blank surface.
   */
  manager: THREE.LoadingManager;
  /** Canvas size in CSS pixels (not the drawing buffer, which is DPR-scaled). */
  width: number;
  height: number;
  fps: number;
  /** Length of the scene. */
  durationInFrames: number;
}

/** What the per-frame callback is handed. Read time from here, never a closure. */
export interface ThreeFrame {
  frame: number;
  /** `frame / fps` — three's APIs are in seconds. */
  time: number;
  fps: number;
  /** 0→1 across the scene. */
  progress: number;
}

export type ThreeSceneUpdate = (frame: ThreeFrame) => void;

/**
 * What a scene file default-exports.
 *
 * Runs once, when the scene becomes active. Sets up the scene graph and
 * returns a callback that positions everything for a given frame. It must NOT
 * start an animation loop: the host renders exactly one frame per `setFrame`
 * call, synchronously, which is what makes the export match the preview.
 * `THREE.Clock`, `setAnimationLoop`, and `requestAnimationFrame` all read
 * wall-clock time and will drift out of sync with the frames the host asks for.
 *
 * export default function buildScene({ scene, camera }: ThreeSceneContext): ThreeSceneUpdate {
 *   const cube = new THREE.Mesh(
 *     new THREE.BoxGeometry(1, 1, 1),
 *     new THREE.MeshStandardMaterial({ color: "#6ee7ff" }),
 *   );
 *   scene.add(cube, new THREE.DirectionalLight(0xffffff, 3));
 *   camera.position.z = 4;
 *   return ({ time, progress }) => {
 *     cube.rotation.y = time * 1.2;
 *     cube.position.y = progress * 0.5;
 *   };
 * }
 */
export type ThreeSceneBuilder = (context: ThreeSceneContext) => ThreeSceneUpdate | void;
