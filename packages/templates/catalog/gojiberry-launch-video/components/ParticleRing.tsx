import React from "react";
import { interpolate, Easing, random } from "@genmotion/motion";

// The reference's orange burst: a ring of elongated dashes that snaps out
// from a point, spins, then thins to specks. `t` is frames since the burst.
// Lives ~30 frames. `radius` is the settled ring radius in px.
export function ParticleRing({ t, cx, cy, radius = 300, count = 44, color = "#f4562f", seed = "ring", id }: { t: number; cx: number; cy: number; radius?: number; count?: number; color?: string; seed?: string; id?: string }) {
  if (t < 0 || t > 34) return null;
  const grow = interpolate(t, [0, 4, 18], [0.15, 0.9, 1.08], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fade = interpolate(t, [10, 30], [1, 0], { easing: Easing.inQuad, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const spin = interpolate(t, [0, 34], [0, 40], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div id={id} style={{ position: "absolute", left: cx, top: cy, width: 0, height: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const a0 = (i / count) * 360 + random(`${seed}-a-${i}`) * 8;
        const inner = i % 3 === 0; // a sparser inner ring of small specks
        const r = radius * grow * (inner ? 0.55 + random(`${seed}-r-${i}`) * 0.2 : 0.92 + random(`${seed}-r-${i}`) * 0.16);
        const len = inner ? 8 + random(`${seed}-l-${i}`) * 14 : 26 + random(`${seed}-l-${i}`) * 60;
        const thick = inner ? 5 : 8 + random(`${seed}-t-${i}`) * 8;
        const a = a0 + spin * (inner ? -1.4 : 1);
        const shrink = interpolate(t, [12, 30], [1, 0.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: len * shrink,
              height: thick * shrink,
              marginTop: (-thick * shrink) / 2,
              borderRadius: 999,
              backgroundColor: color,
              opacity: fade * (0.7 + random(`${seed}-o-${i}`) * 0.3),
              transform: `rotate(${a}deg) translate(${r}px, 0) rotate(${90 + (random(`${seed}-k-${i}`) - 0.5) * 30}deg)`,
              transformOrigin: "0 50%",
              filter: t > 16 ? `blur(${(t - 16) * 0.15}px)` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
