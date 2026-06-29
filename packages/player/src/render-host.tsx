"use client";

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  MediaReadinessContext,
  createMediaReadinessController,
} from "@genmotion/motion";
import { totalDurationInFrames } from "@genmotion/shared";
import type { CompiledScene } from "./types";
import { Composition } from "./composition";

export interface RenderHostOptions {
  container: HTMLElement;
  scenes: CompiledScene[];
  fps: number;
  width: number;
  height: number;
}

export interface RenderHandle {
  /** Resolves when the given frame is fully committed, media-ready, and painted. */
  setFrame(frame: number): Promise<void>;
  getTotalFrames(): number;
  /** Last runtime error thrown by a scene during render, if any. */
  getLastError(): string | null;
}

/**
 * Mounts the composition in "render" mode and returns the setFrame barrier
 * the headless renderer drives:
 *   sync React commit → fonts ready (first frame) → media seeked/decoded → double rAF.
 */
export function mountRenderHost({
  container,
  scenes,
  fps,
  width,
  height,
}: RenderHostOptions): RenderHandle {
  const readiness = createMediaReadinessController();
  const root = createRoot(container);
  const totalFrames = totalDurationInFrames(scenes);
  let fontsReady = false;
  let lastError: string | null = null;

  function renderTree(frame: number) {
    flushSync(() => {
      root.render(
        <MediaReadinessContext.Provider value={readiness}>
          <div style={{ position: "relative", width, height, overflow: "hidden" }}>
            <Composition
              scenes={scenes}
              frame={frame}
              fps={fps}
              width={width}
              height={height}
              mode="render"
              onSceneError={(e) => {
                lastError = `${e.sceneName}: ${e.message}`;
              }}
            />
          </div>
        </MediaReadinessContext.Provider>,
      );
    });
  }

  return {
    async setFrame(frame: number) {
      renderTree(frame);
      if (!fontsReady) {
        await document.fonts.ready;
        fontsReady = true;
        // Fonts arriving may change layout: commit the frame once more.
        renderTree(frame);
      }
      await readiness.waitForReady();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    },
    getTotalFrames: () => totalFrames,
    getLastError: () => lastError,
  };
}
