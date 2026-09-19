import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { ParticleRing } from "../components/ParticleRing";
import { AVATARS } from "../components/MiniCard";
import mark from "../assets/strawberry-mark.png";

// Scene 13 — ref 35.0–38.2s (96f). A burst leaves the mark at centre; three
// lead cards pop up around it on a plane tilted −8°, joined by dashed
// connectors; "and clearly defines who you should target" types above.
// Cards scatter outward at the end.

const LEADS = [
  { name: "Jasper Krog", role: "CMO", a: 4, x: 638, y: 405, at: 12, path: "M 880 405 H 960 V 500", len: 175 },
  { name: "Petra Sievinen", role: "Head of Paid Acquisition", a: 5, x: 435, y: 862, at: 21, path: "M 680 830 H 940 V 716", len: 374 },
  { name: "Julie Sockeel", role: "Creative Strategist", a: 0, x: 1522, y: 705, at: 30, path: "M 1068 608 H 1150 V 705 H 1275", len: 304 },
];

export default function Scene() {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [90, 96], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const markIn = interpolate(frame, [3, 14], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tilt = interpolate(frame, [0, 96], [-7, -9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} />

      <div style={{ position: "absolute", inset: 0, transform: `rotate(${tilt}deg) scale(${1 + exit * 0.15})`, transformOrigin: "50% 56%", filter: exit > 0 ? `blur(${exit * 10}px)` : undefined, opacity: 1 - exit }}>
        <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
          {LEADS.map((l, i) => {
            const p = interpolate(frame, [l.at + 6, l.at + 20], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return <path key={i} d={l.path} fill="none" stroke="#f3a99b" strokeWidth={3} strokeDasharray="12 10" style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }} opacity={p > 0 ? 1 : 0} />;
          })}
        </svg>

        {/* mark disc */}
        <div id="target-mark" style={{ position: "absolute", left: 960 - 108, top: 608 - 108, width: 216, height: 216, borderRadius: 108, backgroundColor: "#fff", boxShadow: "0 16px 40px rgba(220,90,60,0.18), 0 6px 0 #f3d9d1", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${markIn})` }}>
          <Img src={mark} style={{ width: 108, height: "auto" }} />
        </div>

        {LEADS.map((l, i) => {
          const p = interpolate(frame, [l.at, l.at + 12], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const bob = Math.sin((frame + i * 25) / 24) * 4;
          return (
            <div
              key={i}
              id={`lead-${i}`}
              style={{
                position: "absolute",
                left: l.x - 248,
                top: l.y - 82 + bob,
                width: 495,
                height: 165,
                transform: `scale(${p})`,
                opacity: Math.min(1, p * 1.4),
              }}
            >
              {/* extruded base */}
              <div style={{ position: "absolute", left: 0, top: 14, width: 495, height: 165, borderRadius: 18, backgroundColor: "#eadfda" }} />
              <div style={{ position: "absolute", left: 0, top: 0, width: 495, height: 165, borderRadius: 18, backgroundColor: "#fff", boxShadow: "0 20px 44px rgba(120,40,20,0.14)", display: "flex", alignItems: "center", gap: 26, padding: "0 34px", boxSizing: "border-box", fontFamily: brand.font }}>
                <Img src={AVATARS[l.a]} style={{ width: 72, height: 72, borderRadius: 36, flex: "none" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 600, color: brand.coral }}>{l.name}</span>
                  <span style={{ fontSize: 22, color: "#9a9ea8" }}>{l.role}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 18, color: "#b5b8c0" }}>@</span>
                    <div style={{ width: 180, height: 10, borderRadius: 5, backgroundColor: "#ececea" }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ParticleRing id="target-burst" t={frame} cx={960} cy={608} radius={190} count={36} seed="target" />

      <div style={{ position: "absolute", top: 130, left: 0, width: 1920, display: "flex", justifyContent: "center", transform: `rotate(${tilt}deg)`, opacity: 1 - exit }}>
        <TypeLine id="target-line" segments={[{ text: "and clearly defines who you should " }, { text: "target", style: orangeText, by: "char" }]} startFrom={9} each={5} duration={8} style={{ fontSize: 52 }} />
      </div>
    </AbsoluteFill>
  );
}
