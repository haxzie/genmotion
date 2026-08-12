"use client";

import { createContext, useContext } from "react";
import type { CameraState } from "./camera";

/** Present only inside a <Camera>. Null means "no camera in this subtree". */
export const CameraContext = createContext<CameraState | null>(null);

/** The camera's position this frame, or null outside a <Camera>. */
export function useCamera(): CameraState | null {
  return useContext(CameraContext);
}

/**
 * Whether an enclosing <Camera> may scale this subtree.
 *
 * Components use this to drop `will-change: transform`. That hint exists to
 * pin a layer's raster scale so the compositor can reuse the texture — which
 * is exactly wrong under a camera zoom, where the pinned texture gets stretched
 * instead of the glyphs being re-rasterized. Outside a camera the hint is still
 * a win, so it stays.
 */
export function useIsCameraScaled(): boolean {
  return useContext(CameraContext) !== null;
}
