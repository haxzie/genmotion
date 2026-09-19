import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { CardField } from "../components/CardField";
import { HundredLines } from "../components/HundredLines";

// Scene 03 — ref 3.0–6.4s (102f). Opens on the blue tint + card field from 02.
// The camera finishes pulling back through the field of sent DMs while
// "After a hundred reach-outs today…" types in; the field fades, the line
// centres, "maybe someone will respond" types below in link blue.
// HANDOFF → 04: both lines centred (04 re-renders them via HundredLines).

export default function Scene() {
  const frame = useCurrentFrame();
  const blue = interpolate(frame, [0, 8], [0.42, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground />
      <CardField t={frame} />
      {blue > 0 && <div id="blue-tint" style={{ position: "absolute", inset: 0, backgroundColor: brand.linkedin, opacity: blue }} />}
      <HundredLines t={frame} />
    </AbsoluteFill>
  );
}
