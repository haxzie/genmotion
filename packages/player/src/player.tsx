"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { totalDurationInFrames, type AudioClipData } from "@genmotion/shared";
import type { CompiledScene } from "./types";
import { Composition } from "./composition";
import { usePlaybackStore, selectDisplayFrame } from "./store";
import type { SceneRuntimeError } from "./scene-boundary";

export interface PlayerProps {
  scenes: CompiledScene[];
  fps: number;
  width: number;
  height: number;
  className?: string;
  audioClips?: AudioClipData[];
  onSceneError?: (error: SceneRuntimeError) => void;
}

/**
 * The interactive preview player. Renders the composition at its native
 * resolution scaled to fit the container, and advances the playback store's
 * frame with an anchored real-time clock (jank skips frames, never drifts).
 */
export function Player({
  scenes,
  fps,
  width,
  height,
  className,
  audioClips,
  onSceneError,
}: PlayerProps) {
  // What to paint — the hovered frame while the timeline is being hovered,
  // otherwise the playhead. The playback clock below deliberately reads the raw
  // `frame` off the store instead: hovering previews, it never moves time.
  const frame = usePlaybackStore(selectDisplayFrame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);

  const totalFrames = totalDurationInFrames(scenes);
  useEffect(() => {
    usePlaybackStore.getState().setTotalFrames(totalFrames);
  }, [totalFrames]);

  // Anchored playback clock
  useEffect(() => {
    if (!isPlaying) return;
    const store = usePlaybackStore;
    let anchor = performance.now() - (store.getState().frame / fps) * 1000;
    // Track what we last wrote, so we can tell our own updates apart from an
    // external seek (timeline scrub / transport jump) that happens mid-playback.
    let lastSetFrame = store.getState().frame;
    let raf: number;

    const tick = () => {
      const { totalFrames: total, isPlaying: playing, frame: current } =
        store.getState();
      if (!playing) return;
      // If the frame moved out from under us (the user seeked), re-anchor the
      // clock to the new position and keep playing from there.
      if (current !== lastSetFrame) {
        anchor = performance.now() - (current / fps) * 1000;
        lastSetFrame = current;
      }
      const next = Math.floor(((performance.now() - anchor) / 1000) * fps);
      if (next >= total - 1) {
        // Playback reached the end: stop and rewind to the beginning.
        store.setState({ frame: 0, isPlaying: false });
        return;
      }
      if (next !== current) {
        store.setState({ frame: next });
        lastSetFrame = next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, fps]);

  // Scale-to-fit
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width: cw, height: ch } = entry.contentRect;
      setScale(Math.min(cw / width, ch / height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          flexShrink: 0,
          background: "#000",
          // Round the preview canvas. Divide by scale so the on-screen radius
          // stays ~12px regardless of how far the composition is scaled to fit.
          borderRadius: scale ? 12 / scale : 0,
          overflow: "hidden",
          visibility: scale === 0 ? "hidden" : "visible",
        }}
      >
        <Composition
          scenes={scenes}
          frame={frame}
          fps={fps}
          width={width}
          height={height}
          mode="preview"
          playing={isPlaying}
          audioClips={audioClips}
          onSceneError={onSceneError}
        />
      </div>
    </div>
  );
}
