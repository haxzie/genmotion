import { createContext, useContext, type ReactNode } from "react";
import type { SceneBundle } from "../../electron/shared";

interface BundlesValue {
  bundles: Record<string, SceneBundle>;
  /** False until the first payload has arrived. */
  ready: boolean;
}

const BundlesContext = createContext<BundlesValue>({ bundles: {}, ready: false });

/**
 * Scene bundles built by the main process, handed to the compile hook. They
 * ride along on the project payload rather than a second request, so a scene
 * and the code it compiled to can never be a frame out of sync.
 */
export function ProjectBundlesProvider({
  bundles,
  ready,
  children,
}: BundlesValue & { children: ReactNode }) {
  return (
    <BundlesContext.Provider value={{ bundles, ready }}>{children}</BundlesContext.Provider>
  );
}

export function useProjectBundles(): BundlesValue {
  return useContext(BundlesContext);
}
