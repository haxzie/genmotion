import type React from "react";
import { AbsoluteFill, Video, TextAnimation, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import duskVideo from "../assets/dusk-cosmos-loop.mp4";
import { CodexAppIcon } from "../components/CodexBlob";
import { FONT, clamp } from "../components/brand";
import { glide } from "../components/glide";

// 16.83–21.37s — dusk cosmos, app icon, "this is Codex." → "Codex. / Where ideas turn into code".
export default function Scene() {
  const f = useCurrentFrame();
  const e = { ...clamp, easing: Easing.outSmooth };

  const grade = interpolate(f, [0, 14], [1, 0], e);
  const bgScale = interpolate(f, [0, 136], [1.1, 1.0]);

  // glide: one continuous settle (per-segment easing stopped it at 6 and 16).
  const iconSize = glide(f, [0, 6, 16, 24], [345, 300, 262, 255], { easeIn: false });
  const iconY = glide(f, [0, 6, 16, 24], [531, 470, 416, 406], { easeIn: false });
  const iconBlur = interpolate(f, [0, 8], [7, 0], clamp);

  const word = (s: number) => interpolate(f, [s, s + 9], [0, 1], e);
  const leave = interpolate(f, [44, 52], [0, 1], { ...clamp, easing: Easing.inOutCubic });
  const grow = interpolate(f, [45, 56], [0, 1], { ...clamp, easing: Easing.inOutCubic });

  const end = interpolate(f, [106, 134], [0, 1], { ...clamp, easing: Easing.inCubic });

  const rise = (p: number): React.CSSProperties => ({
    display: "inline-block", opacity: p, filter: `blur(${(1 - p) * 10}px)`, transform: `translateY(${(1 - p) * 40}px)`,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#4b4f9e", filter: `blur(${end * 16}px)` }}>
      {/* Background animated from the dusk still with fal (minimax/h3-max image-to-video, 1080P). */}
      <Video
        id="dusk-bg"
        src={duskVideo}
        volume={0}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${bgScale})`,
          filter: `blur(${grade * 10}px) hue-rotate(${-55 * grade}deg) saturate(${1 + grade * 0.4})`,
        }}
      />
      {/* soft scrim so the white type holds its contrast on the sky */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(700px 420px at 50% 55%, rgba(30,20,80,0.32), rgba(30,20,80,0) 70%)" }} />

      <div id="codex-icon" style={{ position: "absolute", left: 960 - iconSize / 2, top: iconY - iconSize / 2, filter: `blur(${iconBlur}px)` }}>
        <CodexAppIcon size={iconSize} />
      </div>

      <div
        id="this-is-codex"
        style={{
          position: "absolute", left: 0, right: 0, top: 642 - 70, height: 140, display: "flex", justifyContent: "center",
          alignItems: "center", fontFamily: FONT.sans, fontWeight: 500, color: "#ffffff", fontSize: 96, letterSpacing: "-0.01em",
          whiteSpace: "pre",
        }}
      >
        <span
          style={{
            display: "inline-flex", overflow: "hidden", maxWidth: 420 * (1 - leave),
            opacity: 1 - leave, filter: `blur(${leave * 10}px)`,
          }}
        >
          <span style={rise(word(15))}>this </span>
          <span style={rise(word(19))}>is </span>
        </span>
        <span id="codex-wordmark" style={{ ...rise(word(22)), transform: `translateY(${(1 - word(22)) * 40}px) scale(${1 + grow * 0.51})` }}>
          Codex.
        </span>
      </div>

      <div
        id="tagline"
        style={{
          position: "absolute", left: 0, right: 0, top: 712, textAlign: "center", fontFamily: FONT.sans,
          fontSize: 44, fontWeight: 400, color: "#ffffff",
        }}
      >
        <TextAnimation text="Where ideas turn into code" preset="blurIn" startFrom={54} stagger={5} duration={10} />
      </div>
    </AbsoluteFill>
  );
}
