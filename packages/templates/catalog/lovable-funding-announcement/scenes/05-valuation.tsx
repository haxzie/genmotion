import {
  AbsoluteFill,
  CountText,
  Img,
  Sequence,
  TextAnimation,
  Easing,
  interpolate,
  spring,
  springPresets,
  useCurrentFrame,
  useVideoConfig,
} from "@genmotion/motion";
import { Backdrop } from "../components/Backdrop";
import { c, font, gradFull, type } from "../components/brand";
import mark from "../assets/lovable-mark.svg";

/** Handoff geometry — scene 06 opens on the mark at exactly this size. */
export const MARK = { size: 300, cy: 540 };

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dividerTop = interpolate(frame, [92, 108], [170, -40], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dividerFade = interpolate(frame, [92, 106], [1, 0], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const heroIn = interpolate(frame, [4, 20], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const heroOut = interpolate(frame, [86, 98], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathe = 1 + 0.006 * Math.sin(frame * 0.05);

  const markIn = spring({
    frame,
    fps,
    config: springPresets.gentle,
    delay: 98,
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill style={{ fontFamily: font }}>
      <Backdrop frame={frame} />

      {/* Handoff in: the divider scene 04 handed over. */}
      <div
        id="gradient-band"
        style={{
          position: "absolute",
          left: 0,
          top: dividerTop,
          width: 1920,
          height: 6,
          opacity: dividerFade,
          background: gradFull,
        }}
      />

      <div
        id="valuation-amount"
        style={{
          position: "absolute",
          top: 292,
          left: 0,
          width: 1920,
          textAlign: "center",
          color: c.ink,
          fontSize: 176,
          fontWeight: 600,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          opacity: heroIn * (1 - heroOut),
          transform: `translateY(${(1 - heroIn) * 40 + heroOut * -36}px) scale(${breathe})`,
          filter: `blur(${(1 - heroIn) * 12 + heroOut * 10}px)`,
        }}
      >
        <CountText
          to={13.3}
          decimals={1}
          prefix="$"
          suffix="B"
          startFrom={6}
          duration={42}
        />
      </div>

      <Sequence from={16} durationInFrames={86}>
        <div
          id="valuation-label"
          style={{
            position: "absolute",
            top: 498,
            left: 0,
            width: 1920,
            textAlign: "center",
            color: c.muted,
            ...type.eyebrow,
          }}
        >
          <TextAnimation
            text="Valuation"
            by="char"
            preset="fadeUp"
            duration={10}
            stagger={2}
            exit="auto"
          />
        </div>
      </Sequence>

      <Sequence from={44} durationInFrames={58}>
        <div
          id="backed-by"
          style={{
            position: "absolute",
            top: 636,
            left: 0,
            width: 1920,
            textAlign: "center",
            color: c.ink,
            fontSize: 34,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.6,
          }}
        >
          <TextAnimation
            text={[
              "Accel · Balderton · CapitalG · DST Global · Tencent",
              "Salesforce Ventures · HubSpot Ventures · Kaszek · World Innovation Lab",
            ]}
            by="line"
            preset="blurUp"
            duration={12}
            stagger={4}
            exit="auto"
          />
        </div>
      </Sequence>

      {/* Handoff out — the mark takes over. No exit. */}
      <div
        id="lovable-mark"
        style={{
          position: "absolute",
          left: 960 - MARK.size / 2,
          top: MARK.cy - MARK.size / 2,
          width: MARK.size,
          height: MARK.size,
          opacity: Math.min(1, markIn * 3),
          transform: `scale(${0.3 + markIn * 0.7})`,
        }}
      >
        <Img
          src={mark}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    </AbsoluteFill>
  );
}
