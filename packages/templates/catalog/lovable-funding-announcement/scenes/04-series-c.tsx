import {
  AbsoluteFill,
  CountText,
  Sequence,
  TextAnimation,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { Backdrop } from "../components/Backdrop";
import { c, font, gradFull, type } from "../components/brand";

export default function Scene() {
  const frame = useCurrentFrame();

  // The band from scene 03 gathers into an underline, then opens out again
  // into the divider scene 05 starts on.
  const ease = {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };
  const keys = [6, 30, 116, 134];
  const bandLeft = interpolate(frame, keys, [0, 610, 610, 0], ease);
  const bandWidth = interpolate(frame, keys, [1920, 700, 700, 1920], ease);
  const bandTop = interpolate(frame, keys, [492, 640, 640, 170], ease);
  const bandHeight = interpolate(frame, keys, [96, 12, 12, 6], ease);
  const bandRadius = interpolate(frame, keys, [0, 999, 999, 0], ease);

  const heroIn = interpolate(frame, [24, 40], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const heroOut = interpolate(frame, [104, 116], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bloom = interpolate(frame, [22, 46, 100], [0, 0.5, 0.22], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathe = 1 + 0.006 * Math.sin(frame * 0.05);

  return (
    <AbsoluteFill style={{ fontFamily: font }}>
      <Backdrop frame={frame} />

      <div
        id="hero-bloom"
        style={{
          position: "absolute",
          left: 260,
          top: 180,
          width: 1400,
          height: 720,
          opacity: bloom,
          background:
            "radial-gradient(600px 380px at 50% 50%, rgba(255,1,120,0.20), rgba(247,244,237,0) 70%)",
        }}
      />

      <div
        id="eyebrow-series-c"
        style={{
          position: "absolute",
          top: 300,
          left: 0,
          width: 1920,
          textAlign: "center",
          color: c.muted,
          ...type.eyebrow,
        }}
      >
        <TextAnimation
          text="Series C"
          by="char"
          preset="fadeUp"
          startFrom={14}
          duration={10}
          stagger={2}
          exit={{ at: 104, duration: 8 }}
        />
      </div>

      <div
        id="funding-amount"
        style={{
          position: "absolute",
          top: 372,
          left: 0,
          width: 1920,
          textAlign: "center",
          color: c.ink,
          opacity: heroIn * (1 - heroOut),
          transform: `translateY(${(1 - heroIn) * 40 + heroOut * -38}px) scale(${(0.95 + heroIn * 0.05) * breathe})`,
          filter: `blur(${(1 - heroIn) * 14 + heroOut * 12}px)`,
          ...type.hero,
        }}
      >
        <CountText to={400} prefix="$" suffix="M" startFrom={24} duration={40} />
      </div>

      <Sequence from={68} durationInFrames={44}>
        <div
          id="lead-investors"
          style={{
            position: "absolute",
            top: 720,
            left: 0,
            width: 1920,
            textAlign: "center",
            color: c.muted,
            ...type.body,
          }}
        >
          <TextAnimation
            text="Led by Menlo Ventures and the Scaleup Europe Fund"
            by="word"
            preset="blurUp"
            duration={11}
            stagger={2}
            exit="auto"
          />
        </div>
      </Sequence>

      {/* Handoff element — no exit; scene 05 opens on this divider. */}
      <div
        id="gradient-band"
        style={{
          position: "absolute",
          left: bandLeft,
          top: bandTop,
          width: bandWidth,
          height: bandHeight,
          borderRadius: bandRadius,
          overflow: "hidden",
        }}
      >
        <div style={{ width: bandWidth, height: bandHeight, background: gradFull }} />
      </div>
    </AbsoluteFill>
  );
}
