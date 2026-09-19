import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { Radar } from "../components/Radar";
import { AVATARS } from "../components/MiniCard";
import mark from "../assets/strawberry-mark.png";

// Scene 10 — ref 23.6–26.3s (81f). Rings radiate from the mark at the
// bottom; six prospects pop up across them; "detects high-intent people in
// your market" types above. On the way out everything fades except Ethan,
// who drifts right to where scene 11 opens on him.

export const ETHAN_END = { x: 1495, y: 648 };
const AVS = [
  { x: 548, y: 510, a: 0 },
  { x: 848, y: 605, a: 1 },
  { x: 1130, y: 488, a: 2 }, // Ethan
  { x: 1420, y: 582, a: 3 },
  { x: 1268, y: 785, a: 4 },
  { x: 622, y: 888, a: 5 },
];

export default function Scene() {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [72, 80], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ethanMove = interpolate(frame, [72, 81], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} />
      <Radar id="radar" t={frame} cx={960} cy={885} opacity={1 - exit} />

      {/* mark in its white disc */}
      <div id="radar-mark" style={{ position: "absolute", left: 960 - 85, top: 885 - 85, width: 170, height: 170, borderRadius: 85, backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(220,90,60,0.18)", opacity: 1 - exit, transform: `scale(${interpolate(frame, [0, 10], [0.6, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>
        <Img src={mark} style={{ width: 84, height: "auto" }} />
      </div>

      {AVS.map((v, i) => {
        const p = interpolate(frame, [12 + i * 3, 24 + i * 3], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const isEthan = i === 2;
        const x = isEthan ? v.x + (ETHAN_END.x - v.x) * ethanMove : v.x;
        const y = isEthan ? v.y + (ETHAN_END.y - v.y) * ethanMove : v.y;
        const bob = Math.sin((frame + i * 15) / 20) * 3;
        return (
          <div
            key={i}
            id={`prospect-${i}`}
            style={{
              position: "absolute",
              left: x - 57,
              top: y - 57 + bob,
              width: 114,
              height: 114,
              borderRadius: 57,
              overflow: "hidden",
              transform: `scale(${p})`,
              opacity: isEthan ? 1 : 1 - exit,
              boxShadow: "0 12px 30px rgba(120,40,20,0.22)",
              zIndex: isEthan ? 5 : 1,
            }}
          >
            <Img src={AVATARS[v.a]} style={{ width: 114, height: 114, display: "block" }} />
          </div>
        );
      })}

      {/* Ethan's own ring appears as he leaves the radar */}
      <Radar id="ethan-ring" t={frame - 74} cx={ETHAN_END.x} cy={ETHAN_END.y} radii={[98, 150, 198]} light opacity={interpolate(frame, [74, 81], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      {/* Ethan drawn again above his ring */}
      {frame >= 74 && (() => {
        const sz = 114 + 30 * ethanMove;
        const x = AVS[2].x + (ETHAN_END.x - AVS[2].x) * ethanMove;
        const y = AVS[2].y + (ETHAN_END.y - AVS[2].y) * ethanMove + Math.sin((frame + 30) / 20) * 3;
        return (
          <div style={{ position: "absolute", left: x - sz / 2, top: y - sz / 2, width: sz, height: sz, borderRadius: sz / 2, overflow: "hidden", boxShadow: "0 12px 30px rgba(120,40,20,0.22)", zIndex: 6 }}>
            <Img src={AVATARS[2]} style={{ width: sz, height: sz, display: "block" }} />
          </div>
        );
      })()}

      <div style={{ position: "absolute", top: 150, left: 0, width: 1920, display: "flex", justifyContent: "center", zIndex: 10 }}>
        <TypeLine id="detects-line" segments={[{ text: "detects high-intent people " }]} startFrom={0} each={4} duration={8} exitAt={73} exitDuration={7} style={{ fontSize: 56 }} />
        <TypeLine id="detects-line-2" segments={[{ text: "in your market", style: orangeText }]} startFrom={33} each={4} duration={8} exitAt={73} exitDuration={7} style={{ fontSize: 56 }} />
      </div>
    </AbsoluteFill>
  );
}
