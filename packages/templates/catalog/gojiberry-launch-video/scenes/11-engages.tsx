import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { Radar } from "../components/Radar";
import { StepCard } from "../components/StepCard";
import { AVATARS } from "../components/MiniCard";

// Scene 11 — ref 26.3–30.4s (123f). Opens on Ethan inside his small ring
// (where 10 left him). Two step cards pop in on the left joined to him by a
// dashed connector; "engages them at the right moment with / personalized
// LinkedIn outreach" types above. Everything slides out left at the end.

const ETHAN = { x: 1495, y: 648 };

export default function Scene() {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [114, 123], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ex = -exit * 700;
  const c1 = interpolate(frame, [3, 14], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const c2 = interpolate(frame, [12, 24], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wire = interpolate(frame, [12, 30], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bob = Math.sin(frame / 20) * 3;

  // dashed connector path: card1 right edge → corner → Ethan's ring
  const path = `M 602 510 H 1060 V 655 H 1290`;
  const pathLen = 458 + 145 + 230;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} />

      <div style={{ position: "absolute", inset: 0, transform: `translateX(${ex}px)`, filter: exit > 0 ? `blur(${exit * 8}px)` : undefined }}>
        <Radar id="ethan-ring" t={frame + 7} cx={ETHAN.x} cy={ETHAN.y} radii={[98, 150, 198]} light />
        <div id="ethan" style={{ position: "absolute", left: ETHAN.x - 72, top: ETHAN.y - 72 + bob, width: 144, height: 144, borderRadius: 72, overflow: "hidden", boxShadow: "0 12px 30px rgba(120,40,20,0.22)" }}>
          <Img src={AVATARS[2]} style={{ width: 144, height: 144, display: "block" }} />
        </div>

        <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
          <path d={path} fill="none" stroke="#f3b9ad" strokeWidth={3} strokeDasharray="14 12" strokeDashoffset={pathLen * (1 - wire)} pathLength={pathLen} opacity={wire > 0 ? 1 : 0} />
        </svg>

        <div id="step-1" style={{ position: "absolute", left: 141, top: 442 + bob * 0.5, transform: `scale(${c1}) translateX(${(1 - c1) * -80}px)`, transformOrigin: "0 50%", opacity: Math.min(1, c1 * 1.5) }}>
          <StepCard title="Send Invitation" step={1} icon="invite" />
        </div>
        <div id="step-2" style={{ position: "absolute", left: 372, top: 655 - bob * 0.5, transform: `scale(${c2}) translateX(${(1 - c2) * -80}px)`, transformOrigin: "0 50%", opacity: Math.min(1, c2 * 1.5) }}>
          <StepCard title="Send Message" step={2} icon="message" />
        </div>
      </div>

      <div style={{ position: "absolute", top: 96, left: 0, width: 1920, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transform: `translateX(${ex * 0.6}px)`, opacity: 1 - exit }}>
        <TypeLine id="engages-line" segments={[{ text: "engages them at the right moment with" }]} startFrom={9} each={5} duration={8} style={{ fontSize: 58 }} />
        <TypeLine id="engages-line-2" segments={[{ text: "personalized LinkedIn outreach", style: orangeText }]} startFrom={63} each={9} duration={10} style={{ fontSize: 58 }} />
      </div>
    </AbsoluteFill>
  );
}
