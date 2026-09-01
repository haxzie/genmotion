"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig, useWindowDuration } from "./context";
import { useMediaReadiness } from "./media-readiness";

/** What the builder is handed once, when the 3D scene is set up. */
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
  /** Length of the scene, or of the enclosing <Sequence>. */
  durationInFrames: number;
}

/** What the per-frame callback is handed. Read time from here, never a closure. */
export interface ThreeFrame {
  frame: number;
  /** `frame / fps` — three's APIs are in seconds. */
  time: number;
  fps: number;
  /** 0→1 across the scene (or the enclosing <Sequence>). */
  progress: number;
}

export type ThreeSceneUpdate = (frame: ThreeFrame) => void;

export interface ThreeSceneOptions {
  /** Transparent background, so the 3D layer composites over the DOM. Default true. */
  alpha?: boolean;
  /** MSAA. Default true. */
  antialias?: boolean;
}

/**
 * The drawing buffer is sized in device pixels because the export captures at
 * the display's DPR and ffmpeg scales back down — a canvas rendered at 1× would
 * arrive soft next to DOM content that was rasterised at 2×. Capped at 2: past
 * that the memory is real and the supersampling is already spent.
 */
function capturePixelRatio(): number {
  return Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 2);
}

/**
 * A LoadingManager whose idle state can be awaited.
 *
 * `onLoad` fires when every started item has settled (errors included), so one
 * promise per busy stretch is enough — the barrier only needs to know whether
 * anything is still in flight right now.
 */
function createLoadingTracker(): {
  manager: THREE.LoadingManager;
  waitForIdle(): Promise<void>;
} {
  const manager = new THREE.LoadingManager();
  let pending: Promise<void> | null = null;
  let settle: (() => void) | null = null;

  manager.onStart = () => {
    if (pending) return;
    pending = new Promise<void>((resolve) => {
      settle = resolve;
    });
  };
  manager.onLoad = () => {
    settle?.();
    pending = null;
    settle = null;
  };

  return { manager, waitForIdle: () => pending ?? Promise.resolve() };
}

/** Free everything the GPU is holding for a scene that is going away. */
function disposeScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  scene.traverse((object) => {
    const mesh = object as Partial<THREE.Mesh>;
    mesh.geometry?.dispose();
    const material = mesh.material;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      for (const value of Object.values(m)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      m.dispose();
    }
  });
  renderer.dispose();
  // Each scene in a composition mounts its own renderer, and a browser only
  // keeps a handful of WebGL contexts alive: hand this one back rather than
  // waiting for GC to notice, or a long project runs out mid-export.
  renderer.forceContextLoss();
}

/**
 * Drive a three.js scene deterministically from the frame clock.
 *
 * The builder runs once per mount (and again if the composition is resized),
 * sets up the scene, and returns a callback that positions everything for a
 * given frame. It must NOT start an animation loop: the hook renders exactly
 * one frame per commit, synchronously, which is what makes the export match the
 * preview. `THREE.Clock`, `setAnimationLoop`, and `requestAnimationFrame` all
 * read wall-clock time and will drift.
 *
 * const ref = useThreeScene(({ scene, camera }) => {
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
 * });
 * return <canvas ref={ref} style={{ position: "absolute", inset: 0 }} />;
 */
export function useThreeScene(
  build: (context: ThreeSceneContext) => ThreeSceneUpdate | void,
  options: ThreeSceneOptions = {},
): React.RefObject<HTMLCanvasElement | null> {
  const { alpha = true, antialias = true } = options;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationInFrames = useWindowDuration();

  const tracker = useMemo(createLoadingTracker, []);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.Camera;
    update: ThreeSceneUpdate | null;
    size: { width: number; height: number };
  } | null>(null);

  // The export's frame barrier awaits this before capturing, the same way
  // <Video> makes it wait for a seek. Stable identity: re-registering on every
  // frame would churn the controller's set for nothing.
  useMediaReadiness(useCallback(() => tracker.waitForIdle(), [tracker]));

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cssWidth = canvas.clientWidth || width;
    const cssHeight = canvas.clientHeight || height;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha, antialias });
    renderer.setPixelRatio(capturePixelRatio());
    // `false`: the canvas keeps whatever CSS box the scene gave it. Writing
    // inline width/height back would fight a layout expressed in percentages.
    renderer.setSize(cssWidth, cssHeight, false);
    renderer.setClearColor(0x000000, alpha ? 0 : 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, cssWidth / cssHeight, 0.1, 2000);
    camera.position.z = 5;

    const state = {
      renderer,
      scene,
      camera: camera as THREE.Camera,
      update: null as ThreeSceneUpdate | null,
      size: { width: cssWidth, height: cssHeight },
    };
    stateRef.current = state;

    const update = build({
      canvas,
      renderer,
      scene,
      camera,
      setCamera: (next) => {
        state.camera = next;
      },
      manager: tracker.manager,
      width: cssWidth,
      height: cssHeight,
      fps,
      durationInFrames,
    });
    state.update = typeof update === "function" ? update : null;

    return () => {
      stateRef.current = null;
      disposeScene(renderer, scene);
    };
    // `build` is excluded on purpose — it is a new closure on every render, so
    // including it would tear down and rebuild the whole scene every frame.
    // Dimensions are deps for the same reason the GSAP hook has them: builders
    // frame their camera and lay out geometry against the composition size, and
    // a scene built at one size then drawn at another is silently wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, alpha, antialias]);

  useLayoutEffect(() => {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;

    // The canvas box can change without the composition resizing — a layout
    // that reflows, or a canvas sized from the frame. Cheaper to check than to
    // ship a frame rendered at the wrong aspect.
    const cssWidth = canvas.clientWidth || width;
    const cssHeight = canvas.clientHeight || height;
    if (cssWidth !== state.size.width || cssHeight !== state.size.height) {
      state.size = { width: cssWidth, height: cssHeight };
      state.renderer.setSize(cssWidth, cssHeight, false);
      if (state.camera instanceof THREE.PerspectiveCamera) {
        state.camera.aspect = cssWidth / cssHeight;
        state.camera.updateProjectionMatrix();
      }
    }

    state.update?.({
      frame,
      time: frame / fps,
      fps,
      progress: durationInFrames > 1 ? frame / (durationInFrames - 1) : 0,
    });
    // Synchronous, inside the commit the render host flushed. The capture
    // barrier's double rAF then runs after this draw, so the composited frame
    // the exporter grabs is this one and not the previous.
    state.renderer.render(state.scene, state.camera);
  }, [frame, fps, width, height, durationInFrames]);

  return canvasRef;
}

export interface ThreeSceneProps extends ThreeSceneOptions {
  /**
   * Sets the 3D scene up and returns the per-frame callback. Runs once — read
   * per-frame values from the callback's argument, never from this closure.
   */
  build: (context: ThreeSceneContext) => ThreeSceneUpdate | void;
  id?: string;
  /** Merged over the default absolute fill. */
  style?: CSSProperties;
}

/**
 * A `useThreeScene` canvas that fills its parent.
 *
 * Worth preferring over the bare hook: a canvas with no CSS size falls back to
 * the element default of 300×150 and renders a small, soft 3D layer that still
 * looks plausible in the preview — the failure mode is easy to miss and this
 * closes it.
 */
export function ThreeScene({ build, id, style, alpha, antialias }: ThreeSceneProps) {
  const ref = useThreeScene(build, { alpha, antialias });
  return (
    <canvas
      id={id}
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }}
    />
  );
}

export { THREE };
