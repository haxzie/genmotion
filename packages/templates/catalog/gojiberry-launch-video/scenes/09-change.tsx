import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { brand, orangeText } from "../components/brand";
import { Fonts } from "../components/Fonts";
import { GridBackground } from "../components/GridBackground";
import { TypeLine } from "../components/TypeLine";
import { ParticleRing } from "../components/ParticleRing";
import mark from "../assets/strawberry-mark.png";

// Scene 09 — ref 20.3–23.6s (99f). "It's time to change" types (change
// letter by letter, orange), the pink bloom rises under it, the camera
// slams into "to" (f36–46), a ring of orange dashes bursts (f48), the mark
// resolves at centre, slides left, and "strawberry" tracks in beside it.

const BURST = 48;
const WORD = "strawberry";

export default function Scene() {
  const frame = useCurrentFrame();
  const bloom = interpolate(frame, [6, 30], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // push into "to"
  const zoom = interpolate(frame, [36, 46], [1, 9], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoomBlur = interpolate(frame, [38, 46], [0, 18], { easing: Easing.inQuad, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineOut = interpolate(frame, [45, BURST], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // white flash at the burst
  const flash = interpolate(frame, [BURST - 1, BURST, BURST + 14], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // mark: pops at burst, settles; slides left at f72
  const markIn = interpolate(frame, [BURST, BURST + 12], [0, 1], { easing: Easing.outBack, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const markRot = interpolate(frame, [BURST, BURST + 12], [-140, 0], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const markScale = interpolate(frame, [BURST, BURST + 6, BURST + 14, 72, 80], [0.2, 1.0, 1.0, 1.0, 0.62], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slide = interpolate(frame, [72, 80], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // wordmark letters + tracking that tightens as they land
  const letters = Math.max(0, Math.min(WORD.length, Math.floor((frame - 76) / 1.5)));
  const tracking = interpolate(frame, [76, 92], [0.32, 0.01], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [93, 99], [0, 1], { easing: Easing.inCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const MARK = 150; // px, settled size at centre
  const markX = 960 - slide * 232;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, overflow: "hidden" }}>
      <Fonts />
      <GridBackground bloom={bloom} />

      {/* headline, zoom-anchored on "to" */}
      {lineOut > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1920,
            height: 1080,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${zoom})`,
            transformOrigin: "49.5% 50%",
            filter: zoomBlur > 0 ? `blur(${zoomBlur}px)` : undefined,
            opacity: lineOut,
          }}
        >
          <TypeLine
            id="change-line"
            segments={[{ text: "It's time to " }, { text: "change", style: orangeText, by: "char" }]}
            startFrom={0}
            each={3}
            duration={8}
            style={{ fontSize: 40 }}
          />
        </div>
      )}

      {flash > 0 && <div style={{ position: "absolute", inset: 0, backgroundColor: "#fff", opacity: flash }} />}

      <ParticleRing id="change-burst" t={frame - BURST} cx={960} cy={540} radius={300} />

      {/* mark */}
      {frame >= BURST && (
        <div
          id="mark"
          style={{
            position: "absolute",
            left: markX - MARK / 2,
            top: 540 - MARK / 2 - exit * 30,
            width: MARK,
            height: MARK,
            transform: `scale(${markScale * markIn}) rotate(${markRot}deg)`,
            opacity: 1 - exit,
            filter: exit > 0 ? `blur(${exit * 10}px)` : undefined,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img src={mark} style={{ width: MARK * 0.9, height: "auto" }} />
        </div>
      )}

      {/* wordmark */}
      {frame >= 76 && (
        <div
          id="wordmark"
          style={{
            position: "absolute",
            left: markX + 60,
            top: 540 - 34 - exit * 30,
            fontFamily: brand.font,
            fontWeight: 500,
            fontSize: 54,
            letterSpacing: `${tracking}em`,
            color: brand.text,
            whiteSpace: "pre",
            opacity: 1 - exit,
            filter: exit > 0 ? `blur(${exit * 10}px)` : undefined,
          }}
        >
          {WORD.split("").map((ch, i) => {
            const p = interpolate(frame, [76 + i * 1.5, 80 + i * 1.5], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <span key={i} style={{ display: "inline-block", opacity: p, filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined }}>
                {ch}
              </span>
            );
          })}
          {letters < 0 ? null : null}
        </div>
      )}
    </AbsoluteFill>
  );
}
