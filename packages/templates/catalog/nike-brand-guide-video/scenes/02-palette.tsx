import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { C, LABEL } from "../components/brand";

// Beat 2 — the palette, as overlapping SHEETS rather than stacked bars.
//
// Each sheet runs from its own left edge all the way to the right of frame,
// and slides in over the one before it. What reads as a row of colour bars is
// really the slivers of the earlier sheets still showing on the left. The last
// sheet keeps travelling until it floods the frame, which is what 03 opens on.

type Sheet = {
  hex: string;
  label: string;
  /** Resting left edge. */
  x: number;
  /** Frame the sheet starts sliding in. */
  at: number;
  onDark?: boolean;
};

const SHEETS: Sheet[] = [
  { hex: C.ink, label: "#101010", x: 0, at: 0, onDark: true },
  { hex: C.sand, label: "#D1C481", x: 864, at: 4 },
  { hex: C.bone, label: "#D1CDC9", x: 1130, at: 24 },
  { hex: C.paper, label: "#FEFEFE", x: 1426, at: 44 },
];

// Paced off the reference: sheets arrive across ~2s, then the flood to white
// completes exactly on the scene's last frame (5.27s on the timeline).
const SLIDE = 16;
const FLOOD_FROM = 68;
const FLOOD_TO = 84;

export default function Scene() {
  const frame = useCurrentFrame();

  // Current left edge of every sheet. The last one has a second leg: after
  // resting it carries on to 0 and floods the frame.
  const lefts = SHEETS.map((s, i) => {
    if (i === 0) return 0;
    const isLast = i === SHEETS.length - 1;
    return interpolate(
      frame,
      isLast
        ? [s.at, s.at + SLIDE, FLOOD_FROM, FLOOD_TO]
        : [s.at, s.at + SLIDE],
      isLast ? [1920, s.x, s.x, 0] : [1920, s.x],
      {
        easing: Easing.outSmooth,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
  });

  const labelsOut = interpolate(frame, [60, 68], [1, 0], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, overflow: "hidden" }}>
      {SHEETS.map((s, i) => {
        const left = lefts[i];
        return (
          <div
            key={s.hex}
            id={`sheet-${i}`}
            style={{
              position: "absolute",
              left,
              top: 0,
              width: 1920 - left,
              height: 1080,
              backgroundColor: s.hex,
              zIndex: i,
            }}
          />
        );
      })}

      {/* Labels ride the centre of whatever sliver their sheet still shows, so
          they glide left as the next sheet covers them. */}
      {SHEETS.map((s, i) => {
        const left = lefts[i];
        const right = i + 1 < lefts.length ? lefts[i + 1] : 1920;
        const width = Math.max(0, right - left);
        const centre = left + width / 2;

        const appear = interpolate(
          frame,
          [s.at + SLIDE * 0.45, s.at + SLIDE * 0.45 + 9],
          [0, 1],
          {
            easing: Easing.outSmooth,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        // Fade out if the sliver gets too tight to hold the label.
        const room = interpolate(width, [150, 260], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={`${s.hex}-label`}
            id={`swatch-label-${i}`}
            style={{
              position: "absolute",
              left: centre,
              top: 540,
              zIndex: 10,
              transform: `translate(-50%, calc(-50% + ${(1 - appear) * 16}px))`,
              fontFamily: LABEL,
              fontSize: 52,
              fontWeight: 400,
              color: s.onDark ? C.paper : C.ink,
              opacity: appear * room * labelsOut,
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
