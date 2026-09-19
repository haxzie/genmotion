import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, random } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { ParticleRing } from "../components/ParticleRing";

// Scene 19 — ref 57.4–61.7s (129f). Speed streaks, "3-5x" slams in from
// the right, the camera pans to reveal "more", which zooms past the lens;
// then "[replies] and [demos]" — the replies pill arrives with fire wings,
// the demos pill bursts out of a particle ring, and a field of blurred
// pills drifts at depth behind them.

const PILL = "#f4533f";

function Pill({ text, scale = 1, rot = 0, blur = 0, opacity = 1, size = 60, id }: { text: string; scale?: number; rot?: number; blur?: number; opacity?: number; size?: number; id?: string }) {
  return (
    <div
      id={id}
      style={{
        display: "inline-block",
        transform: `rotate(${rot}deg) scale(${scale})`,
        backgroundColor: PILL,
        color: "#fff",
        fontFamily: brand.font,
        fontWeight: 600,
        fontSize: size,
        padding: `${size * 0.32}px ${size * 1.05}px`,
        borderRadius: 999,
        boxShadow: "0 18px 40px rgba(244,83,63,0.3)",
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        opacity,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

const BG_PILLS = [
  { text: "replies", x: 0.18, y: 0.26, d: 1.3, rot: -8 },
  { text: "demos", x: 0.78, y: 0.26, d: 1.2, rot: 6 },
  { text: "replies", x: 0.27, y: 0.77, d: 1.15, rot: -4 },
  { text: "demos", x: 0.74, y: 0.82, d: 1.05, rot: 12 },
  { text: "replies", x: 0.02, y: 0.52, d: 1.9, rot: 5 },
  { text: "demos", x: 0.98, y: 0.6, d: 1.7, rot: -10 },
  { text: "demos", x: 0.93, y: 0.02, d: 0.7, rot: -30 },
  { text: "replies", x: 0.55, y: 1.02, d: 0.8, rot: 20 },
];

export default function Scene() {
  const frame = useCurrentFrame();

  // big headline: slides in from the right, pans left to reveal "more", zooms past
  const slide = interpolate(frame, [3, 12], [1400, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pan = interpolate(frame, [24, 45], [0, -1215], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoom = interpolate(frame, [45, 51], [1, 3.2], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bigOut = interpolate(frame, [47, 51], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const motionBlur = interpolate(frame, [3, 6, 12, 24, 30, 40, 45, 51], [14, 8, 0, 0, 8, 6, 0, 16], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // pills beat
  const replies = interpolate(frame, [51, 60], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wings = interpolate(frame, [51, 56, 66, 74], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const and = interpolate(frame, [57, 63], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const demos = interpolate(frame, [63, 72], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bgIn = interpolate(frame, [54, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [122, 129], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = interpolate(frame, [54, 129], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} />

      {/* speed streaks */}
      {frame < 52 &&
        Array.from({ length: 16 }).map((_, i) => {
          const top = i % 2 === 0 ? random(`sy-${i}`) * 260 : 800 + random(`sy-${i}`) * 260;
          const len = 200 + random(`sl-${i}`) * 500;
          const speed = 40 + random(`ss-${i}`) * 50;
          const x = ((2600 - ((frame + 3) * speed + random(`sx-${i}`) * 2600)) % 2600) - 600;
          const a = interpolate(frame, [-3, 3, 40, 50], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <div key={i} style={{ position: "absolute", left: x, top, width: len, height: 8, borderRadius: 4, background: `linear-gradient(90deg, transparent, ${i % 3 === 0 ? "#f4562f" : "#f9a83a"})`, opacity: a * 0.9 }} />;
        })}

      {/* 3-5x more */}
      {bigOut > 0 && (
        <div
          id="big-more"
          style={{
            position: "absolute",
            top: 540,
            left: 700 + slide + pan,
            transform: `translate(0, -50%) scale(${zoom})`,
            transformOrigin: "1500px 50%",
            fontFamily: brand.font,
            fontWeight: 600,
            fontSize: 330,
            letterSpacing: "-0.03em",
            whiteSpace: "nowrap",
            backgroundImage: "linear-gradient(90deg, #f0403a 0%, #f66130 40%, #f9a83a 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: motionBlur > 0 ? `blur(${motionBlur}px)` : undefined,
            opacity: bigOut,
          }}
        >
          3-5x more
        </div>
      )}

      {/* background pill field */}
      <div style={{ position: "absolute", inset: 0, opacity: bgIn * (1 - exit) }}>
        {BG_PILLS.map((p, i) => {
          const k = 1 + drift * 0.08 / p.d;
          const x = 960 + (p.x - 0.5) * 1920 * k + Math.sin((frame + i * 30) / 40) * 10;
          const y = 540 + (p.y - 0.5) * 1080 * k + Math.cos((frame + i * 17) / 36) * 8;
          const blur = p.d < 0.9 ? 14 : p.d > 1.5 ? 6 : 3;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)" }}>
              <Pill text={p.text} scale={1 / p.d} rot={p.rot} blur={blur} opacity={p.d < 0.9 ? 0.7 : 0.75} />
            </div>
          );
        })}
      </div>

      {/* foreground: [replies] and [demos] */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 1080, display: "flex", alignItems: "center", justifyContent: "center", gap: 30, opacity: 1 - exit, filter: exit > 0 ? `blur(${exit * 14}px)` : undefined }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: -150, top: -30, fontSize: 130, opacity: wings, transform: `scaleX(-1) scale(${0.6 + wings * 0.5})`, filter: "blur(0.5px)" }}>🔥</span>
          <span style={{ position: "absolute", right: -150, top: -30, fontSize: 130, opacity: wings, transform: `scale(${0.6 + wings * 0.5})`, filter: "blur(0.5px)" }}>🔥</span>
          <Pill id="replies-pill" text="replies" scale={replies} rot={-4} />
        </div>
        <span style={{ fontFamily: brand.font, fontWeight: 600, fontSize: 60, color: brand.text, opacity: and, transform: `translateY(${(1 - and) * 10}px)`, margin: "0 10px" }}>and</span>
        <div style={{ position: "relative" }}>
          <Pill id="demos-pill" text="demos" scale={demos} rot={5} />
        </div>
      </div>
      <ParticleRing id="demos-burst" t={frame - 60} cx={1190} cy={560} radius={170} count={34} seed="demos" />
    </AbsoluteFill>
  );
}
