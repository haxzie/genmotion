import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { Cursor } from "../components/Cursor";
import { DmCard, DM_W, DM_H, SEND_LEFT, SEND_TOP, SEND_W, SEND_H } from "../components/DmCard";
import { BrowserWindow, WIN_LEFT, WIN_TOP, WIN_DM_LEFT, WIN_DM_TOP, WIN_DM_SCALE } from "../components/BrowserWindow";

// Scene 01 — ref 0.0–2.0s (60f). Grid → "Mmh…" + LinkedIn window rises →
// window blurs away as the composer zooms out to centre → cursor sweeps onto
// Send, clicks → the button floods the frame blue.
// Every frame number below is the reference's own (30fps).

const CARD_LEFT = (1920 - DM_W) / 2; // 597
const CARD_TOP = (1080 - DM_H) / 2; // 192
const CLICK = 53;
const ENTER = CLICK - 16; // 37
const LAND = CLICK - 6; // 47

// the tip lands inside the button, a little left of its centre
const TIP_END_X = CARD_LEFT + SEND_LEFT + 48;
const TIP_END_Y = CARD_TOP + SEND_TOP + 22;
const TRAVEL_DX = 605;
const TRAVEL_DY = 526;
const TRAVEL_P = [0, 0.17, 0.31, 0.42, 0.53, 0.63, 0.72, 0.8, 0.87, 0.95, 1];

function cursorAt(f: number) {
  const travelFrames = TRAVEL_P.map((_, i) => ENTER + i);
  const p = interpolate(f, travelFrames, TRAVEL_P, { extrapolateLeft: "extend", extrapolateRight: "clamp" });
  return { x: TIP_END_X - TRAVEL_DX + TRAVEL_DX * p, y: TIP_END_Y - TRAVEL_DY + TRAVEL_DY * p, rotation: 0 };
}

const MMH = "Mmh...";

export default function Scene() {
  const frame = useCurrentFrame();

  // --- "Mmh…" typed one character per 4 frames from f6
  const mmhChars = Math.max(0, Math.min(MMH.length, Math.floor((frame - 6) / 4) + 1));
  const mmhOut = interpolate(frame, [30, 36], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // --- window rises (measured: fast in, long settle), then blurs away
  const winTop = interpolate(frame, [6, 9, 12, 15, 18, 21, 30], [1080, 480, 356, 290, 260, 230, WIN_TOP], { easing: Easing.linear, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const winOut = interpolate(frame, [30, 36], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // --- composer: lives inside the window until f31, then zooms out to centre
  const zoom = interpolate(frame, [31, 37], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const inWinLeft = WIN_LEFT + WIN_DM_LEFT;
  const inWinTop = winTop + WIN_DM_TOP;
  const cardScale = WIN_DM_SCALE + (1 - WIN_DM_SCALE) * zoom;
  const cardLeft = inWinLeft + (CARD_LEFT - inWinLeft) * zoom;
  const cardTop = inWinTop + (CARD_TOP - inWinTop) * zoom;

  // message types at ~4.5 chars/frame from f10 — still typing as the card
  // centres, finishing just before the cursor lands (f47)
  const chars = Math.max(0, Math.floor((frame - 10) * 4.5));

  // --- cursor
  const cur = cursorAt(frame);
  const prev = cursorAt(frame - 1);
  const press = interpolate(frame, [CLICK - 1, CLICK + 1, CLICK + 5], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ring = interpolate(frame, [CLICK - 1, CLICK + 7], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorOpacity = interpolate(frame, [ENTER - 1, ENTER], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sent = frame >= CLICK;

  // --- flood: a blue disc grows out of the Send button f54–60
  const floodR = interpolate(frame, [54, 60], [0, 2400], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sendCx = CARD_LEFT + SEND_LEFT + SEND_W / 2;
  const sendCy = CARD_TOP + SEND_TOP + SEND_H / 2;
  // card lifts off f57–60 with motion blur
  const lift = interpolate(frame, [57, 60], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground />

      {/* LinkedIn window */}
      {winOut < 1 && (
        <div
          id="linkedin-window"
          style={{
            position: "absolute",
            left: WIN_LEFT,
            top: winTop,
            opacity: 1 - winOut,
            filter: winOut > 0 ? `blur(${winOut * 14}px)` : undefined,
            transform: `scale(${1 + winOut * 0.12})`,
            transformOrigin: "50% 40%",
          }}
        >
          <BrowserWindow />
        </div>
      )}

      {/* "Mmh…" */}
      <div id="mmh" style={{ position: "absolute", top: 8, left: 0, width: 1920, textAlign: "center", fontFamily: brand.font, fontWeight: 600, fontSize: 40, color: brand.text, opacity: mmhOut }}>
        {MMH.slice(0, mmhChars)}
      </div>

      {/* blue flood — the handoff: scene 02 opens on this colour */}
      {floodR > 0 && (
        <div
          id="blue-flood"
          style={{
            position: "absolute",
            left: sendCx - floodR,
            top: sendCy - floodR,
            width: floodR * 2,
            height: floodR * 2,
            borderRadius: "50%",
            backgroundColor: brand.linkedin,
            opacity: interpolate(frame, [54, 57], [0.55, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        />
      )}
      {/* composer card */}
      {frame >= 6 && (
        <div
          id="dm-card"
          style={{
            position: "absolute",
            left: cardLeft,
            top: cardTop - lift * 1100,
            transform: `scale(${cardScale * (1 + lift * 0.35)})`,
            transformOrigin: "0 0",
            filter: lift > 0 ? `blur(${lift * 10}px)` : undefined,
            opacity: 1 - lift * 0.4,
          }}
        >
          <DmCard chars={chars} sent={sent} press={press} caret={!sent && frame >= 10} />
        </div>
      )}

      <Cursor x={cur.x} y={cur.y} vx={cur.x - prev.x} vy={cur.y - prev.y} ring={ring} press={press} opacity={cursorOpacity} />
    </AbsoluteFill>
  );
}
