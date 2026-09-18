import React from "react";
import { AbsoluteFill, useCurrentFrame, useWindowDuration, interpolate, Easing } from "@genmotion/motion";
import { Mesh } from "../components/Mesh";
import { Orb } from "../components/Orb";
import { brand } from "../components/brand";

const PREV_LEN = 75;
const AVATAR = { x: 540, y: 410, size: 44 };

// Beat 7 — the receptionist takes the call. Glass bubbles type themselves out
// over the blurred mesh; everything then dims down to black for the close.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const dim = interpolate(frame, [end - 20, end - 4], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - dim }}>
        <Mesh frame={frame + PREV_LEN} />
      </div>
      {/* Vignette so the type always sits on a dark enough field */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(1200px 800px at 50% 45%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.5) 100%)", opacity: 1 - dim }} />

      <div style={{ position: "absolute", inset: 0, opacity: 1 - dim, filter: `blur(${dim * 12}px)` }}>
        <Bubble frame={frame} at={0} x={590} y={350} who="Reception" text="Hi there. How can I help you today?" id="bubble-1" />
        <Bubble frame={frame} at={68} x={980} y={490} who="You" text={"Hey, I'm looking to book an\nappointment for next week, please?"} id="bubble-2" right />
        <Bubble frame={frame} at={172} x={590} y={690} who="Reception" text="Sure! When would be a good time for you?" id="bubble-3" />

        <div style={{ position: "absolute", left: AVATAR.x - AVATAR.size / 2, top: AVATAR.y - AVATAR.size / 2 }}>
          <Orb id="orb" frame={frame + 150} size={AVATAR.size} glow={0.4} />
        </div>
        {frame >= 172 && (
          <div style={{ position: "absolute", left: AVATAR.x - AVATAR.size / 2, top: 750 - AVATAR.size / 2, opacity: interpolate(frame, [172, 178], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <Orb id="orb-2" frame={frame + 90} size={AVATAR.size} glow={0.4} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

function Bubble({ frame, at, x, y, who, text, id, right = false }: { frame: number; at: number; x: number; y: number; who: string; text: string; id: string; right?: boolean }) {
  if (frame < at) return null;
  const f = frame - at;
  const inP = interpolate(f, [0, 10], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // ~0.66 chars/frame keeps the typing in step with the spoken line on the timeline
  const typed = Math.min(text.length, Math.max(0, Math.floor((f - 6) * 0.66)));
  const shown = text.slice(0, typed);
  const caretOn = typed < text.length && Math.floor(f / 8) % 2 === 0;
  return (
    <div id={id} style={{ position: "absolute", left: x, top: y, opacity: inP, transform: `translateY(${(1 - inP) * 14}px) scale(${0.96 + inP * 0.04})`, transformOrigin: right ? "top right" : "top left" }}>
      <div style={{ fontFamily: brand.font, fontSize: 28, color: "#d6dfd2", marginBottom: 10, marginLeft: 22, textAlign: right ? "right" : "left", marginRight: 22 }}>{who}</div>
      <div
        style={{
          position: "relative",
          padding: "22px 34px",
          borderRadius: 22,
          backgroundColor: "rgba(20,30,20,0.42)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.35)",
          fontFamily: brand.font,
          fontSize: 34,
          lineHeight: 1.35,
          color: "#ffffff",
          whiteSpace: "pre",
        }}
      >
        {/* Reserve the full box so the bubble never reflows while typing */}
        <span style={{ visibility: "hidden" }}>{text}</span>
        <span style={{ position: "absolute", left: 34, top: 22 }}>
          {shown}
          <span style={{ opacity: caretOn ? 1 : 0 }}>|</span>
        </span>
      </div>
    </div>
  );
}
