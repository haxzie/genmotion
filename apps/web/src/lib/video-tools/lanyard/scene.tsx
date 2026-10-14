"use client";

/**
 * The lanyard scene as the player sees it: a canvas that paints whatever frame
 * the playback clock is on.
 *
 * It sits inside the same `<Player>` the DOM templates use, so the transport,
 * the scrubber and the scale-to-fit come for free and the preview is driven by
 * the one frame number the export will also ask for. Underneath, both are the
 * engine's `mountThreeRenderHost`: this one in `preview` mode, the export's in
 * `capture`.
 */

import { useEffect, useRef, useState } from "react";
import { useCurrentFrame, useVideoConfig } from "@genmotion/motion";
import type { LanyardConfig } from "./types";
import type { LanyardRenderer } from "./renderer";

/**
 * How much of the composition's size the preview's drawing buffer is built at.
 *
 * The player scales a 1080-wide composition into a column about 900px across,
 * and the host's own `setDisplayScale` then sizes the buffer from this. Shading
 * four times the pixels the page can show is the difference between a preview
 * that holds 30fps on an integrated GPU and one that does not; the framing is
 * identical either way, since the camera fit reads the aspect ratio and never
 * the pixel count.
 */
const PREVIEW_SCALE = 0.55;

export function LanyardScene({
  config,
  onError,
}: {
  config: LanyardConfig;
  onError?: (message: string) => void;
}) {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<LanyardRenderer | null>(null);
  // The frame to paint the moment the renderer is ready: building it is async,
  // and the clock does not stop to wait.
  const frameRef = useRef(frame);
  const [ready, setReady] = useState(false);

  frameRef.current = frame;

  useEffect(() => {
    let cancelled = false;
    let renderer: LanyardRenderer | null = null;
    setReady(false);

    void (async () => {
      try {
        const { createLanyardRenderer } = await import("./renderer");
        renderer = await createLanyardRenderer({
          width,
          height,
          fps,
          durationInFrames,
          config,
          mode: "preview",
        });
        if (cancelled) {
          renderer.dispose();
          return;
        }
        renderer.setDisplayScale(PREVIEW_SCALE);
        const canvas = renderer.canvas;
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
        hostRef.current?.replaceChildren(canvas);
        rendererRef.current = renderer;
        await renderer.drawFrame(frameRef.current);
        if (!cancelled) setReady(true);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        onError?.(
          error instanceof Error && error.message
            ? error.message
            : "This browser could not start WebGL, which the 3D preview needs.",
        );
      }
    })();

    return () => {
      cancelled = true;
      rendererRef.current = null;
      renderer?.dispose();
    };
    // `onError` is deliberately not a dependency: a parent that passes an
    // inline handler would otherwise rebuild the whole scene on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, width, height, fps, durationInFrames]);

  useEffect(() => {
    if (ready) void rendererRef.current?.drawFrame(frame);
  }, [frame, ready]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#060707" }}>
      <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(237,237,239,0.5)",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: Math.round(Math.min(width, height) * 0.028),
          }}
        >
          Building the scene…
        </div>
      )}
    </div>
  );
}
