import React from "react";
import { brand } from "./brand";

/**
 * The blurred-photo mesh gradient behind the chat demo: greens with a dark
 * pocket in the middle, a tan corner top-left and a sky streak lower-left.
 * Blobs drift with the frame so the surface never sits still.
 */
export function Mesh({ frame, opacity = 1, style }: { frame: number; opacity?: number; style?: React.CSSProperties }) {
  const t = frame * 0.012;
  const m = brand.mesh;
  const g = (x: number, y: number, w: number, h: number, c: string, stop = 70) =>
    `radial-gradient(${w}px ${h}px at ${x}% ${y}%, ${c} 0%, transparent ${stop}%)`;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        backgroundColor: m.deep,
        backgroundImage: [
          g(48 + Math.sin(t) * 3, 40 + Math.cos(t) * 3, 900, 700, "#0f2413", 72),
          g(10 + Math.cos(t * 0.8) * 3, 8, 1000, 700, m.tan, 65),
          g(22 + Math.sin(t * 0.6) * 4, 70 + Math.cos(t * 0.5) * 3, 1300, 480, m.sky, 60),
          g(80 + Math.sin(t * 0.9) * 3, 25 + Math.cos(t * 0.7) * 4, 1100, 900, m.green, 70),
          g(70, 85 + Math.sin(t * 0.4) * 3, 1400, 700, m.olive, 65),
          g(35 + Math.cos(t * 0.5) * 3, 45, 1500, 1100, m.green, 80),
        ].join(", "),
        ...style,
      }}
    />
  );
}
