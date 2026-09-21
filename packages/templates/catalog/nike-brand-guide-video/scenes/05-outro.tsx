import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { GlitchFlash } from "../components/GlitchText";
import { Swoosh } from "../components/Swoosh";
import { BRAND, C, CONDENSED, LABEL, OUTRO_BLOCKS } from "../components/brand";
import gmMark from "../assets/genmotion-mark.png";

// Beat 5 — the blocks handed over by 04 travel from their scattered positions
// into a centred, aligned row, resolving into the tagline as they go. The
// tagline then flash-glitches out and the mark flash-glitches in.

// Measured off a rendered frame, not guessed. Each box is exactly its word's
// glyph width, so the only space between words is GAP — hand-estimated widths
// leave uneven slack inside the boxes and the gaps come out ragged.
const SIZES = [
  { w: 263, h: 118 },
  { w: 122, h: 118 },
  { w: 99, h: 118 },
];

// The assembled lockup: one row, centred in frame, all on a common baseline.
// ~0.25em at 118px is a natural word space.
const GAP = 30;
const ROW_W = SIZES.reduce((n, s) => n + s.w, 0) + GAP * (SIZES.length - 1);
const ROW_X = (1920 - ROW_W) / 2;
const ROW_Y = 540 - SIZES[0].h / 2;

const TARGETS = SIZES.map((s, i) => ({
  x: ROW_X + SIZES.slice(0, i).reduce((n, p) => n + p.w + GAP, 0),
  y: ROW_Y,
  w: s.w,
  h: s.h,
}));

const TAGLINE_OUT = 48;
const MARK_IN = 56;
const MARK_OUT = 92;
const SIGNOFF_IN = 100;

export default function Scene() {
  const frame = useCurrentFrame();

  const markBreathe = interpolate(frame, [70, 81, 92], [1, 1.02, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, overflow: "hidden" }}>
      {/* The blocks assemble into the tagline, then the whole group flashes
          out as one — so the lockup leaves as a unit, not word by word. */}
      <GlitchFlash
        id="tagline-group"
        from={0}
        duration={0}
        exitAt={TAGLINE_OUT}
        exitDuration={12}
        seed="tag"
        style={{ position: "absolute", inset: 0 }}
      >
        {BRAND.outroWords.map((text, i) => {
          const block = OUTRO_BLOCKS[i];
          const target = TARGETS[i];
          const at = 8 + i * 4;

          // Scattered block → its place in the centred row.
          const travel = interpolate(frame, [at, at + 22], [0, 1], {
            easing: Easing.outSmooth,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          // White block hands off to the glyphs on the way.
          const toText = interpolate(frame, [at + 9, at + 20], [0, 1], {
            easing: Easing.inOutCubic,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const x = block.x + (target.x - block.x) * travel;
          const y = block.y + (target.y - block.y) * travel;
          const w = block.w + (target.w - block.w) * travel;
          const h = block.h + (target.h - block.h) * travel;

          // Ambient drift once assembled. Shared phase across all three words —
          // a per-word offset makes them bob independently and breaks the
          // common baseline, which stops it reading as one sentence.
          const float = Math.sin(frame / 26) * 2.5 * travel;

          return (
            <div
              key={text}
              id={`outro-word-${i}`}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: w,
                height: h,
                transform: `translateY(${float}px)`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "#FFFFFF",
                  opacity: 1 - toText,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  fontFamily: CONDENSED,
                  fontWeight: 800,
                  fontSize: 118,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  color: C.paper,
                  opacity: toText,
                  whiteSpace: "nowrap",
                }}
              >
                {text}
              </span>
            </div>
          );
        })}
      </GlitchFlash>

      {/* The mark flashes in as the tagline finishes breaking up, holds, then
          flashes back out to hand over to the sign-off. */}
      <GlitchFlash
        id="mark-group"
        from={MARK_IN}
        duration={14}
        exitAt={MARK_OUT}
        exitDuration={10}
        seed="mark"
        style={{ position: "absolute", inset: 0 }}
      >
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            // Negative Y scale flips the mark, matching scene 01.
            transform: `scale(${markBreathe}, ${-markBreathe})`,
          }}
        >
          <Swoosh id="outro-mark" width={340} variant="white" />
        </AbsoluteFill>
      </GlitchFlash>

      {/* Sign-off: the mark glitches away and this resolves in its place. */}
      <GlitchFlash
        id="signoff-group"
        from={SIGNOFF_IN}
        duration={14}
        seed="sign"
        style={{ position: "absolute", inset: 0 }}
      >
        <AbsoluteFill
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
          }}
        >
          <Img
            id="signoff-mark"
            src={gmMark}
            style={{ width: 96, height: 96, objectFit: "contain" }}
          />
          <span
            id="signoff-text"
            style={{
              fontFamily: LABEL,
              fontSize: 76,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: C.paper,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            genmotion.dev
          </span>
        </AbsoluteFill>
      </GlitchFlash>

    </AbsoluteFill>
  );
}
