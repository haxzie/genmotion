import {
  AbsoluteFill,
  Easing,
  interpolate,
  stagger,
  useCurrentFrame,
  useVideoConfig,
} from "@genmotion/motion";
import { font, brand } from "../components/brand";
import { Cursor } from "../components/Cursor";

// Accelerating curve — the line launches upward and keeps going.
const EASE_IN = Easing.bezier(0.5, 0, 0.88, 0.2);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* The line is centred and ~1070px wide at 124px, so it runs roughly 425->1495.
   The sweep overshoots each end slightly to lead and clear the characters. */
const TEXT_L = 380;
const TEXT_R = 1545;
const TEXT_Y = 556;

/* Exactly where scene 2 opens its pointer: world (200, 1150) with the camera at
   x 0.25, y 0.5 lands on screen (200, 610) — already at the dock's height, so
   the pointer never has to climb once it's over there. Both scenes use the same
   Cursor component, so matching these numbers makes the cut invisible. */
const REST_X = 200;
const REST_Y = 610;

const LINE = "Introducing Prequel";
const EACH = 1.2;
const DUR = 16;
/* the last character starts here — the cursor sweep is timed to match */
const FRONT_END = (LINE.length - 1) * EACH;

/* Each glyph runs yellow -> green -> ink over its own entrance, so the colour
   travels across the line as a wave rather than changing all at once. */
const YELLOW: [number, number, number] = [240, 180, 41];
const GREEN: [number, number, number] = [47, 168, 79];
const INK: [number, number, number] = [22, 22, 26];
const TURN = 0.45;

const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;

const colorAt = (p: number) =>
  p < TURN ? mix(YELLOW, GREEN, p / TURN) : mix(GREEN, INK, (p - TURN) / (1 - TURN));

export default function Scene() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // A single slow drift on the whole line — coherent, and it keeps the hold alive
  // without the per-letter wobble that a character-level hold would give.
  const drift = Math.sin(frame / 34) * 4;

  // The pointer rides the reveal front. The stagger is linear, so this is linear
  // too — easing it would let it drift off the characters it is uncovering.
  const sweepX = interpolate(frame, [0, FRONT_END], [TEXT_L, TEXT_R], {
    easing: Easing.linear,
    ...clamp,
  });

  // Then it travels down to the exact screen position scene 2 opens on, and
  // STAYS there — it is the handoff, so it must not leave with the text.
  const travelX = interpolate(frame, [34, 54], [TEXT_R, REST_X], {
    easing: Easing.inOutCubic,
    ...clamp,
  });
  const cursorY = interpolate(frame, [34, 54], [TEXT_Y, REST_Y], {
    easing: Easing.inOutCubic,
    ...clamp,
  });
  const cursorX = sweepX + (travelX - TEXT_R);
  const cursorFade = interpolate(frame, [0, 5], [0, 1], clamp);

  // Exit: the whole line slides up and out, clearing before the cut.
  const out = interpolate(frame, [durationInFrames - 14, durationInFrames - 2], [0, 1], {
    easing: EASE_IN,
    ...clamp,
  });

  return (
    <AbsoluteFill style={{ background: "#ffffff" }}>
      <div
        id="intro-lockup"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${drift - 900 * out}px)`,
        }}
      >
        <h1
          id="intro-title"
          style={{
            margin: 0,
            fontSize: 124,
            fontWeight: 500,
            letterSpacing: "-0.035em",
            lineHeight: 1,
            fontFamily: font,
            whiteSpace: "nowrap",
            color: brand.text,
          }}
        >
          {LINE.split("").map((ch, i) => {
            const p = stagger({
              frame,
              index: i,
              each: EACH,
              duration: DUR,
              easing: Easing.outSmooth,
            });
            return (
              <span
                key={`${ch}-${i}`}
                style={{
                  display: "inline-block",
                  whiteSpace: "pre",
                  opacity: p,
                  color: colorAt(p),
                  filter: `blur(${(1 - p) * 13}px)`,
                  transform: `translateY(${(1 - p) * 46}px)`,
                }}
              >
                {ch === " " ? " " : ch}
              </span>
            );
          })}
        </h1>
      </div>

      {/* Outside the lockup on purpose: the line slides up and out, the pointer
          stays put and carries the cut into scene 2. */}
      <Cursor id="intro-cursor" x={cursorX} y={cursorY} opacity={cursorFade} />
    </AbsoluteFill>
  );
}
