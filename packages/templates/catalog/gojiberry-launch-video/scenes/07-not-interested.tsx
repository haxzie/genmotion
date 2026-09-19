import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { RudeReply, RUDE_W, RUDE_H } from "../components/RudeReply";

// Scene 07 — ref 15.4–18.0s (78f). Three rude replies fan up on a tilted
// plane (stagger 4f) while "contacting people who are not interested" types
// along the bottom; slow drift; cards blur and the line shrinks away.

const CARDS: { x: number; y: number; rot: number; z: number; delay: number; avatar: number; lines: [string, string] }[] = [
  { x: 0.25, y: 0.4, rot: -3, z: 0, delay: 0, avatar: 5, lines: ["Go to hell.", "Kind regards"] },
  { x: 0.75, y: 0.38, rot: 2, z: 0, delay: 4, avatar: 0, lines: ["I couldn't care less.", "Sincerely"] },
  { x: 0.54, y: 0.5, rot: -1, z: 1, delay: 8, avatar: 2, lines: ["Do whatever you want.", "Best wishes"] },
];

export default function Scene() {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [72, 78], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground />
      <div style={{ position: "absolute", inset: 0, perspective: 2000, perspectiveOrigin: "50% 40%" }}>
        {CARDS.map((c, i) => {
          const p = interpolate(frame, [3 + c.delay, 15 + c.delay], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const drift = Math.sin((frame + i * 20) / 45) * 6;
          return (
            <div
              key={i}
              id={`rude-${i}`}
              style={{
                position: "absolute",
                left: c.x * 1920 - RUDE_W / 2,
                top: c.y * 1080 - RUDE_H / 2 + (1 - p) * 420 + drift - exit * 60,
                transform: `rotateX(22deg) rotate(${c.rot}deg) scale(${0.9 + p * 0.1})`,
                opacity: p * (1 - exit),
                filter: exit > 0 ? `blur(${exit * 14}px)` : undefined,
                zIndex: c.z,
              }}
            >
              <RudeReply avatar={c.avatar} lines={c.lines} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 875, left: 0, width: 1920, display: "flex", justifyContent: "center", transform: `scale(${1 - exit * 0.5})`, opacity: 1 - exit }}>
        <TypeLine
          id="not-interested-line"
          segments={[{ text: "contacting people who are " }, { text: "not interested", style: { color: brand.linkBlue } }]}
          startFrom={0}
          each={4}
          duration={8}
          style={{ fontSize: 60 }}
        />
      </div>
    </AbsoluteFill>
  );
}
