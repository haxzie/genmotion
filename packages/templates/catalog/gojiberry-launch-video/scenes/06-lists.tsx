import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { Sheet, SHEET_W } from "../components/Sheet";

// Scene 06 — ref 13.2–15.4s (66f). "It's spending hours building lists"
// types along a tilted plane while the green sheet rises from the bottom,
// drifts up slowly, then drops back out of frame.

export default function Scene() {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, 12], [900, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = interpolate(frame, [12, 57], [0, -40], { easing: Easing.linear, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drop = interpolate(frame, [57, 66], [0, 950], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = rise + drift + drop;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground />
      <div
        id="sheet"
        style={{
          position: "absolute",
          left: (1920 - SHEET_W) / 2,
          top: 270 + y,
          transform: "perspective(2400px) rotateX(16deg) rotate(-5deg)",
          transformOrigin: "50% 0%",
        }}
      >
        <Sheet />
      </div>
      <div style={{ position: "absolute", top: 90 + drift * 0.6, left: 0, width: 1920, display: "flex", justifyContent: "center", transform: "rotate(-5deg)" }}>
        <TypeLine
          id="lists-line"
          segments={[{ text: "It's spending hours " }, { text: "building lists", style: { color: "#3f9a2c" } }]}
          startFrom={0}
          each={5}
          duration={8}
          exitAt={59}
          exitDuration={7}
          style={{ fontSize: 50 }}
        />
      </div>
    </AbsoluteFill>
  );
}
