import {
  AbsoluteFill,
  Sequence,
  TextAnimation,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { brand } from "../components/brand";

// --- beats -----------------------------------------------------------------
const WORD_1 = 8; // "Introducing"
const WORD_2 = 20; // "Sequel"
const FLIP = 66; // Sequel -> Your team’s marketing brain

// slot widths, measured against Inter 96px / -0.025em advance widths.
// #intro-word is right-aligned with overflow visible, so an under-estimate
// spills leftward rather than clipping or opening a gap before "Sequel".
const W_INTRO = 505;
const W_SEQUEL = 300;
const W_BRAIN = 1225;

const SIZE = 96;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export default function Scene() {
  const frame = useCurrentFrame();

  // "Introducing" collapses on the flip so the new phrase eases back to centre
  const introW = interpolate(frame, [FLIP, FLIP + 14], [W_INTRO, 0], {
    ...clamp,
    easing: Easing.inOutCubic,
  });
  const introGap = interpolate(frame, [FLIP, FLIP + 14], [24, 0], {
    ...clamp,
    easing: Easing.inOutCubic,
  });
  const introOpacity = interpolate(frame, [FLIP, FLIP + 7], [1, 0], clamp);

  // the word slot: Sequel -> Your marketing brain
  const slotW = interpolate(frame, [FLIP, FLIP + 14], [W_SEQUEL, W_BRAIN], {
    ...clamp,
    easing: Easing.inOutCubic,
  });

  // "Sequel" flips up and away
  const seqRot = interpolate(frame, [FLIP, FLIP + 10], [0, -96], {
    ...clamp,
    easing: Easing.inOutCubic,
  });
  const seqOpacity = interpolate(frame, [FLIP + 2, FLIP + 9], [1, 0], clamp);

  return (
    <AbsoluteFill
      id="scene-root"
      style={{
        background: brand.bg,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: brand.font,
      }}
    >
      <div
        id="intro-line"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: SIZE,
          fontWeight: 500,
          letterSpacing: "-0.025em",
          color: brand.ink,
          lineHeight: 1.1,
        }}
      >
        {/* word 1 */}
        <div
          id="intro-word"
          style={{
            width: introW,
            marginRight: introGap,
            opacity: introOpacity,
            whiteSpace: "nowrap",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <TextAnimation text="Introducing" by="none" preset="typewriter" startFrom={WORD_1} />
        </div>

        {/* word 2 — the one that flips */}
        <div
          id="word-slot"
          style={{
            width: slotW,
            height: 132,
            flexShrink: 0,
            position: "relative",
            perspective: 1400,
          }}
        >
          <div
            id="brand-word"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
              transform: `rotateX(${seqRot}deg)`,
              transformOrigin: "center center",
              opacity: seqOpacity,
            }}
          >
            <TextAnimation text="Sequel" by="none" preset="typewriter" startFrom={WORD_2} />
          </div>

          <Sequence from={FLIP + 4}>
            <div
              id="brain-word"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
              }}
            >
              <TextAnimation
                text="Your team’s marketing brain"
                by="none"
                preset="flipUp"
                duration={13}
                exit="fadeUp"
                hold="breathe"
              />
            </div>
          </Sequence>
        </div>
      </div>
    </AbsoluteFill>
  );
}
