"use client";

import { createContext, useContext, useEffect } from "react";

export type ReadinessCheck = () => Promise<void>;

/**
 * In render mode the player must not capture a frame until every media
 * element has presented the exact frame. Media components register a check;
 * the render host awaits all checks after each React commit.
 */
export interface MediaReadinessController {
  register(check: ReadinessCheck): () => void;
  waitForReady(): Promise<void>;
}

export function createMediaReadinessController(): MediaReadinessController {
  const checks = new Set<ReadinessCheck>();
  return {
    register(check) {
      checks.add(check);
      return () => checks.delete(check);
    },
    async waitForReady() {
      await Promise.all([...checks].map((check) => check()));
    },
  };
}

export const MediaReadinessContext =
  createContext<MediaReadinessController | null>(null);

/** Register a readiness check for the lifetime of the component (render mode only). */
export function useMediaReadiness(check: ReadinessCheck | null) {
  const controller = useContext(MediaReadinessContext);
  useEffect(() => {
    if (!controller || !check) return;
    return controller.register(check);
  }, [controller, check]);
}
