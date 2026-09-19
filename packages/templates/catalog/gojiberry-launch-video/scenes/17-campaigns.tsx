import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { UserPlus, Send } from "lucide-react";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { TypeLine } from "../components/TypeLine";

// Scene 17 — ref 50.4–54.7s (129f). Opens on the purple Step-1 card left
// by scene 16, on a white dot-grid. Step cards appear left→right on a
// dashed rail while "automatically create and launch" types; the camera
// pans left along the rail as "personalized outreach campaigns" types
// further down the world. Everything blurs off at the end.

const CARD_W = 480;
const GAP = 140;
const RAIL_Y = 410; // header bottom = where the dashed rail runs
const STEPS = [
  { title: "Send Invitation", step: 1, color: brand.purple, Icon: UserPlus, chips: ["97 contact(s)", "9 answer(s)"], msg: null as string | null, at: 0 },
  { title: "Send Message", step: 2, color: brand.stepBlue, Icon: Send, chips: ["19 contact(s)", "9 answer(s)"], msg: "AI Personalized Message", at: 9 },
  { title: "Send Message", step: 3, color: brand.stepSky, Icon: Send, chips: ["125 contact(s)", "39 answer(s)"], msg: "{FirstName}, we booked 12 demos in 5 days using…", at: 18 },
  { title: "Send Message", step: 4, color: brand.stepSky, Icon: Send, chips: ["83 contact(s)", "21 answer(s)"], msg: "Hey {FirstName}, anywhere in a text to see what we do…", at: 27 },
  { title: "Send Message", step: 5, color: brand.stepSky, Icon: Send, chips: ["52 contact(s)", "12 answer(s)"], msg: "Cheers {FirstName}", at: 36 },
];

function Chip({ text, green = false }: { text: string; green?: boolean }) {
  return <span style={{ fontSize: 20, padding: "8px 18px", borderRadius: 999, backgroundColor: green ? "#e5f8ec" : "#eef0f3", color: green ? "#1e9e5a" : "#6b6f7a", whiteSpace: "nowrap" }}>{text}</span>;
}

export default function Scene() {
  const frame = useCurrentFrame();
  const pan = interpolate(frame, [90, 114], [0, -930], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const panBlur = interpolate(frame, [90, 96, 102, 108, 114], [0, 6, 8, 6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [124, 129], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tiltX = interpolate(frame, [0, 24], [22, 14], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tiltY = interpolate(frame, [0, 24], [-18, -10], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#fdfdfd", overflow: "hidden" }}>
      <Fonts />
      {/* dot grid, panning with the world at half speed */}
      <div style={{ position: "absolute", inset: -200, backgroundImage: "radial-gradient(#d9dbe0 2px, transparent 2.5px)", backgroundSize: "56px 56px", transform: `translateX(${pan * 0.5}px)`, opacity: 0.9 }} />

      {/* the whole rail sits on a plane tilted back and yawed to the left,
          settling from a stronger tilt as the scene opens */}
      <div style={{ position: "absolute", inset: 0, perspective: 2600, perspectiveOrigin: "50% 40%" }}>
      <div id="campaign-world" style={{ position: "absolute", inset: 0, transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateX(${pan}px) scale(${1 + exit * 0.2})`, transformOrigin: "50% 50%", transformStyle: "preserve-3d", filter: panBlur + exit > 0 ? `blur(${panBlur + exit * 14}px)` : undefined, opacity: 1 - exit }}>
        {/* rail */}
        <div style={{ position: "absolute", left: 0, top: RAIL_Y, width: 4000, height: 0, borderTop: "3px dashed #c9ccd3" }} />

        {STEPS.map((s, i) => {
          const p = interpolate(frame, [s.at, s.at + 10], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const left = 160 + i * (CARD_W + GAP);
          return (
            <div key={i} id={`campaign-step-${i + 1}`} style={{ position: "absolute", left, top: 300, width: CARD_W, borderRadius: 18, overflow: "hidden", backgroundColor: "#fff", boxShadow: brand.cardShadow, fontFamily: brand.font, opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
              <div style={{ height: 110, background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`, display: "flex", alignItems: "center", padding: "0 28px", gap: 20 }}>
                <div style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.Icon size={26} color="#fff" strokeWidth={2} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 28, fontWeight: 500, color: "#fff" }}>{s.title}</span>
                  <span style={{ fontSize: 20, color: "rgba(255,255,255,0.85)" }}>Step {s.step}</span>
                </div>
              </div>
              <div style={{ padding: "26px 28px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
                {s.msg && s.step >= 3 && (
                  <>
                    <span style={{ fontSize: 18, color: "#9a9ea8", letterSpacing: "0.06em" }}>MESSAGE:</span>
                    <div style={{ borderRadius: 12, backgroundColor: "#f5f6f8", padding: "18px 20px", fontSize: 22, lineHeight: 1.45, color: "#6b6f7a", minHeight: 110 }}>{s.msg}</div>
                  </>
                )}
                {s.msg && s.step < 3 && <span style={{ fontSize: 20, color: "#6b6f7a" }}>{s.msg}</span>}
                {!s.msg && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ width: 300, height: 12, borderRadius: 6, backgroundColor: "#e9eaee" }} />
                    <div style={{ width: 220, height: 12, borderRadius: 6, backgroundColor: "#e9eaee" }} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 14 }}>
                  <Chip text={s.chips[0]} />
                  <Chip text={s.chips[1]} green />
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ flex: 1, height: 48, borderRadius: 10, border: "2px solid #eef0f3", display: "flex", alignItems: "center", padding: "0 16px" }}>
                    <div style={{ width: 110, height: 10, borderRadius: 5, background: "linear-gradient(90deg, #2d2f36, #d9dbe0)" }} />
                  </div>
                  <div style={{ flex: 1, height: 48, borderRadius: 10, border: "2px solid #eef0f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 30, height: 10, borderRadius: 5, backgroundColor: "#2d2f36" }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* copy lives in the world so it pans with the rail */}
        <div style={{ position: "absolute", left: 250, top: 190, whiteSpace: "pre" }}>
          <TypeLine id="campaign-line" segments={[{ text: "automatically " }, { text: "create", style: orangeText }, { text: " and " }, { text: "launch", style: orangeText }]} startFrom={3} each={9} duration={10} style={{ fontSize: 48 }} />
        </div>
        <div style={{ position: "absolute", left: 1360, top: 150, whiteSpace: "pre" }}>
          <TypeLine id="campaign-line-2" segments={[{ text: "personalized " }, { text: "outreach campaigns", style: orangeText }]} startFrom={93} each={8} duration={10} style={{ fontSize: 48 }} />
        </div>
      </div>
      </div>
    </AbsoluteFill>
  );
}
