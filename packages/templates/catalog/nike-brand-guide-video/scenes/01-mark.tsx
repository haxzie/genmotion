import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { GlitchText } from "../components/GlitchText";
import { Swoosh } from "../components/Swoosh";
import { C, CONDENSED } from "../components/brand";

// Beat 1 — the mark draws on, the lockup resolves under it, then an ink panel
// wipes across from the right. That ink field is the handoff into 02-palette.
export default function Scene() {
  const frame = useCurrentFrame();

  const draw = interpolate(frame, [4, 20], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breathe = interpolate(frame, [20, 42, 66], [1, 1.022, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lift = interpolate(frame, [4, 22], [26, 0], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ink wipe: left edge travels from the right edge of frame to 0.
  // Lands on frame 59 — 1.97s — which is where the reference cuts to black.
  const wipe = interpolate(frame, [51, 59], [100, 0], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 96,
          // The reference centres the lockup a little below frame centre.
          transform: "translateY(92px)",
        }}
      >
        <div
          id="brand-mark"
          // Negative Y scale flips the mark. The clip reveal is horizontal, so
          // the draw-on direction is unaffected.
          style={{
            transform: `translateY(${lift}px) scale(${breathe}, ${-breathe})`,
          }}
        >
          <Swoosh width={400} variant="ink" clip={draw} />
        </div>

        <div
          id="lockup-tagline"
          style={{
            fontFamily: CONDENSED,
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: "-0.015em",
            color: C.ink,
            lineHeight: 1,
          }}
        >
          {/* Glitch-in only. The reference doesn't animate the lockup out —
              the ink wipe simply covers it — so there's no exit here. */}
          <GlitchText
            text="DO IT LATER."
            from={22}
            duration={16}
            color={C.ink}
          />
        </div>
      </AbsoluteFill>

      {/* Handoff: this panel owns the frame at the cut. */}
      <div
        id="ink-wipe"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: C.ink,
          transform: `translateX(${wipe}%)`,
        }}
      />
    </AbsoluteFill>
  );
}
