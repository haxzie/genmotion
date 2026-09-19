import React from "react";
import { AbsoluteFill, useCurrentFrame } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";

// Scene 05 — ref 11.0–13.2s (66f). "Your problem isn't what you sell" falls
// in word by word at centre (words every 3 frames, "what you sell" in link
// blue), holds, then drifts up into a blur at the end.

export default function Scene() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground drift={-frame * 0.15} />
      <div style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 1080, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TypeLine
          id="problem-line"
          segments={[{ text: "Your problem isn't " }, { text: "what you sell", style: { color: brand.linkBlue } }]}
          startFrom={6}
          each={3}
          duration={8}
          exitAt={60}
          exitDuration={6}
          float
          style={{ fontSize: 54 }}
        />
      </div>
    </AbsoluteFill>
  );
}
