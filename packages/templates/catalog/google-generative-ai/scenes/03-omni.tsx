import {
  AbsoluteFill,
  Sequence,
  Img,
  TextAnimation,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  springPresets,
  Easing,
} from "@genmotion/motion";

import {
  BLUE_RADIAL,
  FONT,
  HERO_FRAME,
  MARK_SIZE,
  MARK_Y,
  ON_BLUE,
} from "../components/brand";

import heroArt from "../assets/art-lyria.jpg";
import geminiMark from "../assets/gemini-mark-white.svg";

// the mark arrives at the very end and survives into scene 04
const MARK_AT = 116;

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Scene 02 ended on this image filling the frame. It settles back and
  // dissolves into the blue field the rest of the film lives on.
  const settle = interpolate(frame, [0, 34], [1, 0], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const artScale = interpolate(frame, [0, 46], [1, 1.07], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glow = interpolate(frame, [0, 60, 120], [0.35, 0.8, 0.35], {
    easing: Easing.inOutCubic,
    extrapolateRight: "clamp",
  });

  const mark = spring({
    frame: frame - MARK_AT,
    fps,
    config: springPresets.gentle,
    durationInFrames: 16,
  });

  return (
    <AbsoluteFill style={{ background: BLUE_RADIAL }}>
      <div
        id="hero-art"
        style={{
          position: "absolute",
          left: HERO_FRAME.left,
          top: HERO_FRAME.top,
          width: HERO_FRAME.width,
          height: HERO_FRAME.height,
          opacity: settle,
          transform: `scale(${artScale})`,
        }}
      >
        <Img
          src={heroArt}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      <div
        id="omni-glow"
        style={{
          position: "absolute",
          inset: 0,
          opacity: glow,
          background:
            "radial-gradient(820px 560px at 50% 46%, rgba(126,158,255,0.4) 0%, rgba(126,158,255,0) 72%)",
        }}
      />

      <Sequence from={26} durationInFrames={MARK_AT - 26}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <h1
            id="omni-line"
            style={{
              margin: 0,
              fontSize: 118,
              fontWeight: 400,
              letterSpacing: "-0.035em",
              color: ON_BLUE,
              fontFamily: FONT,
              textAlign: "center",
            }}
          >
            <TextAnimation
              text="One model. Every medium."
              by="word"
              preset="riseMask"
              stagger={4}
              duration={13}
              exit="auto"
              hold="float"
            />
          </h1>
        </AbsoluteFill>
      </Sequence>

      {/* handoff: the mark lands here and scene 04 opens on it, unchanged */}
      <div
        id="gemini-mark"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: MARK_SIZE,
          height: MARK_SIZE,
          marginLeft: -MARK_SIZE / 2,
          marginTop: -MARK_SIZE / 2 + MARK_Y,
          opacity: mark,
          transform: `scale(${0.72 + mark * 0.28})`,
        }}
      >
        <Img
          src={geminiMark}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </div>
    </AbsoluteFill>
  );
}
