"use client";

import { createContext, createElement, useContext, useState, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";

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

export type PlaybackStoreApi = StoreApi<PlaybackState>;

/**
 * One playback clock, shared by a preview player, its transport controls and
 * its timeline playhead. Frame updates are transient and high-frequency —
 * subscribe with selectors.
 *
 * A factory rather than a single global: the desktop editor keeps several
 * projects open at once, each with its own player, and one clock between them
 * would have a background tab's timeline scrubbing the frontmost preview.
 * Pages with a single player never need to think about this — see
 * `defaultPlaybackStore` below.
 */
export function createPlaybackStore(): PlaybackStoreApi {
  return createStore<PlaybackState>((set, get) => ({
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
}

/**
 * The store a page gets when it has not asked for its own.
 *
 * Every `usePlaybackStore` call outside a `PlaybackStoreProvider` reads this
 * one, which is exactly the old single-global behaviour — a page with one
 * `<Player>` and one set of controls needs nothing else.
 */
export const defaultPlaybackStore: PlaybackStoreApi = createPlaybackStore();

const PlaybackStoreContext = createContext<PlaybackStoreApi | null>(null);

/** Give the subtree its own clock. The desktop editor mounts one per project tab. */
export function PlaybackStoreProvider({
  store,
  children,
}: {
  /** Bring your own — the host may need a handle to it (to pause a hidden tab, say). */
  store?: PlaybackStoreApi;
  children: ReactNode;
}) {
  const [own] = useState(createPlaybackStore);
  return createElement(PlaybackStoreContext.Provider, { value: store ?? own }, children);
}

/**
 * The nearest clock itself, for imperative reads and writes inside event
 * handlers and effects. This — not a static on the hook — is how to get one:
 * a `usePlaybackStore.getState()` would always read the default store, which
 * inside a provider is nobody's clock.
 */
export function usePlaybackStoreApi(): PlaybackStoreApi {
  return useContext(PlaybackStoreContext) ?? defaultPlaybackStore;
}

export function usePlaybackStore<T>(selector: (state: PlaybackState) => T): T {
  return useStore(usePlaybackStoreApi(), selector);
}
