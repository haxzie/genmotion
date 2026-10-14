/**
 * The lanyard scene, mounted and driven frame by frame.
 *
 * Thin on purpose. The scene itself is `scene-builder.ts`, written against the
 * `ThreeSceneBuilder` contract, and the stepping is `mountThreeRenderHost` from
 * @genmotion/three-engine: the same host the desktop editor previews through
 * and the same one the headless renderer captures through. So the free tool
 * runs a GenMotion scene on the GenMotion engine rather than a second,
 * near-identical renderer written for the marketing site.
 *
 * All this module adds is the part the engine has no opinion about: decoding
 * the visitor's two images into canvases before the scene is built, since a
 * builder is synchronous and a texture that arrives late is a blank card.
 *
 * Imported only via `await import(...)`, which keeps three.js out of the
 * marketing bundle.
 */

import { mountThreeRenderHost } from "@genmotion/three-engine";
import { drawFace, drawPlainBack, drawSampleArt } from "./art";
import { createLanyardSceneBuilder } from "./scene-builder";
import { CARD_SHAPES, type LanyardConfig } from "./types";

export interface LanyardRenderer {
  /** The canvas three draws into. Hand it to `drawImage` or mount it. */
  readonly canvas: HTMLCanvasElement;
  /** Paint `frame`. Resolves once the frame is drawn and, in capture mode,
   *  once the compositor has taken it. */
  drawFrame(frame: number): Promise<void>;
  /** Preview only: tell the host how small the canvas really is on screen. */
  setDisplayScale(scale: number): void;
  dispose(): void;
}

export interface LanyardRendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  config: LanyardConfig;
  /**
   * `preview` skips the capture barrier so playback can keep up with the
   * display; `capture` waits for every frame to be drawn and painted, which is
   * what the export reads back.
   */
  mode: "preview" | "capture";
}

export async function createLanyardRenderer({
  width,
  height,
  fps,
  durationInFrames,
  config,
  mode,
}: LanyardRendererOptions): Promise<LanyardRenderer> {
  const [front, back] = await Promise.all([
    faceCanvas(config, "front"),
    faceCanvas(config, "back"),
  ]);

  // The host positions its canvas absolutely inside whatever it is given, so
  // it needs a container even when nobody is going to mount one. An export's
  // lives off-document and is thrown away with the renderer.
  const container = document.createElement("div");
  container.style.cssText = "position:relative;width:100%;height:100%";

  const host = mountThreeRenderHost({
    container,
    scenes: [
      {
        id: "lanyard-drop",
        name: "Lanyard drop",
        durationInFrames,
        build: createLanyardSceneBuilder({
          shape: config.shape,
          style: config.style,
          strap: config.strap,
          ratio: CARD_SHAPES[config.shape].ratio,
          front,
          back,
        }),
      },
    ],
    fps,
    width,
    height,
    mode,
    // Capture composites each frame itself, straight into the encoder's 2D
    // canvas, so there is nothing downstream to spend a supersampled buffer
    // on. The host's default is the display's pixel ratio, which on a retina
    // machine shades four times the pixels and, with this scene's soft
    // shadows, turns a 16-second export into a multi-minute one.
    pixelRatio: mode === "capture" ? 1 : undefined,
    // The export blits this canvas into the encoder's 2D canvas itself, in the
    // same task, so it never needs the compositor to have taken the frame.
    readback: "drawing-buffer",
  });

  // The handle deliberately does not expose its canvas: a project scene has no
  // business reading pixels back out of one. The export does, so it is taken
  // off the container the host just appended it to.
  const canvas = container.querySelector("canvas");
  if (!canvas) throw new Error("The 3D renderer did not produce a canvas");

  await host.setFrame(0);

  return {
    canvas,
    drawFrame: (frame) => host.setFrame(frame, { live: mode === "preview" }),
    setDisplayScale: (scale) => host.setDisplayScale(scale),
    dispose() {
      host.dispose();
      container.remove();
    },
  };
}

/** One printed face: the upload, the example badge, or a plain card back. */
async function faceCanvas(
  config: LanyardConfig,
  face: "front" | "back",
): Promise<HTMLCanvasElement> {
  const art = face === "front" ? config.front : config.back;
  if (art) return drawFace(art, config.shape);
  // Nothing uploaded at all: the example badge goes on both faces, so the page
  // has a real video in it before anyone has touched the inputs.
  if (!config.front) return drawSampleArt(config.shape, face);
  return drawPlainBack(config.shape, config.style);
}
