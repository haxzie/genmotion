import {
  AbsoluteFill,
  Sequence,
  Img,
  TextAnimation,
  useCurrentFrame,
  interpolate,
  Easing,
} from "@genmotion/motion";

import {
  BLUE_RADIAL,
  FONT,
  MARK_SIZE,
  MARK_Y,
  ON_BLUE,
} from "../components/brand";

import geminiMark from "../assets/gemini-mark-white.svg";

export default function Scene() {
  const frame = useCurrentFrame();

  // The mark is the handoff — it arrives already at rest, exactly as scene 03
  // left it, and only breathes from here on.
  const breathe = 1 + Math.sin(frame * 0.045) * 0.014;
  const halo = interpolate(frame, [0, 55, 110], [0.4, 0.9, 0.45], {
    easing: Easing.inOutCubic,
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BLUE_RADIAL }}>
      <div
        id="lockup-halo"
        style={{
          position: "absolute",
          inset: 0,
          opacity: halo,
          background:
            "radial-gradient(700px 480px at 50% 44%, rgba(140,168,255,0.42) 0%, rgba(140,168,255,0) 70%)",
        }}
      />

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
          transform: `scale(${breathe})`,
        }}
      >
        <Img
          src={geminiMark}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </div>

      <Sequence from={10} durationInFrames={104}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            id="lockup-name"
            style={{
              marginTop: 132,
              fontSize: 76,
              fontWeight: 400,
              letterSpacing: "-0.03em",
              color: ON_BLUE,
              fontFamily: FONT,
              textAlign: "center",
            }}
          >
            <TextAnimation
              text="Google generative AI"
              by="word"
              preset="riseMask"
              stagger={4}
              duration={13}
              exit="auto"
              hold="breathe"
            />
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}
