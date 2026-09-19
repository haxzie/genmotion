import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { ChevronRight } from "lucide-react";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { Cursor } from "../components/Cursor";
import { ParticleRing } from "../components/ParticleRing";

// Scene 12 — ref 30.4–35.0s (138f). The website form slides in from the
// right while "You enter your website" types; "yourcompany.com" types into
// the field; the cursor lands on Next Step and clicks (orange burst); the
// card grows with Company Name / Industry / Company Description rows while
// the line becomes "Our AI understands your market" → "…offer"; the card
// drops away at the end.

const CARD_LEFT = 201;
const CARD_W = 1518;
const CLICK = 48;
const URL = "yourcompany.com";
const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

function Skeleton({ w, p }: { w: number; p: number }) {
  // a loading bar: a dark segment slides in from the left, then a faint remainder
  return (
    <div style={{ width: w, height: 12, borderRadius: 6, backgroundColor: "#f0f0ee", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: 12, width: w * 0.35 * p, borderRadius: 6, background: "linear-gradient(90deg, #6b6f7a, #c9ccd3)" }} />
    </div>
  );
}

export default function Scene() {
  const frame = useCurrentFrame();
  const slideIn = interpolate(frame, [0, 12], [1, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlChars = Math.max(0, Math.min(URL.length, Math.floor((frame - 6) * 0.9)));
  const caretOn = Math.floor(frame / 12) % 2 === 0;

  // cursor: enters from the bottom f30, lands on Next Step f45, click f48
  const cp = interpolate(frame, [30, 45], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnTip = { x: 1470, y: 650 };
  const cur = { x: 1240 + (btnTip.x - 1240) * cp, y: 1120 + (btnTip.y - 1120) * cp };
  const cpPrev = interpolate(frame - 1, [30, 45], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const prevCur = { x: 1240 + (btnTip.x - 1240) * cpPrev, y: 1120 + (btnTip.y - 1120) * cpPrev };
  const ring = interpolate(frame, [CLICK - 1, CLICK + 7], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorOpacity = interpolate(frame, [30, 32, 58, 66], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const press = interpolate(frame, [CLICK - 1, CLICK + 1, CLICK + 4], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // card growth after the click
  const grow = interpolate(frame, [CLICK, CLICK + 18], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardH = 435 + grow * 175;
  const cardTop = 390 - grow * 80;
  const rowA = interpolate(frame, [51, 60], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rowB = interpolate(frame, [57, 66], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rowC = interpolate(frame, [66, 78], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nextOut = interpolate(frame, [54, 62], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // headline swap: "You enter your website" → "Our AI understands your market/offer"
  const line1Out = 42;
  const marketChars = Math.max(0, Math.min(6, Math.floor((frame - 69) / 2.5)));
  const marketDel = frame >= 111 ? Math.max(0, 6 - Math.floor((frame - 111) / 1.5)) : 6;
  const market = "market".slice(0, Math.min(marketChars, marketDel));
  const offerChars = Math.max(0, Math.min(5, Math.floor((frame - 120) / 2.4)));
  const word = frame < 120 ? market : "offer".slice(0, offerChars);

  // exit: card drops and blurs
  const exit = interpolate(frame, [131, 138], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} />

      {/* form card */}
      <div
        id="website-form"
        style={{
          position: "absolute",
          left: CARD_LEFT + slideIn * 1100,
          top: cardTop + exit * 500,
          width: CARD_W,
          height: cardH,
          borderRadius: 30,
          backgroundColor: "#fff",
          boxShadow: brand.cardShadow,
          boxSizing: "border-box",
          padding: "58px 96px",
          fontFamily: FONT,
          opacity: 1 - exit,
          filter: exit > 0 ? `blur(${exit * 12}px)` : undefined,
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: 26, color: "#747885", fontWeight: 500 }}>Website</div>
        <div style={{ marginTop: 14, height: 90, borderRadius: 14, backgroundColor: "#fafafa", border: "2px solid #eef0f0", display: "flex", alignItems: "center", padding: "0 10px 0 28px", boxSizing: "border-box" }}>
          <span style={{ fontSize: 30, color: "#3b3f4a", flex: 1 }}>
            {URL.slice(0, urlChars)}
            {frame >= 6 && (urlChars < URL.length || caretOn) && <span style={{ display: "inline-block", width: 2, height: 32, backgroundColor: "#3b3f4a", verticalAlign: -6, marginLeft: 2 }} />}
          </span>
          <div style={{ width: 147, height: 63, borderRadius: 10, backgroundColor: "#fa0000", color: "#fff", fontFamily: brand.font, fontWeight: 600, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>Analyze</div>
        </div>

        {/* rows revealed after the click */}
        <div style={{ marginTop: 40, display: "flex", gap: 40, opacity: rowA }}>
          <div style={{ width: 640, transform: `translateY(${(1 - rowA) * 12}px)` }}>
            <div style={{ fontSize: 24, color: "#747885", fontWeight: 500 }}>Company Name</div>
            <div style={{ marginTop: 12, height: 64, borderRadius: 12, backgroundColor: "#fafafa", border: "2px solid #eef0f0", display: "flex", alignItems: "center", padding: "0 22px", boxSizing: "border-box" }}>
              <Skeleton w={560} p={rowA} />
            </div>
          </div>
          <div style={{ width: 640, opacity: rowB, transform: `translateY(${(1 - rowB) * 12}px)` }}>
            <div style={{ fontSize: 24, color: "#747885", fontWeight: 500 }}>Industry</div>
            <div style={{ marginTop: 12, height: 64, borderRadius: 12, backgroundColor: "#fafafa", border: "2px solid #eef0f0", display: "flex", alignItems: "center", padding: "0 22px", boxSizing: "border-box" }}>
              <Skeleton w={560} p={rowB} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 32, opacity: rowC, transform: `translateY(${(1 - rowC) * 12}px)` }}>
          <div style={{ fontSize: 24, color: "#747885", fontWeight: 500 }}>Company Description</div>
          <div style={{ marginTop: 12, height: 110, borderRadius: 12, backgroundColor: "#fafafa", border: "2px solid #eef0f0", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, padding: "0 22px", boxSizing: "border-box" }}>
            <Skeleton w={1280} p={rowC} />
            <Skeleton w={1280} p={rowC * 0.9} />
            <Skeleton w={900} p={rowC * 0.8} />
          </div>
        </div>

        {/* Next Step */}
        <div
          id="next-step"
          style={{
            position: "absolute",
            right: 96,
            top: 210,
            width: 300,
            height: 87,
            borderRadius: 16,
            background: "linear-gradient(90deg, #fd9903 0%, #fa2f2c 100%)",
            color: "#fff",
            fontFamily: brand.font,
            fontWeight: 600,
            fontSize: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            transform: `scale(${1 - press * 0.06}) translateX(${(1 - nextOut) * 260}px)`,
            opacity: nextOut,
            boxShadow: "0 10px 24px rgba(250,60,40,0.25)",
          }}
        >
          Next Step <ChevronRight size={30} strokeWidth={3} />
        </div>
      </div>

      <ParticleRing id="next-burst" t={frame - CLICK} cx={1473} cy={643} radius={70} count={22} seed="next" />

      {/* headline */}
      <div style={{ position: "absolute", top: 100, left: 0, width: 1920, display: "flex", justifyContent: "center" }}>
        <TypeLine id="enter-line" segments={[{ text: "You enter your " }, { text: "website", style: orangeText, by: "char" }]} startFrom={0} each={3} duration={8} exitAt={line1Out} exitDuration={6} style={{ fontSize: 60 }} />
      </div>
      <div style={{ position: "absolute", top: 100, left: 0, width: 1920, display: "flex", justifyContent: "center", whiteSpace: "pre", fontFamily: brand.font, fontWeight: 600, fontSize: 60, color: brand.text }}>
        <TypeLine id="ai-line" segments={[{ text: "Our AI understands your " }]} startFrom={42} each={5} duration={8} style={{ fontSize: 60 }} />
        <span id="ai-word" style={{ ...orangeText, lineHeight: 1.25, opacity: frame >= 69 ? 1 : 0 }}>{word}</span>
      </div>

      <Cursor x={cur.x} y={cur.y} vx={cur.x - prevCur.x} vy={cur.y - prevCur.y} ring={ring} press={press} opacity={cursorOpacity} />
    </AbsoluteFill>
  );
}
