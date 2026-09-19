import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";

// Scene 20 — ref 61.7–64.2s (75f). "all of this on" types at centre, an
// "autopilot" pill pops in beside it, and a pink road (a perspective
// triangle) draws up from the bottom toward the pill. Blurs out at the end.

export default function Scene() {
  const frame = useCurrentFrame();
  const pill = interpolate(frame, [36, 46], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const road = interpolate(frame, [48, 69], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lift = interpolate(frame, [36, 48], [0, -210], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [69, 75], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // road apex sits just under the pill; base spans past the frame edges
  const apexY = 400;
  const baseY = 1080 + 40;
  const h = (baseY - apexY) * road;
  const y0 = baseY - h;
  const halfTop = 130 + (1 - road) * 400;
  const halfBase = 1000;
  const half = halfTop + (halfBase - halfTop) * road;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={1} />

      {road > 0 && (
        <svg id="autopilot-road" width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - exit, filter: exit > 0 ? `blur(${exit * 12}px)` : undefined }}>
          <defs>
            <linearGradient id="roadFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fbd0c6" stopOpacity={0.2} />
              <stop offset="1" stopColor="#f8a08f" stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <path d={`M ${960 - halfTop} ${y0} L ${960 + halfTop} ${y0} L ${960 + half} ${baseY} L ${960 - half} ${baseY} Z`} fill="url(#roadFill)" />
          <path d={`M ${960 - halfTop} ${y0} L ${960 - half} ${baseY}`} stroke="#f45f4a" strokeWidth={5} fill="none" opacity={0.8} />
          <path d={`M ${960 + halfTop} ${y0} L ${960 + half} ${baseY}`} stroke="#f45f4a" strokeWidth={5} fill="none" opacity={0.8} />
        </svg>
      )}

      <div style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 1080, display: "flex", alignItems: "center", justifyContent: "center", transform: `translateY(${lift}px)`, opacity: 1 - exit, filter: exit > 0 ? `blur(${exit * 12}px)` : undefined }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, whiteSpace: "pre" }}>
          <TypeLine id="autopilot-line" segments={[{ text: "all of this on" }]} startFrom={0} each={9} duration={9} style={{ fontSize: 60 }} />
          <div id="autopilot-pill" style={{ transform: `scale(${pill})`, opacity: pill > 0 ? 1 : 0, backgroundColor: "#fd523e", color: "#fff", fontFamily: brand.font, fontWeight: 600, fontSize: 52, padding: "16px 72px", borderRadius: 999, boxShadow: "0 16px 40px rgba(253,82,62,0.35)" }}>
            autopilot
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
