"use client";

/**
 * Dev harness for the 3D lanyard drop generator.
 *
 * The player preview is the same one the tool page shows, and the filmstrip
 * under it is the thing worth having: eight evenly spaced frames drawn by a
 * second renderer, which is how the drop, the whip as the strap goes taut, the
 * turn through the back and the settle get checked in one screenshot instead of
 * by scrubbing. Also the fastest way to see a lighting or framing change across
 * all three card shapes and all three scenes.
 *
 * Kept out of the marketing routes: /dev is not in the sitemap and is
 * disallowed for crawlers.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@genmotion/player";
import { Button } from "@/components/ui";
import { Chips, Transport } from "@/components/tools/tool-controls";
import { LanyardScene } from "@/lib/video-tools/lanyard/scene";
import {
  CARD_SHAPES,
  CARD_SHAPE_IDS,
  LANYARD_DURATION_IN_FRAMES,
  LANYARD_FPS,
  LANYARD_STYLES,
  LANYARD_STYLE_IDS,
  type CardShapeId,
  type LanyardConfig,
  type LanyardStyleId,
} from "@/lib/video-tools/lanyard/types";
import { ASPECTS, ASPECT_KEYS, type AspectKey } from "@/lib/video-tools/types";

const STRIP_FRAMES = 10;
const STRIP_WIDTH = 220;

export default function LanyardDevPage() {
  const [shape, setShape] = useState<CardShapeId>("portrait");
  const [style, setStyle] = useState<LanyardStyleId>("studio");
  const [aspect, setAspect] = useState<AspectKey>("portrait");
  const [status, setStatus] = useState("idle");
  const stripRef = useRef<HTMLDivElement>(null);

  const { width, height } = ASPECTS[aspect];
  const config = useMemo<LanyardConfig>(
    () => ({ shape, front: null, back: null, style, strap: LANYARD_STYLES[style].strap }),
    [shape, style],
  );

  const scenes = useMemo(
    () => [
      {
        id: "lanyard",
        name: "Lanyard drop",
        durationInFrames: LANYARD_DURATION_IN_FRAMES,
        component: () => <LanyardScene config={config} onError={setStatus} />,
      },
    ],
    [config],
  );

  // The filmstrip, redrawn whenever the composition changes.
  useEffect(() => {
    let cancelled = false;
    const host = stripRef.current;
    if (!host) return;

    void (async () => {
      const started = performance.now();
      setStatus("drawing filmstrip…");
      const { createLanyardRenderer } = await import("@/lib/video-tools/lanyard/renderer");
      const stripHeight = Math.round((STRIP_WIDTH * height) / width);
      const renderer = await createLanyardRenderer({
        width: STRIP_WIDTH * 2,
        height: stripHeight * 2,
        fps: LANYARD_FPS,
        durationInFrames: LANYARD_DURATION_IN_FRAMES,
        config,
        // Preview mode: every texture in this scene is a canvas, so there is
        // nothing in flight for the capture barrier to wait on, and paying two
        // animation frames per tile makes the strip take seconds per frame.
        mode: "preview",
      });
      try {
        const tiles: HTMLElement[] = [];
        for (let i = 0; i < STRIP_FRAMES; i++) {
          const frame = Math.round((i / (STRIP_FRAMES - 1)) * (LANYARD_DURATION_IN_FRAMES - 1));
          await renderer.drawFrame(frame);
          const tile = document.createElement("canvas");
          tile.width = STRIP_WIDTH * 2;
          tile.height = stripHeight * 2;
          tile.style.cssText = `width:${STRIP_WIDTH}px;height:${stripHeight}px;border-radius:6px`;
          // Explicit destination size: the host sizes its drawing buffer in
          // device pixels, so on a retina display the source canvas is twice
          // the composition and a 1:1 blit would show its top-left quarter.
          tile.getContext("2d")!.drawImage(renderer.canvas, 0, 0, tile.width, tile.height);
          const label = document.createElement("div");
          label.textContent = `f${frame} · ${(frame / LANYARD_FPS).toFixed(2)}s`;
          label.style.cssText = "font:11px ui-monospace,monospace;opacity:0.5;margin-top:4px";
          const cell = document.createElement("div");
          cell.append(tile, label);
          tiles.push(cell);
        }
        if (cancelled) return;
        host.replaceChildren(...tiles);
        setStatus(`filmstrip in ${Math.round(performance.now() - started)}ms`);
      } finally {
        renderer.dispose();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, width, height]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-8">
      <h1 className="text-xl font-medium">Lanyard drop harness</h1>

      <div className="flex flex-wrap items-center gap-5">
        <Chips
          label="Shape"
          options={CARD_SHAPE_IDS.map((id) => ({ value: id, label: CARD_SHAPES[id].label }))}
          value={shape}
          onChange={(value) => setShape(value as CardShapeId)}
        />
        <Chips
          label="Scene"
          options={LANYARD_STYLE_IDS.map((id) => ({ value: id, label: LANYARD_STYLES[id].label }))}
          value={style}
          onChange={(value) => setStyle(value as LanyardStyleId)}
        />
        <Chips
          label="Size"
          options={ASPECT_KEYS.map((key) => ({ value: key, label: ASPECTS[key].label }))}
          value={aspect}
          onChange={(value) => setAspect(value as AspectKey)}
        />
        <Button size="sm" onClick={() => setStatus("idle")}>
          {status}
        </Button>
      </div>

      <div
        className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-black"
        style={{ aspectRatio: `${width} / ${height}`, maxWidth: `calc(60vh * ${width} / ${height})` }}
      >
        <Player scenes={scenes} fps={LANYARD_FPS} width={width} height={height} />
      </div>
      <Transport durationInFrames={LANYARD_DURATION_IN_FRAMES} fps={LANYARD_FPS} />

      <div ref={stripRef} className="flex flex-wrap gap-3" />
    </div>
  );
}
