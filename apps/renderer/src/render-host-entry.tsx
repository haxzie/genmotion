/**
 * Browser entry for the headless render page. Bundled into a single IIFE by
 * esbuild (see build-host.ts) and injected into a blank page by the worker.
 *
 * The worker calls:
 *   window.__gmInit({ scenes, fps, width, height })  → resolves when mounted
 *   window.__gm.setFrame(n)                          → frame barrier
 */
import { mountRenderHost } from "@genmotion/player";
import { evaluateScene } from "@genmotion/compiler/evaluate";

window.__gmInit = (payload) => {
  const compiled = [];
  for (const scene of payload.scenes) {
    const result = evaluateScene(scene.compiledCode);
    if (!result.ok) {
      return { error: `Scene "${scene.name}": ${result.error.message}` };
    }
    compiled.push({
      id: scene.id,
      name: scene.name,
      durationInFrames: scene.durationInFrames,
      component: result.component,
    });
  }

  const container = document.getElementById("root")!;
  container.style.width = `${payload.width}px`;
  container.style.height = `${payload.height}px`;
  container.style.position = "relative";
  container.style.overflow = "hidden";

  window.__gm = mountRenderHost({
    container,
    scenes: compiled,
    fps: payload.fps,
    width: payload.width,
    height: payload.height,
  });
  return {};
};
