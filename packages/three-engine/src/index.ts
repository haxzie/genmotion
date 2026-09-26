import * as THREE from "three";

export type {
  ThreeSceneContext,
  ThreeFrame,
  ThreeSceneUpdate,
  ThreeSceneBuilder,
} from "./context";
export { disposeSceneGraph, disposeRenderer } from "./dispose";
export type { ReadinessCheck, MediaReadinessController } from "./readiness";
export { createMediaReadinessController, createLoadingTracker } from "./readiness";
export type { EasingFunction } from "./interpolate";
export { Easing, interpolate } from "./interpolate";
export { capturePixelRatio } from "./pixel-ratio";
export type { ThreeCompiledScene, ThreeRenderHostOptions, ThreeRenderHandle } from "./render-host";
export type { ThreeObjectBox, ThreePickHints } from "./pick";
export { describeSceneObjects } from "./pick";
export { mountThreeRenderHost } from "./render-host";

// Scenes and the host import Three.js through this re-export rather than
// their own `three` dependency, so there is never a second, mismatched copy.
export { THREE };
