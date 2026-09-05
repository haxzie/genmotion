import {
  AbsoluteFill,
  Img,
  Sequence,
  TextAnimation,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { Backdrop } from "../components/Backdrop";
import { c, font, type } from "../components/brand";
import { MARK } from "./05-valuation";
import mark from "../assets/lovable-mark.svg";

export default function Scene() {
  const frame = useCurrentFrame();

  // Handoff in: the mark arrives at scene 05's exact size and settles up.
  const settle = {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };
  const size = interpolate(frame, [0, 20], [MARK.size, 196], settle);
  const cy = interpolate(frame, [0, 20], [MARK.cy, 392], settle);
  const breathe = 1 + 0.012 * Math.sin(frame * 0.04);
  const glow = 0.3 + 0.16 * Math.sin(frame * 0.045);

  return (
    <AbsoluteFill style={{ fontFamily: font }}>
      <Backdrop frame={frame} />

      <div
        id="mark-glow"
        style={{
          position: "absolute",
          left: 960 - 520,
          top: cy - 420,
          width: 1040,
          height: 840,
          opacity: glow,
          background:
            "radial-gradient(420px 340px at 50% 50%, rgba(255,109,27,0.20), rgba(247,244,237,0) 70%)",
        }}
      />

      <div
        id="lovable-mark"
        style={{
          position: "absolute",
          left: 960 - size / 2,
          top: cy - size / 2,
          width: size,
          height: size,
          transform: `scale(${breathe})`,
        }}
      >
        <Img
          src={mark}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      <div
        id="lovable-wordmark"
        style={{
          position: "absolute",
          top: 552,
          left: 0,
          width: 1920,
          textAlign: "center",
          color: c.ink,
          fontSize: 124,
          fontWeight: 600,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        <TextAnimation
          text="Lovable"
          by="char"
          preset="blurUp"
          startFrom={16}
          duration={12}
          stagger={3}
        />
      </div>

      <Sequence from={38} durationInFrames={44}>
        <div
          id="closing-tagline"
          style={{
            position: "absolute",
            top: 716,
            left: 0,
            width: 1920,
            textAlign: "center",
            color: c.muted,
            ...type.body,
          }}
        >
          <TextAnimation
            text="Idea to app in seconds"
            by="word"
            preset="blurUp"
            duration={11}
            stagger={2}
            exit="auto"
          />
        </div>
      </Sequence>

      <div
        id="closing-url"
        style={{
          position: "absolute",
          top: 720,
          left: 0,
          width: 1920,
          textAlign: "center",
          color: c.muted,
          ...type.eyebrow,
        }}
      >
        <TextAnimation
          text="lovable.dev"
          by="char"
          preset="fadeIn"
          startFrom={86}
          duration={10}
          stagger={1.5}
        />
      </div>
    </AbsoluteFill>
  );
}
