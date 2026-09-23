import { AbsoluteFill, useCurrentFrame, interpolate, Easing, random } from "@genmotion/motion";
import { Mic } from "lucide-react";
import { C, FONT, clamp } from "../components/brand";
import { mix } from "../components/BlurWord";
import { Cursor } from "../components/Cursor";
import { glide } from "../components/glide";

// 1.83–4.17s — inside the mic: waveform pill, caption, then "Your idea".
// Opens on exactly the framing scene 01 pushed into (disc at 1000,500 · 627px).
const D = 627;
const Y = 500;
const BARS = 16;

export default function Scene() {
  const f = useCurrentFrame();

  // Disc centre: slow drift left, then a fast slide as "Your idea" takes over.
  // glide: continuous through the keys (per-segment easing stopped it dead at 30 and 40).
  const mx = glide(f, [0, 30, 40, 54], [1000, 820, 144, -520], { easeOut: false });
  const pillW = glide(f, [0, 8, 30, 40], [D, D + 1700, D + 1700, 760]);
  const pressed = interpolate(f, [2, 9], [1, 0], clamp);
  const toNavy = interpolate(f, [32, 40], [0, 1], clamp);
  const barsOn = interpolate(f, [0, 6, 28, 36], [0, 1, 1, 0], clamp);

  const cap = interpolate(f, [34, 39], [1, 0], clamp);
  const curY = glide(f, [0, 6, 14], [590, 620, 1240], { easeOut: false }); // drops out of frame, still moving
  const curX = interpolate(f, [0, 14], [1030, 980], clamp);

  // "Your idea"
  const tx = glide(f, [38, 52, 66], [680, 225, -420], { easeOut: false }); // no mid-slide stop at 52
  const tOut = interpolate(f, [55, 66], [0, 1], { ...clamp, easing: Easing.inCubic });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* "just" — continuing from scene 01 at 3.8× */}
      <div
        id="w-just-big"
        style={{
          position: "absolute", right: 1920 - (mx - 456), top: Y - 330, fontFamily: FONT.humanist,
          fontSize: 464, lineHeight: 1.2, color: C.navy, letterSpacing: "0.01em", whiteSpace: "pre",
        }}
      >
        just
      </div>

      {/* Pill grows out of the pressed mic disc */}
      <div
        id="voice-pill"
        style={{
          position: "absolute", left: mx - D / 2, top: Y - D / 2, width: pillW, height: D, borderRadius: D / 2,
          backgroundColor: "#ffffff",
          boxShadow: "0 40px 70px rgba(110,165,240,0.28), 0 6px 18px rgba(0,0,0,0.03)",
        }}
      />
      <div
        style={{
          position: "absolute", left: mx - D / 2, top: Y - D / 2, width: D, height: D, borderRadius: "50%",
          backgroundColor: "#dbeafc", opacity: pressed,
        }}
      />
      <div id="mic-icon" style={{ position: "absolute", left: mx - 130, top: Y - 130, width: 260, height: 260 }}>
        <Mic size={260} strokeWidth={2.2} color={mix("#a8cdf6", C.navy, toNavy)} />
      </div>

      {/* Waveform */}
      {Array.from({ length: BARS }, (_, i) => {
        const phase = random("ph" + i) * Math.PI * 2;
        const amp = 0.35 + random("a" + i) * 0.65;
        const h = 70 + amp * 260 * (0.55 + 0.45 * Math.sin(f * 0.45 + phase));
        const appear = interpolate(f, [i * 0.6, i * 0.6 + 5], [0, 1], clamp);
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: mx + 270 + i * 52, top: Y - (h * appear) / 2, width: 24, height: h * appear,
              borderRadius: 12, backgroundColor: "#a9cbf5",
              opacity: barsOn * interpolate(i, [0, BARS - 1], [1, 0.55]),
            }}
          />
        );
      })}

      {/* Transcription chip */}
      <div
        id="caption-chip"
        style={{
          position: "absolute", left: 960, top: 903, transform: "translate(-50%, -50%)", opacity: cap,
          backgroundColor: "#6e6e72", color: "#ffffff", fontFamily: FONT.sans, fontSize: 38,
          padding: "6px 14px", borderRadius: 10, whiteSpace: "nowrap",
        }}
      >
        Can you build me an app?
      </div>

      <Cursor x={curX} y={curY} size={230} rotate={-8} />

      {/* Your idea — letters resolve out of blur, then the line slides out left */}
      <div
        id="your-idea"
        style={{
          position: "absolute", left: tx, top: 540 - 200, display: "flex", fontFamily: FONT.sans, fontSize: 330,
          lineHeight: 1.2, letterSpacing: "-0.02em", whiteSpace: "pre",
          filter: `blur(${tOut * 18}px)`, opacity: 1 - interpolate(tOut, [0.5, 1], [0, 1], clamp),
        }}
      >
        {"Your idea".split("").map((ch, i) => {
          const s = 38 + i * 1.6;
          const p = interpolate(f, [s, s + 10], [0, 1], { ...clamp, easing: Easing.outSmooth });
          return (
            <span
              key={i}
              style={{
                opacity: interpolate(p, [0, 0.4], [0, 1], clamp), filter: `blur(${(1 - p) * 14}px)`,
                color: mix("#8aa2c4", C.navy, interpolate(f, [s + 3, s + 14], [0, 1], clamp)),
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
