import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing, random } from "@genmotion/motion";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { AVATARS } from "../components/MiniCard";
import { StepCard } from "../components/StepCard";

// Scene 16 — ref 46.8–50.4s (108f). A tilted prospects table rises while
// "AI agents score and prioritize the most" types; "active prospects"
// follows in orange as a fire sweep crosses the top rows, which then glow.
// At the end the table blurs away and the purple Step-1 card of scene 17
// resolves in its place (HANDOFF).

const ROWS = [
  { name: "Julien Moreau", role: "Head of Communications", co: "Publicis", fire: 2, a: 2 },
  { name: "Camille Fournier", role: "Brand Strategist", co: "BETC", fire: 3, a: 0 },
  { name: "Antoine Renaud", role: "Sales Director", co: "Orange", fire: 1, a: 4 },
  { name: "Sophie Lambert", role: "Growth Lead", co: "Doctolib", fire: 3, a: 1 },
  { name: "Thomas Girard", role: "Product Marketing Lead", co: "Spotify", fire: 2, a: 3 },
  { name: "Élodie Martin", role: "Digital Marketing Manager", co: "Decathlon", fire: 3, a: 5 },
  { name: "Nicolas Perrin", role: "Director of Innovation", co: "Capgemini", fire: 1, a: 4 },
  { name: "Léa Rousseau", role: "VP Marketing", co: "Back Market", fire: 2, a: 0 },
];

export const STEP1 = { left: 160, top: 300 }; // where scene 17 places its first card

export default function Scene() {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, 18], [900, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = interpolate(frame, [18, 102], [0, -40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sweep = interpolate(frame, [66, 84], [-300, 1400], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = interpolate(frame, [84, 96], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [100, 108], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stepIn = interpolate(frame, [100, 108], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1 - exit} />

      <div style={{ position: "absolute", inset: 0, perspective: 2400, perspectiveOrigin: "50% 20%", opacity: 1 - exit, filter: exit > 0 ? `blur(${exit * 14}px)` : undefined }}>
        <div
          id="prospects-table"
          style={{
            position: "absolute",
            left: -60,
            top: 440 + rise + drift,
            width: 2300,
            height: 1500,
            borderRadius: 40,
            backgroundColor: "#f4f5f8",
            boxShadow: "0 60px 120px rgba(60,30,30,0.16)",
            transform: `rotateX(40deg) rotateZ(-9deg) scale(${0.8 + exit * 0.3})`,
            transformOrigin: "40% 0%",
            overflow: "hidden",
            fontFamily: brand.font,
          }}
        >
          {/* navy sidebar */}
          <div style={{ position: "absolute", left: 0, top: 0, width: 220, height: 1500, backgroundColor: "#1e2a44" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ position: "absolute", left: 40, top: 640 + i * 44, width: 100 + i * 20, height: 10, borderRadius: 5, backgroundColor: i === 0 ? brand.orangeA : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
          {/* rows */}
          <div style={{ position: "absolute", left: 260, top: 60, width: 1980 }}>
            {ROWS.map((r, i) => {
              const p = interpolate(frame, [12 + i * 3, 24 + i * 3], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const hot = i < 3 ? glow : 0;
              return (
                <div
                  key={i}
                  style={{
                    height: 110,
                    marginBottom: 20,
                    borderRadius: 18,
                    backgroundColor: hot > 0 ? `rgba(255,${Math.round(255 - hot * 60)},${Math.round(255 - hot * 110)},1)` : "#fff",
                    boxShadow: hot > 0 ? `0 12px 40px rgba(250,90,40,${0.35 * hot})` : "0 10px 30px rgba(60,30,30,0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 40,
                    padding: "0 40px",
                    opacity: p,
                    transform: `translateY(${(1 - p) * 40}px)`,
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 5, border: "2px solid #c9ccd3" }} />
                  <Img src={AVATARS[r.a]} style={{ width: 66, height: 66, borderRadius: 33 }} />
                  <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 26, fontWeight: 500, color: brand.coral }}>{r.name}</span>
                    <span style={{ fontSize: 20, color: "#6b6f7a" }}>{r.role}</span>
                    <span style={{ fontSize: 18, color: "#9a9ea8" }}>○ {r.co}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 300 }}>
                    <div style={{ width: 220 + random(`w1-${i}`) * 60, height: 12, borderRadius: 6, background: "linear-gradient(90deg, #4b4f5a, #d9dbe0)" }} />
                    <div style={{ width: 180 + random(`w2-${i}`) * 80, height: 12, borderRadius: 6, background: "linear-gradient(90deg, #6b6f7a, #e4e6ea)" }} />
                  </div>
                  <span style={{ fontSize: 28, width: 140, letterSpacing: "-0.1em" }}>{"🔥".repeat(r.fire)}</span>
                  <div style={{ width: 90, height: 28, borderRadius: 14, backgroundColor: "#e3ebf9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 40, height: 8, borderRadius: 4, backgroundColor: "#2d3a5a" }} />
                  </div>
                  <div style={{ width: 120, height: 10, borderRadius: 5, background: "linear-gradient(90deg, #5a5e6a, #e4e6ea)" }} />
                  <div style={{ width: 100, height: 10, borderRadius: 5, background: "linear-gradient(90deg, #f4562f, #fbd3c4)" }} />
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flex", gap: 4 }}>
                    <div style={{ width: 40, height: 28, borderRadius: "8px 0 0 8px", backgroundColor: "#8fd9a8" }} />
                    <div style={{ width: 40, height: 28, backgroundColor: "#d5d7dc" }} />
                    <div style={{ width: 40, height: 28, borderRadius: "0 8px 8px 0", backgroundColor: "#f4a261" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* fire sweep across the top rows */}
          {frame >= 66 && frame <= 90 && (
            <div style={{ position: "absolute", left: sweep, top: 20, width: 700, height: 460, pointerEvents: "none" }}>
              {Array.from({ length: 18 }).map((_, i) => {
                const fx = random(`fx-${i}`) * 600;
                const fy = random(`fy-${i}`) * 380;
                const s = 0.6 + random(`fs-${i}`) * 1.2;
                const flick = 0.7 + Math.sin(frame * 1.7 + i) * 0.3;
                return (
                  <span key={i} style={{ position: "absolute", left: fx, top: fy, fontSize: 90 * s, opacity: flick, filter: "blur(1px) drop-shadow(0 0 20px rgba(255,120,0,0.8))", transform: `scaleY(${1 + Math.sin(frame + i) * 0.15})` }}>
                    🔥
                  </span>
                );
              })}
              <div style={{ position: "absolute", inset: -60, background: "radial-gradient(ellipse at 50% 60%, rgba(255,140,0,0.55) 0%, rgba(255,80,0,0.25) 40%, transparent 70%)", filter: "blur(20px)" }} />
            </div>
          )}
        </div>
      </div>

      {/* handoff: Step-1 card resolves where scene 17 starts it */}
      {stepIn > 0 && (
        <div id="step-1-handoff" style={{ position: "absolute", left: STEP1.left, top: STEP1.top, transform: `scale(${0.7 + stepIn * 0.3})`, transformOrigin: "0 0", opacity: stepIn, filter: `blur(${(1 - stepIn) * 10}px)` }}>
          <StepCard title="Send Invitation" step={1} icon="invite" color={brand.purple} style={{ width: 480, height: 380 }} />
        </div>
      )}

      <div style={{ position: "absolute", top: 100, left: 0, width: 1920, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - exit }}>
        <TypeLine id="prioritize-line" segments={[{ text: "AI agents score and prioritize the most" }]} startFrom={0} each={7} duration={8} style={{ fontSize: 56 }} />
        <TypeLine id="prioritize-line-2" segments={[{ text: "active prospects", style: orangeText }]} startFrom={63} each={8} duration={10} style={{ fontSize: 56 }} />
      </div>
    </AbsoluteFill>
  );
}
