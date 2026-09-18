import React from "react";
import { interpolate } from "@genmotion/motion";

/**
 * The glowing voice orb — white-hot core sliding into yellow and red.
 * `heat` 0 → 1 morphs it from a flat orange disc (the iris circle it is born
 * from) into the full luminous sphere.
 */
export function Orb({
  frame,
  size,
  heat = 1,
  glow = 1,
  id,
  style,
}: {
  frame: number;
  size: number;
  heat?: number;
  glow?: number;
  id?: string;
  style?: React.CSSProperties;
}) {
  const t = frame * 0.03;
  const hx = 38 + Math.sin(t) * 8;
  const hy = 32 + Math.cos(t * 0.7) * 8;
  const flat = "radial-gradient(circle at 50% 50%, #ee5a2a 0%, #e8462b 100%)";
  const hot = `radial-gradient(circle at ${hx}% ${hy}%, #fffdf5 0%, #fff4c8 22%, #ffe27a 42%, #f7b24e 62%, #ec6a3c 82%, #d9432d 100%)`;
  const glowA = glow * interpolate(Math.sin(frame * 0.08), [-1, 1], [0.75, 1]);
  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: flat,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: hot,
          opacity: heat,
          boxShadow: `0 0 ${size * 0.25 * glowA}px rgba(255,220,150,${0.55 * glowA}), 0 0 ${size * 0.7 * glowA}px rgba(255,140,70,${0.32 * glowA})`,
        }}
      />
    </div>
  );
}

/** Thin concentric rings around the orb. */
export function Rings({ frame, at, count = 3, base, step, opacity = 1 }: { frame: number; at: number; count?: number; base: number; step: number; opacity?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const p = interpolate(frame, [at + i * 6, at + i * 6 + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const d = (base + step * i) * (0.85 + 0.15 * p) + Math.sin(frame * 0.05 + i) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: d,
              height: d,
              marginLeft: -d / 2,
              marginTop: -d / 2,
              borderRadius: "50%",
              border: "1px solid rgba(215,225,255,0.55)",
              opacity: p * opacity * (1 - i * 0.2),
            }}
          />
        );
      })}
    </>
  );
}
