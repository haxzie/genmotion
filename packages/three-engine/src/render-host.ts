import * as THREE from "three";
import { globalToLocal, totalDurationInFrames, type SceneDuration } from "@genmotion/shared";
import type { ThreeSceneBuilder, ThreeSceneUpdate } from "./context";
import { disposeRenderer, disposeSceneGraph } from "./dispose";
import { createLoadingTracker } from "./readiness";
import { capturePixelRatio } from "./pixel-ratio";
import { describeSceneObjects, type ThreeObjectBox } from "./pick";

/** A scene whose code has already been compiled and evaluated to a builder. */
export interface ThreeCompiledScene extends SceneDuration {
  name: string;
  build: ThreeSceneBuilder;
  /**
   * Scene-level voiceover, played from the scene's first frame. The render
   * host itself ignores these — ignored here, not in the render loop — they
   * exist so the editor's preview layer can play the same audio a `SceneData`
   * carries without a second, parallel scene type.
   */
  audioUrl?: string | null;
  audioVolume?: number;
  startFrom?: number;
}

export interface ThreeRenderHostOptions {
  container: HTMLElement;
  /** In composition (concatenation) order — `frame` indexes into this. */
  scenes: ThreeCompiledScene[];
  fps: number;
  width: number;
  height: number;
  /**
   * `capture` (the default) is the export/`capture_frames` contract: every
   * `setFrame` resolves only once the frame is drawn, media-ready and
   * painted, and exactly one scene is alive at a time.
   *
   * `preview` is the editor's live canvas, where the next frame is due in
   * 16ms: see `setFrame`'s `live` option and `setDisplayScale` below.
   */
  mode?: "capture" | "preview";
}

export interface SetFrameOptions {
  /**
   * This frame is one of many, arriving at playback rate, and the picture is
   * only ever looked at on screen.
   *
   * A live frame is drawn once and returns immediately: no readiness wait, no
   * second draw, no paint barrier. Those three exist so a *capture* grabs the
   * finished pixels, and paying for them per frame caps playback at half the
   * display's refresh rate for a picture nothing ever reads back.
   *
   * Preview mode only; ignored by a capture host, whose every frame is read.
   */
  live?: boolean;
}

export interface ThreeRenderHandle {
  /** Resolves once the frame is drawn, media-ready, and painted. */
  setFrame(frame: number, options?: SetFrameOptions): Promise<void>;
  getTotalFrames(): number;
  /** Last runtime error thrown by a scene's builder or update callback, if any. */
  getLastError(): string | null;
  /**
   * The active scene's objects as composition-pixel boxes, for the editor's
   * preview tools. Valid for the frame last drawn by `setFrame`; call it again
   * after each one. Empty for a scene that draws everything onto a single
   * full-frame surface, since there is nothing in it to point at.
   */
  describeActiveScene(): ThreeObjectBox[];
  /**
   * How large the canvas actually is on screen, as a fraction of the
   * composition's own size (a 1920-wide composition shown in a 960-wide box is
   * `0.5`). The drawing buffer is sized from it, so the preview stops
   * supersampling the ~4x it cannot show. Preview mode only — a capture's
   * buffer is its output and is never resized.
   */
  setDisplayScale(scale: number): void;
  /**
   * Free the renderer's GPU context. No react-host equivalent — there, the
   * whole `BrowserWindow` is simply destroyed. Called explicitly here since a
   * browser only keeps a handful of WebGL contexts alive, and this host may
   * share a long-lived Electron process with many other captures.
   */
  dispose(): void;
}

/** One scene, built and ready to be drawn. */
interface BuiltScene {
  scene: THREE.Scene;
  camera: THREE.Camera;
  update: ThreeSceneUpdate | null;
}

/**
 * How far ahead of a cut the next scene is built and its shaders compiled.
 *
 * A scene's first draw is where the GLSL for every material in it is compiled
 * and linked, which is the most expensive thing a Three.js frame can do and
 * lands, unavoidably, on the frame the cut happens — the freeze at every
 * scene boundary. One second of warning is enough for an idle callback to run
 * and for `compileAsync` to finish off the main thread.
 */
const PREBUILD_LEAD_SECONDS = 1;

/**
 * Drawing-buffer scale is quantised to this, so that dragging a splitter or
 * resizing the window resizes the buffer a handful of times rather than on
 * every animation frame — each resize reallocates it.
 */
const SCALE_STEP = 0.25;

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
  const { container, scenes, fps, width, height, mode = "capture" } = options;
  const preview = mode === "preview";

  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  let pixelRatio = capturePixelRatio();
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);

  const tracker = createLoadingTracker();
  const totalFrames = totalDurationInFrames(scenes);

  let activeIndex = -1;
  let activeScene: THREE.Scene | null = null;
  let activeCamera: THREE.Camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
  let activeUpdate: ThreeSceneUpdate | null = null;
  let lastError: string | null = null;
  let disposed = false;

  /**
   * Scenes that have been built, by index.
   *
   * A capture holds exactly one — its frames are read back, so the GPU memory
   * of a scene nobody is drawing is pure cost. A preview holds the one on
   * screen plus its neighbours: playback crosses back and forth over a cut
   * while the user watches the same beat again, and rebuilding (and
   * recompiling the shaders of) a scene that was alive two seconds ago is the
   * whole hitch this avoids.
   */
  const built = new Map<number, BuiltScene>();
  /** How many scenes either side of the one on screen are kept built. */
  const neighbours = preview ? 1 : 0;
  /** A scheduled prebuild, so only one is ever in flight and it can be cancelled. */
  let prebuildHandle: number | null = null;

  function build(sceneIndex: number): BuiltScene {
    const entry = scenes[sceneIndex]!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.z = 5;
    const record: BuiltScene = { scene, camera, update: null };

    try {
      const update = entry.build({
        canvas,
        renderer,
        scene,
        camera,
        setCamera: (next) => {
          record.camera = next;
          // The scene may swap its camera after it is already on screen.
          if (activeIndex === sceneIndex) activeCamera = next;
        },
        manager: tracker.manager,
        width,
        height,
        fps,
        durationInFrames: entry.durationInFrames,
      });
      record.update = typeof update === "function" ? update : null;
    } catch (err) {
      lastError = `${entry.name}: ${err instanceof Error ? err.message : String(err)}`;
    }
    return record;
  }

  /** Drop every built scene except the ones within `keep` of `centre`. */
  function evict(centre: number): void {
    for (const [index, record] of built) {
      if (Math.abs(index - centre) <= neighbours) continue;
      built.delete(index);
      disposeSceneGraph(record.scene);
    }
  }

  function activate(sceneIndex: number): void {
    let record = built.get(sceneIndex);
    if (!record) {
      record = build(sceneIndex);
      built.set(sceneIndex, record);
    }
    activeIndex = sceneIndex;
    activeScene = record.scene;
    activeCamera = record.camera;
    activeUpdate = record.update;
    evict(sceneIndex);
  }

  /**
   * Build the scene after this one, and compile its shaders, before the cut
   * reaches it.
   *
   * Both halves are kept off the frame that is due: the build waits for an
   * idle moment, and `compileAsync` hands the GLSL to the driver's own
   * compile threads (`KHR_parallel_shader_compile` where the GPU has it)
   * instead of blocking on each program link the way the first draw does.
   */
  function prebuild(sceneIndex: number): void {
    if (!preview || disposed) return;
    if (sceneIndex >= scenes.length || built.has(sceneIndex) || prebuildHandle !== null) return;
    const run = () => {
      prebuildHandle = null;
      if (disposed || built.has(sceneIndex)) return;
      const record = build(sceneIndex);
      built.set(sceneIndex, record);
      void renderer.compileAsync(record.scene, record.camera).catch(() => {
        // A scene whose shaders won't compile ahead of time still gets its
        // chance on the frame it is drawn, where the error is reported.
      });
    };
    const idle = (globalThis as { requestIdleCallback?: typeof requestIdleCallback })
      .requestIdleCallback;
    prebuildHandle = idle ? idle(run, { timeout: 500 }) : (setTimeout(run, 0) as unknown as number);
  }

  return {
    async setFrame(frame, setFrameOptions) {
      const local = globalToLocal(scenes, frame);
      if (!local) return;
      const live = preview && setFrameOptions?.live === true;

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

      // Coming up on a cut: get the next scene built and compiled now, so the
      // frame the cut lands on only has to draw it.
      if (live && entry.durationInFrames - local.localFrame <= fps * PREBUILD_LEAD_SECONDS) {
        prebuild(local.sceneIndex + 1);
      }

      // A live frame is on screen in a few milliseconds and never read back:
      // everything below is the capture barrier, and skipping it is what lets
      // playback keep up with the display instead of running at half of it.
      if (live) return;

      await tracker.waitForIdle();
      // An asset that settled during that wait repaints its layer's canvas
      // after the draw above, so the framebuffer still holds the frame without
      // it. Draw once more before the barrier: a single-frame capture (a
      // poster) would otherwise show every image-backed layer empty.
      if (activeScene) renderer.render(activeScene, activeCamera);
      // The paint barrier is the capture's, not the picture's: a caller that
      // grabs pixels needs the compositor to have taken this draw, and waiting
      // two animation frames is how that is known. On screen nobody reads the
      // pixels back, and making a scrub wait two frames for a draw the GPU
      // already has is exactly the lag that makes dragging the playhead feel
      // like it is trailing the pointer.
      if (preview) return;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    },
    setDisplayScale(scale) {
      if (!preview || disposed || !(scale > 0)) return;
      // Round up to the next step so the buffer is never smaller than the box
      // it is stretched over, and never below half — a composition scaled to a
      // thumbnail should still look like the video, not like a mosaic of it.
      const wanted = Math.min(
        capturePixelRatio(),
        Math.max(0.5, Math.ceil((scale * capturePixelRatio()) / SCALE_STEP) * SCALE_STEP),
      );
      if (wanted === pixelRatio) return;
      pixelRatio = wanted;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      // The buffer was just reallocated and is empty; put the current frame
      // back into it rather than letting the canvas flash black until the
      // next one arrives.
      if (activeScene) renderer.render(activeScene, activeCamera);
    },
    describeActiveScene() {
      if (!activeScene) return [];
      return describeSceneObjects(activeScene, activeCamera, width, height);
    },
    getTotalFrames: () => totalFrames,
    getLastError: () => lastError,
    dispose() {
      disposed = true;
      if (prebuildHandle !== null) {
        const cancel = (globalThis as { cancelIdleCallback?: typeof cancelIdleCallback })
          .cancelIdleCallback;
        if (cancel) cancel(prebuildHandle);
        else clearTimeout(prebuildHandle);
      }
      for (const record of built.values()) disposeSceneGraph(record.scene);
      built.clear();
      activeScene = null;
      disposeRenderer(renderer);
      container.removeChild(canvas);
    },
  };
}
