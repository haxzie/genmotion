"use client";

import { create } from "zustand";

export interface PlaybackState {
  frame: number;
  isPlaying: boolean;
  totalFrames: number;
  /**
   * Frame the pointer is hovering on the timeline, or null when it isn't over
   * it. The preview shows this frame without the playhead moving, so you can
   * look somewhere else in the composition and get your position back by
   * moving the pointer away — nothing is committed.
   */
  hoverFrame: number | null;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(frame: number): void;
  setHoverFrame(frame: number | null): void;
  setTotalFrames(totalFrames: number): void;
}

/**
 * What the preview should actually paint: the hovered frame while the pointer
 * is over the timeline, otherwise the playhead.
 *
 * Hover is ignored during playback — freezing the picture on a hovered frame
 * while the clock and the audio carry on is a worse answer than showing the
 * video that is playing.
 */
export function selectDisplayFrame(state: PlaybackState): number {
  if (state.isPlaying || state.hoverFrame === null) return state.frame;
  return state.hoverFrame;
}

/**
 * Global playback clock shared by the preview player, transport controls,
 * and timeline playhead. Frame updates are transient and high-frequency —
 * subscribe with selectors.
 */
export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  frame: 0,
  isPlaying: false,
  totalFrames: 0,
  hoverFrame: null,
  play() {
    const { frame, totalFrames } = get();
    // Pressing play at the end restarts from the beginning.
    if (totalFrames > 0 && frame >= totalFrames - 1) {
      set({ frame: 0, isPlaying: true });
    } else {
      set({ isPlaying: true });
    }
  },
  pause() {
    set({ isPlaying: false });
  },
  toggle() {
    get().isPlaying ? get().pause() : get().play();
  },
  seek(frame) {
    const { totalFrames } = get();
    const clamped = Math.max(0, Math.min(frame, Math.max(0, totalFrames - 1)));
    set({ frame: Math.floor(clamped) });
  },
  setHoverFrame(frame) {
    const { totalFrames, hoverFrame } = get();
    const next =
      frame === null
        ? null
        : Math.floor(Math.max(0, Math.min(frame, Math.max(0, totalFrames - 1))));
    // The pointer moves far more often than it crosses a frame boundary, and
    // every change here re-renders the whole composition.
    if (next !== hoverFrame) set({ hoverFrame: next });
  },
  setTotalFrames(totalFrames) {
    set((state) => ({
      totalFrames,
      frame: Math.min(state.frame, Math.max(0, totalFrames - 1)),
      hoverFrame:
        state.hoverFrame === null
          ? null
          : Math.min(state.hoverFrame, Math.max(0, totalFrames - 1)),
    }));
  },
}));
