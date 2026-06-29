"use client";

import { create } from "zustand";

export interface PlaybackState {
  frame: number;
  isPlaying: boolean;
  totalFrames: number;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(frame: number): void;
  setTotalFrames(totalFrames: number): void;
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
  setTotalFrames(totalFrames) {
    set((state) => ({
      totalFrames,
      frame: Math.min(state.frame, Math.max(0, totalFrames - 1)),
    }));
  },
}));
