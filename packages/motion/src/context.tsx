"use client";

import { createContext, useContext } from "react";
import type { VideoConfig } from "@genmotion/shared";

export const FrameContext = createContext<number | null>(null);

export const VideoConfigContext = createContext<VideoConfig | null>(null);

export type RenderMode = "preview" | "render";
export const RenderModeContext = createContext<RenderMode>("preview");

export const PlayingContext = createContext<boolean>(false);

/**
 * Length of the nearest enclosing <Sequence>, or null at the scene root.
 * <Sequence> rebases the frame clock but used to discard its own length, which
 * left every element inside one unable to tell when its window ended.
 */
export const SequenceDurationContext = createContext<number | null>(null);

/** Current frame, relative to the nearest enclosing <Sequence> (or the scene root). */
export function useCurrentFrame(): number {
  const frame = useContext(FrameContext);
  if (frame === null) {
    throw new Error(
      "useCurrentFrame() must be used inside a GenMotion composition",
    );
  }
  return frame;
}

export function useVideoConfig(): VideoConfig {
  const config = useContext(VideoConfigContext);
  if (config === null) {
    throw new Error(
      "useVideoConfig() must be used inside a GenMotion composition",
    );
  }
  return config;
}

export function useRenderMode(): RenderMode {
  return useContext(RenderModeContext);
}

/** Whether the player is currently playing (vs paused/scrubbing). Preview only. */
export function useIsPlaying(): boolean {
  return useContext(PlayingContext);
}

/** Length of the enclosing <Sequence>, or null when there isn't a bounded one. */
export function useSequenceDuration(): number | null {
  const duration = useContext(SequenceDurationContext);
  return duration !== null && Number.isFinite(duration) ? duration : null;
}

/**
 * How many frames the current element's window lasts — the enclosing
 * <Sequence> if there is a bounded one, otherwise the whole scene.
 *
 * This is the number to time an exit against. Reaching for
 * `useVideoConfig().durationInFrames` inside a <Sequence> is the classic
 * mistake: the frame clock is sequence-relative but that value is not.
 */
export function useWindowDuration(): number {
  const sequence = useContext(SequenceDurationContext);
  const config = useVideoConfig();
  return sequence !== null && Number.isFinite(sequence)
    ? sequence
    : config.durationInFrames;
}
