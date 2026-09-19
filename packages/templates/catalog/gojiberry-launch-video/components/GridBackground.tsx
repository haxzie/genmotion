import React from "react";
import { useCurrentFrame, random } from "@genmotion/motion";
import { brand } from "./brand";

// The reference backdrop: a soft, out-of-focus tile grid (~150px cells) with a
// handful of tiles glowing grey and slowly breathing. `bloom` (0..1) fades in
// the pink radial the second half of the film sits on; `warm` (0..1) adds the
// peach wash at the bottom used by the outro.
export function GridBackground({ cell = 160, bloom = 0, warm = 0, tint = "#f3f3f2", drift = 0 }: { cell?: number; bloom?: number; warm?: number; tint?: string; drift?: number }) {
  const frame = useCurrentFrame();
  const cols = Math.ceil(1920 / cell) + 2;
  const rows = Math.ceil(1080 / cell) + 2;
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = random(`tile-${r}-${c}`);
      if (seed > 0.28) continue;
      const period = 120 + Math.floor(random(`p-${r}-${c}`) * 120);
      const phase = Math.floor(random(`ph-${r}-${c}`) * period);
      const t = ((frame + phase) % period) / period;
      const a = Math.sin(t * Math.PI);
      tiles.push(
        <div
          key={`${r}-${c}`}
          style={{ position: "absolute", left: c * cell, top: r * cell, width: cell, height: cell, backgroundColor: tint, opacity: a }}
        />,
      );
    }
  }
  return (
    <div id="grid-bg" style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: brand.bg }}>
      {bloom > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: bloom,
            background: "radial-gradient(ellipse 70% 80% at 50% 60%, #fbb9a8 0%, #fcd6c9 35%, #fceee4 65%, #fdfdfd 100%)",
          }}
        />
      )}
      {warm > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: warm,
            background: "linear-gradient(180deg, rgba(253,190,133,0) 40%, rgba(253,205,140,0.55) 100%)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: -cell,
          transform: `translate(${drift * 0.3}px, ${drift}px)`,
          filter: "blur(3px)",
          opacity: 1,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)`,
            backgroundSize: `${cell}px ${cell}px`,
            mixBlendMode: "multiply",
          }}
        />
        {tiles}
      </div>
      {/* the reference's edges fall off to white so the centre reads clean */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 65% 65% at 50% 50%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 100%)",
          opacity: 1 - bloom * 0.6,
        }}
      />
    </div>
  );
}
