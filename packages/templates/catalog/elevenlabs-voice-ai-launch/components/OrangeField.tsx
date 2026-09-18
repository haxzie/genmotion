import React from "react";
import { random } from "@genmotion/motion";
import { Dither } from "./Dither";

/** The "Until now." surface: red→orange gradient with a drifting warm bloom and dither blocks skylining the bottom edge. */
export function OrangeField({ frame, children }: { frame: number; children?: React.ReactNode }) {
  const t = frame * 0.02;
  const bx = 60 + Math.sin(t) * 10;
  const by = 8 + Math.cos(t * 0.8) * 6;
  const blocks = Array.from({ length: 14 }, (_, i) => ({
    x: Math.floor(random(`ob-x${i}`) * 22) * 80 + 40,
    w: (1 + Math.floor(random(`ob-w${i}`) * 3)) * 80,
    h: (1 + Math.floor(random(`ob-h${i}`) * 4)) * 60,
    y: 1080 - (1 + Math.floor(random(`ob-y${i}`) * 4)) * 60,
    at: Math.floor(random(`ob-t${i}`) * 20),
  }));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: `radial-gradient(1200px 700px at ${bx}% ${by}%, rgba(255,190,140,0.85) 0%, rgba(255,150,90,0.25) 45%, rgba(255,120,60,0) 70%), linear-gradient(180deg, #e0392a 0%, #ec5428 50%, #f48a2b 100%)`,
      }}
    >
      {blocks.map((b, i) =>
        frame >= b.at ? (
          <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, opacity: 0.85 }}>
            <Dither frame={frame} gradient="linear-gradient(180deg, #f08a4a, #e2502c)" pitch={8} dot={2.6} dotColor={i % 3 === 0 ? "rgba(90,140,200,0.95)" : "rgba(255,240,220,0.95)"} />
          </div>
        ) : null,
      )}
      {children}
    </div>
  );
}
