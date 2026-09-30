/**
 * Browser entry for the Three.js engine: evaluates each compiled scene against
 * `three` + `@genmotion/three-engine` and mounts one `WebGLRenderer` for the
 * whole composition. Bundled into an IIFE (see `host.ts`).
 */
import { mountThreeRenderHost } from "@genmotion/three-engine";
import { evaluateThreeScene } from "@genmotion/compiler/evaluate-three";
import { prepareRoot } from "./bridge";

window.__gmInit = (payload) => {
  const compiled = [];
  for (const scene of payload.scenes) {
    const result = evaluateThreeScene(scene.compiledCode);
    if (!result.ok) return { error: `Scene "${scene.name}": ${result.error.message}` };
    compiled.push({
      id: scene.id,
      name: scene.name,
      durationInFrames: scene.durationInFrames,
      build: result.build,
    });
  }

  const container = prepareRoot(payload);
  if (!(container instanceof HTMLElement)) return container;

  const handle = mountThreeRenderHost({
    container,
    scenes: compiled,
    fps: payload.fps,
    width: payload.width,
    height: payload.height,
    mode: payload.mode ?? "capture",
  });
  window.__gm = {
    setFrame: handle.setFrame,
    getTotalFrames: handle.getTotalFrames,
    getLastError: handle.getLastError,
    dispose: handle.dispose,
  };
  return {};
};
