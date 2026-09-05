import {
  AbsoluteFill,
  Sequence,
  TextAnimation,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { AppCard } from "../components/AppCard";
import { CardGrid } from "../components/CardGrid";
import { c, font, type, WALL_SCRIM } from "../components/brand";
import { HERO_CARD } from "./01-idea";

export default function Scene() {
  const frame = useCurrentFrame();

  // Handoff: the card from scene 01 is still here, then folds into the wall.
  const collapse = interpolate(frame, [8, 34], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const heroFade = interpolate(frame, [18, 34], [1, 0], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scrim = interpolate(frame, [64, 88], [0, WALL_SCRIM], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: c.creme, fontFamily: font }}>
      <CardGrid frame={frame} revealStart={10} each={2.2} />

      <div
        id="handoff-card"
        style={{
          position: "absolute",
          left: 960 - HERO_CARD.w / 2,
          top: 540 - HERO_CARD.h / 2,
          width: HERO_CARD.w,
          height: HERO_CARD.h,
          opacity: heroFade,
          transform: `scale(${1 - collapse * 0.6})`,
        }}
      >
        <AppCard
          seed={HERO_CARD.seed}
          width={HERO_CARD.w}
          height={HERO_CARD.h}
          radius={HERO_CARD.radius}
        />
      </div>

      {/* Creme scrim pushes the wall back so the copy can land on it. */}
      <div
        id="wall-scrim"
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(247,244,237,${scrim})`,
        }}
      />

      <Sequence from={56} durationInFrames={94}>
        <div
          id="eyebrow-since"
          style={{
            position: "absolute",
            top: 386,
            left: 0,
            width: 1920,
            textAlign: "center",
            color: c.muted,
            ...type.eyebrow,
          }}
        >
          <TextAnimation
            text="Since November 2024"
            by="word"
            preset="fadeUp"
            duration={10}
            stagger={2}
            exit="auto"
          />
        </div>
      </Sequence>

      {/* Held back until the wall has largely finished building itself. */}
      <Sequence from={78} durationInFrames={72}>
        <div
          id="millions-headline"
          style={{
            position: "absolute",
            top: 456,
            left: 0,
            width: 1920,
            textAlign: "center",
            color: c.ink,
            ...type.h1,
          }}
        >
          <TextAnimation
            text={["Millions of people", "built their own websites."]}
            by="line"
            preset="lineRise"
            duration={13}
            stagger={4}
            hold="breathe"
            exit="auto"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
}
