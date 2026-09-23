import React from "react";
import { useVideoConfig } from "@genmotion/motion";
import { FISHEYE_MAP, PINCUSHION_MAP } from "./fisheyeMap";

/**
 * Fish-eye lens over its children — an SVG feDisplacementMap driven by a radial map.
 *
 * - default (barrel): displacement ∝ (1 − r²) — the centre bulges toward the
 *   viewer, edges stay pinned. Folds past strength ≈ 350.
 * - `invert` (pincushion): displacement ∝ r² — the centre stays 1:1 and the
 *   edges/corners magnify and stretch outward. Folds past strength ≈ 540.
 *
 * `strength` is the displacement scale in px; animate it per frame. The filter
 * is dropped entirely at 0.
 */
export function Fisheye({ strength, id, invert = false, children }: {
  strength: number; id: string;
  /** invert: pincushion — centre stays 1:1, edges and corners magnify */
  invert?: boolean;
  children: React.ReactNode;
}) {
  const map = invert ? PINCUSHION_MAP : FISHEYE_MAP;
  const { width, height } = useVideoConfig();
  const on = strength > 0.5;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter
            id={id}
            x="0" y="0" width={width} height={height}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage href={map} x="0" y="0" width={width} height={height} preserveAspectRatio="none" result="lens" />
            <feDisplacementMap in="SourceGraphic" in2="lens" scale={strength} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, filter: on ? `url(#${id})` : undefined }}>{children}</div>
    </div>
  );
}
