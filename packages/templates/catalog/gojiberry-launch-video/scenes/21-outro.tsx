import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { Cursor } from "../components/Cursor";
import { ParticleRing } from "../components/ParticleRing";
import mark from "../assets/strawberry-mark.png";

// Scene 21 — ref 64.2–70.77s (197f). "Reach buyers when they are ready"
// types at centre as the background warms; the mark drops in above it,
// slides left as "strawberry" tracks in; "Try now" pops below; the cursor
// glides in from the bottom, clicks the button (orange burst) and rests
// there to the end. Nothing exits — this is the final frame.

const WORD = "strawberry";
const BTN = { x: 960, y: 732 };
const CLICK = 135;

export default function Scene() {
  const frame = useCurrentFrame();
  const warm = interpolate(frame, [0, 40], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const markDrop = interpolate(frame, [33, 43], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slide = interpolate(frame, [57, 66], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tracking = interpolate(frame, [57, 72], [0.3, 0.005], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btn = interpolate(frame, [60, 70], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnChars = Math.max(0, Math.min(7, Math.floor((frame - 62) / 1.5)));

  // cursor: from below the frame to the button's lower-left, click, rest
  const cp = interpolate(frame, [120, CLICK], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rest = { x: BTN.x - 40, y: BTN.y + 14 };
  const cur = { x: 620 + (rest.x - 620) * cp + Math.sin(frame / 25) * 2, y: 1140 + (rest.y - 1140) * cp + Math.cos(frame / 22) * 2 };
  const cpPrev = interpolate(frame - 1, [120, CLICK], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const prevCur = { x: 620 + (rest.x - 620) * cpPrev, y: 1140 + (rest.y - 1140) * cpPrev };
  const ring = interpolate(frame, [CLICK - 1, CLICK + 7], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorOpacity = interpolate(frame, [119, 122], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const press = interpolate(frame, [CLICK - 1, CLICK + 1, CLICK + 5], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const MARK = 96;
  const markX = 960 - slide * 235;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} warm={warm} />
      {/* the warm wash sits to the right/bottom in the reference */}
      <div style={{ position: "absolute", inset: 0, opacity: warm, background: "linear-gradient(225deg, rgba(253,205,140,0.7) 0%, rgba(253,205,140,0) 55%)" }} />

      {/* lockup */}
      <div id="outro-mark" style={{ position: "absolute", left: markX - MARK / 2, top: 300 + (1 - markDrop) * -160, width: MARK, height: MARK, opacity: markDrop > 0 ? 1 : 0, transform: `scale(${Math.max(0, markDrop)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Img src={mark} style={{ width: MARK * 0.9, height: "auto" }} />
      </div>
      {frame >= 57 && (
        <div id="outro-wordmark" style={{ position: "absolute", left: markX + 62, top: 300 - 6, fontFamily: brand.font, fontWeight: 500, fontSize: 92, letterSpacing: `${tracking}em`, color: brand.text, whiteSpace: "pre", lineHeight: 1.1 }}>
          {WORD.split("").map((ch, i) => {
            const p = interpolate(frame, [57 + i * 1.4, 61 + i * 1.4], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <span key={i} style={{ display: "inline-block", opacity: p, filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined }}>
                {ch}
              </span>
            );
          })}
        </div>
      )}

      <div style={{ position: "absolute", top: 500, left: 0, width: 1920, display: "flex", justifyContent: "center" }}>
        <TypeLine id="outro-line" segments={[{ text: "Reach buyers when they are " }, { text: "ready", style: orangeText, by: "char" }]} startFrom={0} each={6} duration={9} float style={{ fontSize: 63 }} />
      </div>

      {/* Try now */}
      <div
        id="try-now"
        style={{
          position: "absolute",
          left: BTN.x - 165,
          top: BTN.y - 60,
          width: 330,
          height: 120,
          borderRadius: 999,
          backgroundColor: "#f4533f",
          color: "#fff",
          fontFamily: brand.font,
          fontWeight: 500,
          fontSize: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${btn * (1 - press * 0.06)})`,
          opacity: btn > 0 ? 1 : 0,
          boxShadow: "0 18px 44px rgba(244,83,63,0.35)",
          whiteSpace: "pre",
        }}
      >
        {"Try now".slice(0, btnChars)}
      </div>

      <ParticleRing id="try-burst" t={frame - CLICK} cx={BTN.x} cy={BTN.y} radius={130} count={30} seed="try" />
      <Cursor x={cur.x} y={cur.y} vx={cur.x - prevCur.x} vy={cur.y - prevCur.y} ring={ring} press={press} opacity={cursorOpacity} />
    </AbsoluteFill>
  );
}
