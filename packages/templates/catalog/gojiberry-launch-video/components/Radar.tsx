import React from "react";
import { interpolate, Easing } from "@genmotion/motion";
import { brand } from "./brand";

// Concentric salmon rings radiating from a point, with a slow outward pulse.
// `t` frames since it started; `radii` settled radii (px), innermost first.
export function Radar({ t, cx, cy, radii = [135, 285, 420, 555], opacity = 1, id, light = false }: { t: number; cx: number; cy: number; radii?: number[]; opacity?: number; id?: string; light?: boolean }) {
  const colors = light ? ["#f9a08c", "#f9b3a3", "#fbcbc0", "#fde0d8"] : [brand.ring[3], brand.ring[2], brand.ring[1], brand.ring[0], "#fde0d8"];
  // a pulse: rings breathe outward by up to 4% on a 60-frame cycle
  const pulse = 1 + Math.sin(t / 9.5) * 0.02;
  return (
    <div id={id} style={{ position: "absolute", left: cx, top: cy, width: 0, height: 0, opacity, pointerEvents: "none" }}>
      {[...radii].reverse().map((r, k) => {
        const i = radii.length - 1 - k; // innermost = 0
        const grow = interpolate(t, [i * 2, i * 2 + 12], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const R = r * grow * pulse;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: -R,
              top: -R,
              width: R * 2,
              height: R * 2,
              borderRadius: "50%",
              backgroundColor: colors[Math.min(i, colors.length - 1)],
              opacity: 0.95,
            }}
          />
        );
      })}
    </div>
  );
}
