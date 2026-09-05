import {
  AbsoluteFill,
  CountText,
  TextAnimation,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { CardGrid } from "../components/CardGrid";
import { c, font, gradFull, type, WALL_SCRIM } from "../components/brand";

const STATS = [
  { id: "stat-projects", to: 60, suffix: "M", decimals: 0, label: "projects built" },
  { id: "stat-visits", to: 900, suffix: "M", decimals: 0, label: "monthly visits" },
  { id: "stat-fortune", to: 65, suffix: "%", decimals: 0, label: "of the Fortune 500" },
];

/** Scene 02 is 150 frames — keeps the wall drifting through the cut. */
const WALL_OFFSET = 150;

export default function Scene() {
  const frame = useCurrentFrame();

  const out = interpolate(frame, [84, 96], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Handoff out: the brand spectrum wipes across the frame.
  const wipe = interpolate(frame, [96, 118], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: c.creme, fontFamily: font }}>
      <CardGrid frame={frame + WALL_OFFSET} revealStart={-4000} />
      <div
        id="wall-scrim"
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(247,244,237,${WALL_SCRIM})`,
        }}
      />

      <div
        id="stats-row"
        style={{
          position: "absolute",
          top: 396,
          left: 0,
          width: 1920,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 0,
        }}
      >
        {STATS.map((stat, i) => {
          const p = interpolate(frame, [i * 5, i * 5 + 14], [0, 1], {
            easing: Easing.outSmooth,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const bob = Math.sin((frame - i * 12) * 0.035) * 3;
          return (
            <div
              key={stat.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              {i > 0 && (
                <div
                  style={{
                    width: 1,
                    height: 150,
                    marginTop: 22,
                    background: "rgba(27,27,27,0.14)",
                    opacity: p * (1 - out),
                  }}
                />
              )}
              <div
                id={stat.id}
                style={{
                  width: 520,
                  textAlign: "center",
                  opacity: p * (1 - out),
                  transform: `translateY(${(1 - p) * 52 + out * -44 + bob}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 112,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    color: c.ink,
                  }}
                >
                  <CountText
                    to={stat.to}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                    startFrom={8 + i * 10}
                    duration={48}
                  />
                </div>
                <div
                  style={{
                    marginTop: 22,
                    ...type.body,
                    fontWeight: 600,
                    color: c.ink,
                  }}
                >
                  <TextAnimation
                    text={stat.label}
                    by="word"
                    preset="fadeUp"
                    startFrom={16 + i * 10}
                    duration={11}
                    stagger={2}
                    hold="float"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Handoff element — scene 04 opens on this exact band. */}
      <div
        id="gradient-band"
        style={{
          position: "absolute",
          left: 0,
          top: 492,
          height: 96,
          width: 1920 * wipe,
          overflow: "hidden",
        }}
      >
        <div style={{ width: 1920, height: 96, background: gradFull }} />
      </div>
    </AbsoluteFill>
  );
}
