import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { Briefcase, MessageCircle, Megaphone } from "lucide-react";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";

// Scene 15 — ref 40.4–46.8s (192f). "to spot actions that indicate intent
// like" types at centre; then three polaroid-style signal cards arrive one
// at a time from the right (job changes → competitor interactions →
// meaningful engagement), each pushing the earlier ones left.

const CARD_W = 495;
const CARD_H = 585;

const CARDS = [
  { label: "job changes", Icon: Briefcase, at: 69, rot: -8, stops: [[1000, 600], [700, 590], [322, 592]] },
  { label: "competitor interactions", Icon: MessageCircle, at: 96, rot: -5, stops: [[1100, 560], [1100, 560], [592, 518]] },
  { label: "meaningful engagement", Icon: Megaphone, at: 144, rot: 8, stops: [[1125, 600], [1125, 600], [1125, 600]] },
];
const SHIFTS = [96, 144]; // frames at which a new card pushes the others left

export default function Scene() {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [186, 192], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} />

      <div style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 1080, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TypeLine id="intent-line" segments={[{ text: "to spot actions that indicate " }, { text: "intent like", style: orangeText, by: "char" }]} startFrom={0} each={5} duration={8} exitAt={72} exitDuration={7} float style={{ fontSize: 52 }} />
      </div>

      {CARDS.map((c, i) => {
        const pop = interpolate(frame, [c.at, c.at + 12], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        // which stop are we heading to
        const s1 = interpolate(frame, [SHIFTS[0], SHIFTS[0] + 12], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const s2 = interpolate(frame, [SHIFTS[1], SHIFTS[1] + 12], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const [a, b, d] = c.stops;
        const x = a[0] + (b[0] - a[0]) * s1 + (d[0] - b[0]) * s2;
        const y = a[1] + (b[1] - a[1]) * s1 + (d[1] - b[1]) * s2;
        const bob = Math.sin((frame + i * 30) / 26) * 5;
        if (frame < c.at) return null;
        return (
          <div
            key={i}
            id={`signal-${i}`}
            style={{
              position: "absolute",
              left: x - CARD_W / 2,
              top: y - CARD_H / 2 + bob,
              width: CARD_W,
              height: CARD_H,
              borderRadius: 26,
              backgroundColor: "#fff",
              boxShadow: "0 30px 70px rgba(120,40,20,0.16)",
              transform: `rotate(${c.rot}deg) scale(${pop})`,
              opacity: (1 - exit) * Math.min(1, pop * 1.5),
              filter: exit > 0 ? `blur(${exit * 10}px)` : undefined,
              padding: 26,
              boxSizing: "border-box",
              fontFamily: brand.font,
              zIndex: i,
            }}
          >
            <div style={{ height: 400, borderRadius: 18, backgroundColor: "#f6f6f6", border: "2px solid #ededed", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <c.Icon size={130} color="#2b3140" strokeWidth={1.6} />
            </div>
            <div style={{ marginTop: 26, textAlign: "center", fontSize: 30, fontWeight: 500, color: brand.text, whiteSpace: "nowrap" }}>{c.label}</div>
            <div style={{ position: "absolute", right: -18, top: -18, width: 44, height: 44, borderRadius: 22, backgroundColor: brand.coral, boxShadow: "0 6px 16px rgba(245,91,90,0.4)", transform: `scale(${1 + Math.sin(frame / 4) * 0.06})` }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
