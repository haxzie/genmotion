import * as THREE from "three";

export type ReadinessCheck = () => Promise<void>;

/**
 * In render mode the host must not capture a frame until every asset a scene
 * kicked off loading has settled. A scene's `manager` (see `createLoadingTracker`)
 * registers itself here; the host awaits every check before each `setFrame` resolves.
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

/**
 * A LoadingManager whose idle state can be awaited.
 *
 * `onLoad` fires when every started item has settled (errors included), so
 * one promise per busy stretch is enough — the barrier only needs to know
 * whether anything is still in flight right now.
 */
export function createLoadingTracker(): {
  manager: THREE.LoadingManager;
  waitForIdle(): Promise<void>;
} {
  const manager = new THREE.LoadingManager();
  let pending: Promise<void> | null = null;
  let settle: (() => void) | null = null;

  manager.onStart = () => {
    if (pending) return;
    pending = new Promise<void>((resolve) => {
      settle = resolve;
    });
  };
  manager.onLoad = () => {
    settle?.();
    pending = null;
    settle = null;
  };

  return { manager, waitForIdle: () => pending ?? Promise.resolve() };
}
