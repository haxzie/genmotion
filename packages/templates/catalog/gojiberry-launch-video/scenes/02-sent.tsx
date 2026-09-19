import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { CardField } from "../components/CardField";
import { Cursor } from "../components/Cursor";

// Scene 02 — ref 2.0–3.0s (30f). Opens on the full blue flood from 01.
// "Sent" fades up in the centre; the cursor + ring from the click fade out;
// at the end the blue thins to a tint as the card field arrives underneath.
// HANDOFF → 03 opens with the same tint and field at t=0.

const TIP_X = 1091; // where 01 left the cursor tip (inside Send)
const TIP_Y = 830;

export default function Scene() {
  const frame = useCurrentFrame();
  const sentIn = interpolate(frame, [1, 7], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sentOut = interpolate(frame, [24, 29], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorOut = interpolate(frame, [0, 9], [0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ring = interpolate(frame, [-6, 4], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // blue → tint: full until f24, 0.42 at the cut (03 continues the fade)
  const blue = interpolate(frame, [24, 30], [1, 0.42], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground />
      <CardField t={frame - 30} />
      <div id="blue-tint" style={{ position: "absolute", inset: 0, backgroundColor: brand.linkedin, opacity: blue }} />
      <div
        id="sent-label"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: brand.font,
          fontWeight: 600,
          fontSize: 44,
          color: "#ffffff",
          opacity: sentIn * sentOut,
          transform: `translateY(${(1 - sentIn) * 10}px)`,
        }}
      >
        Sent
      </div>
      <Cursor x={TIP_X} y={TIP_Y} ring={ring} opacity={cursorOut} />
    </AbsoluteFill>
  );
}
