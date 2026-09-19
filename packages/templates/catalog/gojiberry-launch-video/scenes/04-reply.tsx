import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { Cursor } from "../components/Cursor";
import { BrowserWindow, WIN_LEFT } from "../components/BrowserWindow";
import { HundredLines } from "../components/HundredLines";
import { ReplyCard, REPLY_W, REPLY_H } from "../components/ReplyCard";
import { TypeLine } from "../components/TypeLine";
import ethan from "../assets/avatar-2.png";

// Scene 04 — ref 6.4–11.0s (138f). The LinkedIn window rises again under the
// two lines (which fade), "Ohhh!" types, a message notification sits
// bottom-right; the cursor lands on it, the camera pushes in, click; the
// thread card grows out of the bar, we read the reply up close, pull back;
// "Let's be honest" types below; everything blurs away for 05.

// minimised messaging bar, in stage (zoom=1) coordinates
const BAR = { left: 1330, top: 1010, w: 380, h: 60 };
const BAR_CX = BAR.left + BAR.w / 2;
const BAR_CY = BAR.top + BAR.h / 2;

export default function Scene() {
  const frame = useCurrentFrame();

  // window rise (6.3–6.7s) then a slow settle
  const winTop = interpolate(frame, [-3, 0, 3, 6, 9, 30], [1080, 648, 324, 216, 172, 165], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const winOut = interpolate(frame, [48, 60], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // push-in toward the bar (7.5–7.9s)
  const Z = interpolate(frame, [33, 45], [1, 2.3], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tx = interpolate(frame, [33, 45], [BAR_CX, 1382], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ty = interpolate(frame, [33, 45], [BAR_CY, 1004], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const T = { x: tx - Z * BAR_CX, y: ty - Z * BAR_CY };
  const toScreen = (x: number, y: number) => ({ x: T.x + Z * x, y: T.y + Z * y });

  // "Ohhh!"
  const OHHH = "Ohhh!";
  const ohChars = Math.max(0, Math.min(OHHH.length, Math.floor((frame - 12) / 2) + 1));
  const ohOut = interpolate(frame, [46, 52], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // cursor: enters right edge f24, lands on the bar f33 (stage coords), click ring f36
  const cp = interpolate(frame, [24, 33], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stageCur = { x: 1870 + (BAR_CX + 10 - 1870) * cp, y: 600 + (BAR_CY + 4 - 600) * cp };
  const cur = toScreen(stageCur.x, stageCur.y);
  const cpPrev = interpolate(frame - 1, [24, 33], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const prevCur = toScreen(1870 + (BAR_CX + 10 - 1870) * cpPrev, 600 + (BAR_CY + 4 - 600) * cpPrev);
  const ring = interpolate(frame, [36, 45], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorOpacity = interpolate(frame, [23, 25, 46, 50], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgePulse = 1 + Math.sin(frame / 3) * 0.08;

  // thread card — screen-space keyframes (centre x, centre y, scale)
  const cs = interpolate(frame, [48, 54, 60, 63, 66, 88, 93, 132], [1.575, 1.35, 1.0, 1.3, 2.2, 2.2, 1.0, 1.05], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cx = interpolate(frame, [48, 54, 60, 66, 93], [1382, 1382, 960, 960, 960], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // bottom-anchored while it grows out of the bar, then centre-anchored
  const bottomY = 1073;
  const growCy = bottomY - (REPLY_H * cs) / 2;
  const cyLate = interpolate(frame, [60, 66, 88, 93], [460, 236, 190, 540], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cyMix = interpolate(frame, [54, 60], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = growCy * (1 - cyMix) + cyLate * cyMix;
  const clip = interpolate(frame, [48, 54], [60 / REPLY_H, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const header = interpolate(frame, [54, 60], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoomBlur = interpolate(frame, [88, 90, 93], [0, 8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const showCard = frame >= 48;

  // exit
  const exit = interpolate(frame, [132, 138], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground />

      {/* stage: window + bar, zoomable */}
      {winOut < 1 && (
        <div id="stage" style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `translate(${T.x}px, ${T.y}px) scale(${Z})`, transformOrigin: "0 0", opacity: 1 - winOut, filter: winOut > 0 ? `blur(${winOut * 12}px)` : undefined }}>
          <div id="linkedin-window-2" style={{ position: "absolute", left: WIN_LEFT, top: winTop }}>
            <BrowserWindow />
          </div>
          <div id="message-bar" style={{ position: "absolute", left: BAR.left, top: BAR.top, width: BAR.w, height: BAR.h, borderRadius: "10px 10px 0 0", backgroundColor: brand.linkedin, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, boxSizing: "border-box", boxShadow: "0 -8px 30px rgba(0,0,0,0.12)" }}>
            <Img src={ethan} style={{ width: 34, height: 34, borderRadius: 17 }} />
            <div style={{ width: 120, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.75)" }} />
            <div style={{ flex: 1 }} />
            <div style={{ width: 11, height: 11, borderRight: "2.5px solid #fff", borderTop: "2.5px solid #fff", transform: "rotate(-45deg)", marginRight: 8, marginTop: 4 }} />
            <div style={{ position: "absolute", right: -7, top: -7, width: 18, height: 18, borderRadius: 9, backgroundColor: "#e8382f", transform: `scale(${badgePulse})`, boxShadow: "0 0 0 3px #fff" }} />
          </div>
        </div>
      )}

      {/* copy from 03 fading */}
      <div style={{ opacity: 1 - winOut }}>
        <HundredLines t={frame + 102} exitAt={105} />
      </div>

      {/* "Ohhh!" */}
      <div id="ohhh" style={{ position: "absolute", top: 12, left: 0, width: 1920, textAlign: "center", fontFamily: brand.font, fontWeight: 600, fontSize: 40, color: brand.text, opacity: ohOut }}>
        {OHHH.split("").map((ch, i) => {
          const t0 = 12 + i * 2;
          const p = interpolate(frame, [t0, t0 + 5], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 8}px)`, filter: p < 1 ? `blur(${(1 - p) * 4}px)` : undefined }}>
              {ch}
            </span>
          );
        })}
      </div>

      {/* thread card */}
      {showCard && (
        <div
          id="reply-card"
          style={{
            position: "absolute",
            left: cx - REPLY_W / 2,
            top: cy - REPLY_H / 2 - exit * 500,
            width: REPLY_W,
            height: REPLY_H,
            transform: `scale(${cs * (1 + exit * 0.2)})`,
            transformOrigin: "50% 50%",
            clipPath: `inset(${(1 - clip) * 100}% 0 0 0 round 18px)`,
            filter: zoomBlur + exit > 0 ? `blur(${zoomBlur + exit * 14}px)` : undefined,
            opacity: 1 - exit,
          }}
        >
          <ReplyCard header={header} />
        </div>
      )}

      {/* "Let's be honest" */}
      <div style={{ position: "absolute", top: 985 - exit * 400, left: 0, width: 1920, display: "flex", justifyContent: "center", opacity: 1 - exit, filter: exit > 0 ? `blur(${exit * 14}px)` : undefined }}>
        <TypeLine id="lets-be-honest" segments={[{ text: "Let's be honest" }]} startFrom={111} each={4} duration={7} style={{ fontSize: 34 }} />
      </div>

      <Cursor x={cur.x} y={cur.y} vx={cur.x - prevCur.x} vy={cur.y - prevCur.y} ring={ring} opacity={cursorOpacity} />
    </AbsoluteFill>
  );
}
