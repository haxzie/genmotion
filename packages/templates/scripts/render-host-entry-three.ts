/**
 * Browser entry for the poster/video capture — the Three.js engine's
 * counterpart of `render-host-entry.tsx`, and the same file the desktop
 * export window bundles (`apps/desktop/electron/export/render-host-entry-three.ts`).
 * Its own copy for the same reason the react one is: a package must not
 * depend on an app.
 *
 *   window.__gmInit({ scenes, fps, width, height })  → {} or { error }
 *   window.__gm.setFrame(n)                          → the frame barrier
 *   window.__gm.getTotalFrames()                     → how many frames to capture
 */
import { mountThreeRenderHost } from "@genmotion/three-engine";
import { evaluateThreeScene } from "@genmotion/compiler/evaluate-three";

declare global {
  interface Window {
    __gmInit: (payload: {
      scenes: { id: string; name: string; durationInFrames: number; compiledCode: string }[];
      fps: number;
      width: number;
      height: number;
    }) => { error?: string };
    __gm?: {
      setFrame: (frame: number) => Promise<void> | void;
      getTotalFrames: () => number;
      getLastError: () => string | null;
      dispose?: () => void;
    };
  }
}

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

  const container = document.getElementById("root");
  if (!container) return { error: "no #root" };
  container.style.width = `${payload.width}px`;
  container.style.height = `${payload.height}px`;
  container.style.position = "relative";
  container.style.overflow = "hidden";

  const handle = mountThreeRenderHost({
    container,
    scenes: compiled,
    fps: payload.fps,
    width: payload.width,
    height: payload.height,
  });
  window.__gm = {
    setFrame: handle.setFrame,
    getTotalFrames: handle.getTotalFrames,
    getLastError: handle.getLastError,
    dispose: handle.dispose,
  };
  return {};
};
