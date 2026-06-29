"use client";

import { createContext, useContext } from "react";
import type { VideoConfig } from "@genmotion/shared";

export const FrameContext = createContext<number | null>(null);

export const VideoConfigContext = createContext<VideoConfig | null>(null);

export type RenderMode = "preview" | "render";
export const RenderModeContext = createContext<RenderMode>("preview");

export const PlayingContext = createContext<boolean>(false);

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
