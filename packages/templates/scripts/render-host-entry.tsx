/**
 * Browser entry for the poster capture.
 *
 * Same arrangement as the desktop export window and `apps/renderer`: bundle the
 * player and the scene evaluator into one IIFE, inject it into a blank page,
 * then drive it a frame at a time. Its own copy rather than an import from
 * `apps/desktop`, because a package must not depend on an app.
 *
 *   window.__gmInit({ scenes, fps, width, height })  → {} or { error }
 *   window.__gm.setFrame(n)                          → the frame barrier
 */
import { mountRenderHost, type RenderHandle } from "@genmotion/player";
import { evaluateScene } from "@genmotion/compiler/evaluate";

declare global {
  interface Window {
    __gmInit: (payload: {
      scenes: { id: string; name: string; durationInFrames: number; compiledCode: string }[];
      fps: number;
      width: number;
      height: number;
    }) => { error?: string };
    // The full handle — `setFrame`, `getTotalFrames`, `getLastError` — since
    // `poster.mjs` only ever drives `setFrame`, but `render-video.mjs` needs
    // `getTotalFrames` to know how many frames to capture.
    __gm?: RenderHandle;
  }
}

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

  const container = document.getElementById("root");
  if (!container) return { error: "no #root" };
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
