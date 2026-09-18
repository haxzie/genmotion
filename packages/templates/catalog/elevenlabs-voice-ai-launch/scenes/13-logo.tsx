import { AbsoluteFill, Img, useCurrentFrame, useWindowDuration, interpolate, Easing, TextAnimation } from "@genmotion/motion";
import { AGENT_GRADIENTS } from "../components/AgentCard";
import { brand } from "../components/brand";
import elevenMark from "../assets/elevenlabs-white.svg";

const BAR = { left: 100, top: 526, h: 28, w: 1720 };
const SEGMENTS = [AGENT_GRADIENTS.informational, AGENT_GRADIENTS.receptionist, AGENT_GRADIENTS.reservation];

// Beat 10 — the gradient bar thins to a line and gives way to the wordmark.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const thin = interpolate(frame, [0, 18], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const h = BAR.h * (1 - thin) + 1;
  const glow = interpolate(Math.sin(frame * 0.07), [-1, 1], [0.12, 0.22]);
  const subIn = interpolate(frame, [24, 36], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOut = interpolate(frame, [end - 16, end - 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const segW = BAR.w / 3;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.black }}>
      {SEGMENTS.map((g, i) => (
        <div key={i} style={{ position: "absolute", left: BAR.left + i * segW, top: BAR.top + (BAR.h - h) / 2, width: segW, height: h, background: g, opacity: 1 - thin, borderRadius: 2 }} />
      ))}

      {/* soft pool of light behind the mark */}
      <div style={{ position: "absolute", left: 560, top: 380, width: 800, height: 320, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(255,255,255,${glow}) 0%, rgba(255,255,255,0) 100%)`, opacity: subIn }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <h1 id="wordmark" style={{ margin: 0, fontFamily: brand.font, fontWeight: 400, fontSize: 96, letterSpacing: "-0.03em", lineHeight: 1, display: "flex" }}>
          <span style={{ color: brand.white }}>
            <TextAnimation text="Reception" by="char" preset="blurIn" startFrom={10} stagger={2} duration={10} exit="auto" />
          </span>
          <span style={{ color: brand.whiteMuted }}>
            <TextAnimation text=".ai" by="char" preset="blurIn" startFrom={26} stagger={2} duration={10} exit="auto" />
          </span>
        </h1>
        <div
          id="eleven-agents"
          style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, opacity: subIn * subOut, transform: `translateY(${(1 - subIn) * 8}px)`, alignSelf: "center", marginLeft: 300 }}
        >
          <Img src={elevenMark} style={{ height: 26, width: "auto" }} />
          <span style={{ fontFamily: brand.font, fontSize: 28, fontWeight: 500, color: brand.white }}>ElevenLabs</span>
          <span style={{ fontFamily: brand.font, fontSize: 28, color: brand.whiteMuted }}>Agents</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}
