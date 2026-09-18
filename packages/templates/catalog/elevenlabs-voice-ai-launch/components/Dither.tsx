import React from "react";

/**
 * Halftone / dot-matrix surface. A colour gradient underneath, and a layer of
 * light dots on top whose brightness follows slowly drifting wave bands — which
 * is what makes it read as a dithered gradient rather than a flat pattern.
 */
export function Dither({
  frame = 0,
  gradient,
  pitch = 8,
  dot = 3.4,
  dotColor = "rgba(255,255,255,0.92)",
  drift = 1,
  style,
  children,
}: {
  frame?: number;
  gradient: string;
  pitch?: number;
  dot?: number;
  dotColor?: string;
  drift?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const t = frame * 0.02 * drift;
  const ax = 30 + Math.sin(t) * 16;
  const ay = 35 + Math.cos(t * 0.8) * 14;
  const bx = 78 + Math.cos(t * 0.7) * 14;
  const by = 62 + Math.sin(t * 0.9) * 16;
  const cx = 50 + Math.sin(t * 0.5 + 2) * 24;
  const cy = 55 + Math.cos(t * 0.6) * 30;
  const rot = -18 + Math.sin(t * 0.4) * 6;
  const mask = `radial-gradient(circle, #000 ${dot / 2}px, transparent ${dot / 2 + 0.5}px)`;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: gradient, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(1400px 340px at ${ax}% ${ay}%, ${dotColor} 0%, rgba(255,255,255,0.75) 30%, rgba(255,255,255,0.12) 62%, rgba(255,255,255,0) 80%),
                       radial-gradient(1200px 420px at ${bx}% ${by}%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 35%, rgba(255,255,255,0.08) 70%, rgba(255,255,255,0) 85%),
                       radial-gradient(900px 260px at ${cx}% ${cy}%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0) 75%),
                       linear-gradient(${rot}deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.35) 70%, rgba(255,255,255,0.1) 100%)`,
          WebkitMaskImage: mask,
          maskImage: mask,
          WebkitMaskSize: `${pitch}px ${pitch}px`,
          maskSize: `${pitch}px ${pitch}px`,
        }}
      />
      {children}
    </div>
  );
}
