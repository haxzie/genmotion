import { AbsoluteFill, useCurrentFrame, useWindowDuration, interpolate, Easing, TextAnimation } from "@genmotion/motion";
import { CalendarCheck } from "lucide-react";
import { AgentCard, AGENT_GRADIENTS, CARD, CENTER_CARD } from "../components/AgentCard";
import { brand, headline } from "../components/brand";

// Beat 8 — black. The line pops in word by word inside a thin rounded frame;
// the words blur away and the frame collapses into the receptionist card.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();

  const frameIn = interpolate(frame, [12, 36], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const collapse = interpolate(frame, [end - 32, end - 4], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fill = interpolate(frame, [end - 18, end - 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const start = { left: 120, top: 130, w: 1680, h: 820, r: 60 };
  const left = start.left + (CENTER_CARD.left - start.left) * collapse;
  const top = start.top + (CENTER_CARD.top - start.top) * collapse;
  const w = start.w + (CARD.w - start.w) * collapse;
  const h = start.h + (CARD.h - start.h) * collapse;
  const r = start.r + (CARD.radius - start.r) * collapse;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.black }}>
      {/* Outline frame → becomes the card */}
      <div
        id="outline-frame"
        style={{
          position: "absolute",
          left,
          top,
          width: w,
          height: h,
          borderRadius: r,
          border: "1px solid rgba(255,255,255,0.75)",
          opacity: frameIn * (1 - fill),
          transform: `scale(${0.985 + frameIn * 0.015})`,
        }}
      />
      {fill > 0 && (
        <AgentCard
          id="card-receptionist"
          icon={CalendarCheck}
          title="Receptionist agent"
          sub="Full appointment booking system"
          gradient={AGENT_GRADIENTS.receptionist}
          textOpacity={0}
          style={{ left: CENTER_CARD.left, top: CENTER_CARD.top, opacity: fill }}
        />
      )}

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h1 id="stop-missing" style={{ ...headline, margin: 0, fontSize: 64, color: brand.white }}>
          <TextAnimation text="Stop missing calls and opportunities" by="word" preset="fadeIn" startFrom={4} stagger={7} duration={2} exit={{ at: end - 68, duration: 8 }} hold="breathe" />
        </h1>
      </div>
    </AbsoluteFill>
  );
}
