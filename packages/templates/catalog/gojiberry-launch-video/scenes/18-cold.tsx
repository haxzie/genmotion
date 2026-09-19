import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";

// Scene 18 — ref 54.7–57.4s (81f). "You stop wasting time on" types as a
// red wave (a declining area chart) sweeps in from the left and sinks;
// a coral "cold prospects" pill pops onto the line, and the whole line
// drifts left out of frame.

function wave(t: number, drop: number) {
  // an area path across a 2400px-wide band; peaks drift right and sink over time
  const pts: string[] = [];
  for (let x = 0; x <= 2400; x += 40) {
    const y = 620 + drop + Math.sin(x / 260 - t / 28) * 90 + Math.sin(x / 110 + t / 40) * 30 + x * 0.04;
    pts.push(`${x},${y}`);
  }
  return `M ${pts.join(" L ")} L 2400,1200 L 0,1200 Z`;
}

export default function Scene() {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame, [3, 21], [-2200, -240], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sink = interpolate(frame, [21, 81], [-140, 120], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pill = interpolate(frame, [33, 43], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shift = interpolate(frame, [33, 54, 81], [0, -270, -1500], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} />

      <svg id="cold-wave" width={2400} height={1200} style={{ position: "absolute", left: sweep, top: sink }}>
        <defs>
          <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f39e9b" />
            <stop offset="1" stopColor="#f6b3ad" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <path d={wave(frame, 0)} fill="url(#waveFill)" stroke="#f96b5b" strokeWidth={4} />
      </svg>

      <div style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 1080, display: "flex", alignItems: "center", justifyContent: "center", transform: `translateX(${shift}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28, whiteSpace: "pre" }}>
          <TypeLine id="cold-line" segments={[{ text: "You stop wasting time on" }]} startFrom={0} each={5} duration={8} style={{ fontSize: 66 }} />
          <div
            id="cold-pill"
            style={{
              transform: `scale(${pill})`,
              opacity: pill > 0 ? 1 : 0,
              backgroundColor: "#fd523e",
              color: "#fff",
              fontFamily: brand.font,
              fontWeight: 600,
              fontSize: 60,
              padding: "14px 80px",
              borderRadius: 999,
              boxShadow: "0 16px 40px rgba(253,82,62,0.35)",
            }}
          >
            cold prospects
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
