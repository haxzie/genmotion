/**
 * Browser entry for the offscreen render window — the Three.js engine's
 * counterpart of `render-host-entry.tsx`. Bundled into its own IIFE at build
 * time (`render-host-three.js`) and injected into the same blank page shell
 * the react engine uses, through the same bridge:
 *
 *   window.__gmInit({ scenes, fps, width, height })  → mounts, returns {} or {error}
 *   window.__gm.setFrame(n)                          → the frame barrier
 *   window.__gm.describe()                           → the drawn frame's objects
 *   window.__gm.dispose()                            → frees the GPU context
 *
 * `describe` is the same call the editor's preview makes to lay its selection
 * overlay over the canvas, offered here so a capture can tell the agent which
 * of the objects it just drew the user will actually be able to click.
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
      /**
       * Three.js host only. Typed loosely because the React entry declares the
       * same global and the two declarations must match; `capture.ts` is where
       * the boxes get their real type.
       */
      describe?: () => unknown;
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
    describe: handle.describeActiveScene,
    dispose: handle.dispose,
  };
  return {};
};
