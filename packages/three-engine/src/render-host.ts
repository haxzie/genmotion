import * as THREE from "three";
import { globalToLocal, totalDurationInFrames, type SceneDuration } from "@genmotion/shared";
import type { ThreeSceneBuilder, ThreeSceneUpdate } from "./context";
import { disposeRenderer, disposeSceneGraph } from "./dispose";
import { createLoadingTracker } from "./readiness";
import { capturePixelRatio } from "./pixel-ratio";

/** A scene whose code has already been compiled and evaluated to a builder. */
export interface ThreeCompiledScene extends SceneDuration {
  name: string;
  build: ThreeSceneBuilder;
}

export interface ThreeRenderHostOptions {
  container: HTMLElement;
  /** In composition (concatenation) order — `frame` indexes into this. */
  scenes: ThreeCompiledScene[];
  fps: number;
  width: number;
  height: number;
}

export interface ThreeRenderHandle {
  /** Resolves once the frame is drawn, media-ready, and painted. */
  setFrame(frame: number): Promise<void>;
  getTotalFrames(): number;
  /** Last runtime error thrown by a scene's builder or update callback, if any. */
  getLastError(): string | null;
  /**
   * Free the renderer's GPU context. No react-host equivalent — there, the
   * whole `BrowserWindow` is simply destroyed. Called explicitly here since a
   * browser only keeps a handful of WebGL contexts alive, and this host may
   * share a long-lived Electron process with many other captures.
   */
  dispose(): void;
}

/**
 * Mounts one `WebGLRenderer`/canvas for the whole composition's lifetime, and
 * switches which scene's `THREE.Scene`/camera is active as `setFrame` crosses
 * a scene boundary — the same one-renderer-many-scenes shape a real export
 * queue needs, since each scene mount/teardown is itself a GPU-context event.
 *
 * Every frame is driven by the `frame` argument, never a clock the host
 * doesn't own: `setFrame` calls a scene's update callback once, renders once,
 * synchronously, and returns a promise the caller awaits before capturing.
 */
export function mountThreeRenderHost(options: ThreeRenderHostOptions): ThreeRenderHandle {
  const { container, scenes, fps, width, height } = options;

  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(capturePixelRatio());
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);

  const tracker = createLoadingTracker();
  const totalFrames = totalDurationInFrames(scenes);

  let activeIndex = -1;
  let activeScene: THREE.Scene | null = null;
  let activeCamera: THREE.Camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
  let activeUpdate: ThreeSceneUpdate | null = null;
  let lastError: string | null = null;

  function activate(sceneIndex: number): void {
    if (activeScene) disposeSceneGraph(activeScene);

    const entry = scenes[sceneIndex]!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.z = 5;

    activeIndex = sceneIndex;
    activeScene = scene;
    activeCamera = camera;
    activeUpdate = null;

    try {
      const update = entry.build({
        canvas,
        renderer,
        scene,
        camera,
        setCamera: (next) => {
          activeCamera = next;
        },
        manager: tracker.manager,
        width,
        height,
        fps,
        durationInFrames: entry.durationInFrames,
      });
      activeUpdate = typeof update === "function" ? update : null;
    } catch (err) {
      lastError = `${entry.name}: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return {
    async setFrame(frame) {
      const local = globalToLocal(scenes, frame);
      if (!local) return;

      if (local.sceneIndex !== activeIndex) activate(local.sceneIndex);
      const entry = scenes[local.sceneIndex]!;

      try {
        activeUpdate?.({
          frame: local.localFrame,
          time: local.localFrame / fps,
          fps,
          progress: entry.durationInFrames > 1 ? local.localFrame / (entry.durationInFrames - 1) : 0,
        });
      } catch (err) {
        lastError = `${entry.name}: ${err instanceof Error ? err.message : String(err)}`;
      }

      // Synchronous, in the same tick that computed the frame — the capture
      // barrier's double rAF then runs after this draw, so the composited
      // frame a caller grabs is this one and not the previous.
      if (activeScene) renderer.render(activeScene, activeCamera);

      await tracker.waitForIdle();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    },
    getTotalFrames: () => totalFrames,
    getLastError: () => lastError,
    dispose() {
      if (activeScene) disposeSceneGraph(activeScene);
      disposeRenderer(renderer);
      container.removeChild(canvas);
    },
  };
}
