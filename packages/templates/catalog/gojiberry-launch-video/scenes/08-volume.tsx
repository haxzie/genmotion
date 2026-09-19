import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, random } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { ReplyCard, REPLY_W, REPLY_H } from "../components/ReplyCard";

// Scene 08 — ref 18.0–20.3s (69f). A wall of message threads at three
// depths (near ones soft, far ones small and washed out) drifts under
// "and hoping volume will fix the problem"; everything fades to white.

// x, y in frame fractions; d = depth (1 = screen plane)
const WALL: { x: number; y: number; d: number }[] = [
  { x: 0.22, y: 0.18, d: 1.0 }, { x: 0.63, y: 0.16, d: 1.0 }, { x: 0.85, y: 0.78, d: 1.0 },
  { x: 0.23, y: 0.66, d: 1.35 }, { x: 0.48, y: 0.62, d: 1.55 }, { x: 0.5, y: 0.26, d: 1.4 },
  { x: 0.05, y: 0.22, d: 1.8 }, { x: 0.35, y: 0.22, d: 1.6 }, { x: 0.93, y: 0.24, d: 1.5 },
  { x: 0.75, y: 0.86, d: 0.7 }, { x: 0.15, y: 0.95, d: 0.75 }, { x: 0.65, y: 0.7, d: 1.9 },
  { x: 0.05, y: 0.6, d: 2.2 }, { x: 0.9, y: 0.55, d: 2.1 }, { x: 0.4, y: 0.92, d: 1.3 },
];

export default function Scene() {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [62, 69], [1, 0], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // slow camera creep: a push of 4% over the scene, more on nearer layers
  const S = interpolate(frame, [0, 69], [1, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground />
      <div id="card-wall" style={{ position: "absolute", inset: 0, opacity: fadeIn * fadeOut }}>
        {WALL.map((c, i) => {
          const k = (S - 1) / c.d + 1;
          const cx = 960 + (c.x - 0.5) * 1920 * k;
          const cy = 540 + (c.y - 0.5) * 1080 * k + Math.sin((frame + i * 13) / 50) * 4;
          const scale = (0.55 / c.d) * k;
          const blur = c.d < 0.9 ? (0.9 - c.d) * 30 : c.d > 1.45 ? (c.d - 1.45) * 5 : 0;
          const wash = c.d > 1.3 ? Math.min(0.75, (c.d - 1.3) * 0.7) : c.d < 0.9 ? 0.35 : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: cx - REPLY_W / 2,
                top: cy - REPLY_H / 2,
                transform: `scale(${scale}) rotate(${(random(`rot-${i}`) - 0.5) * 3}deg)`,
                filter: blur > 0 ? `blur(${blur}px)` : undefined,
                opacity: 1 - wash,
                zIndex: Math.round(100 - c.d * 10),
              }}
            >
              <ReplyCard />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 1080, display: "flex", alignItems: "center", justifyContent: "center", opacity: fadeOut, zIndex: 200 }}>
        <TypeLine
          id="volume-line"
          segments={[{ text: "and hoping volume will " }, { text: "fix the problem", style: { color: brand.linkBlue } }]}
          startFrom={0}
          each={4}
          duration={8}
          style={{ fontSize: 60 }}
        />
      </div>
    </AbsoluteFill>
  );
}
