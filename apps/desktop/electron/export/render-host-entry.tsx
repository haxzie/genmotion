/**
 * Browser entry for the offscreen render window. Bundled into a single IIFE at
 * build time and injected into a blank page by the export service — the same
 * arrangement `apps/renderer` uses for cloud renders, so preview, hosted
 * export, and desktop export all drive the identical composition code.
 *
 * The main process calls:
 *   window.__gmInit({ scenes, fps, width, height })  → mounts, returns {} or {error}
 *   window.__gm.setFrame(n)                          → the frame barrier
 */
import { mountRenderHost } from "@genmotion/player";
import { evaluateScene } from "@genmotion/compiler/evaluate";

declare global {
  interface Window {
    __gmInit: (payload: {
      scenes: { id: string; name: string; durationInFrames: number; compiledCode: string }[];
      fps: number;
      width: number;
      height: number;
    }) => { error?: string };
    __gm?: { setFrame: (frame: number) => Promise<void> | void };
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
