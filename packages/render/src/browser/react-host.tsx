/**
 * Browser entry for the React engine: evaluates each compiled TSX scene and
 * mounts the player's render host. Bundled into an IIFE (see `host.ts`).
 */
import { mountRenderHost } from "@genmotion/player";
import { evaluateScene } from "@genmotion/compiler/evaluate";
import { prepareRoot } from "./bridge";

window.__gmInit = (payload) => {
  const compiled = [];
  for (const scene of payload.scenes) {
    const result = evaluateScene(scene.compiledCode);
    if (!result.ok) return { error: `Scene "${scene.name}": ${result.error.message}` };
    compiled.push({
      id: scene.id,
      name: scene.name,
      durationInFrames: scene.durationInFrames,
      component: result.component,
    });
  }

  const container = prepareRoot(payload);
  if (!(container instanceof HTMLElement)) return container;

  window.__gm = mountRenderHost({
    container,
    scenes: compiled,
    fps: payload.fps,
    width: payload.width,
    height: payload.height,
  });
  return {};
};
