import * as React from "react";
import { useCurrentFrame, Img } from "@genmotion/motion";

/* ------------------------------------------------------------------ *
 *  Measured from Apple's "Don't Blink" (107s, 1080p, 29.97fps).
 *  Background #000000 / text #ffffff, both pure. Inverted cards are
 *  #ffffff / #000000. Type is SF Pro Display Bold, locked dead centre
 *  at (960, 540) on every single card. There is NO animation anywhere
 *  in the reference — every change is a hard cut on the beat.
 * ------------------------------------------------------------------ */

export const BLACK = "#000000";
export const WHITE = "#ffffff";

export const SF =
  '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Helvetica Neue", Helvetica, Inter, Arial, sans-serif';

/** One eighth-note at 90 BPM / 30fps — the tempo of the track on the
 *  timeline. Every cut lands on this grid. 900 frames = 90 units. */
export const UNIT = 10;

/** Cap heights measured off the reference, converted to font-size. */
const SIZE = {
  sm: 68,
  md: 112,
  lg: 176,
  xl: 268,
  bleed: 960,
} as const;

export type CardSize = keyof typeof SIZE;

export type Card = {
  /** the words on screen */
  t?: string;
  /** how long it holds, in eighth-notes */
  u: number;
  size?: CardSize;
  /** white background, black type — the percussive accent */
  invert?: boolean;
  /** blow the first 2 frames out to a solid frame: a strobe on the beat */
  flash?: boolean;
  /** explicit font size, for bleed words that need to fit the frame */
  fs?: number;
  /** replaces the text entirely (logo card, fine-print gag) */
  node?: React.ReactNode;
};

type Slot = Card & { start: number; end: number };

function schedule(script: Card[]): Slot[] {
  const slots: Slot[] = [];
  let acc = 0;
  for (const c of script) {
    const start = Math.round(acc);
    acc += c.u * UNIT;
    slots.push({ ...c, start, end: Math.round(acc) });
  }
  return slots;
}

/**
 * The card machine. Renders exactly one card per frame, hard-cut.
 * No easing, no opacity ramps, no transforms — that is the style.
 */
export function Cards({ script }: { script: Card[] }) {
  const frame = useCurrentFrame();
  const slots = React.useMemo(() => schedule(script), [script]);

  let card = slots[slots.length - 1];
  for (const s of slots) {
    if (frame < s.end) {
      card = s;
      break;
    }
  }

  const size = card.size ?? "sm";
  const fontSize = card.fs ?? SIZE[size];
  const bg = card.invert ? WHITE : BLACK;
  const fg = card.invert ? BLACK : WHITE;

  // Two frames of solid colour at the cut — the beat you feel rather than read.
  const strobe = card.flash === true && frame - card.start < 2;

  return (
    <div
      id="card-stage"
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: strobe ? fg : bg,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {strobe ? null : card.node ? (
        card.node
      ) : (
        <div
          id="card-text"
          style={{
            fontFamily: SF,
            fontWeight: 700,
            fontSize,
            lineHeight: size === "bleed" ? 0.78 : 1.05,
            letterSpacing: fontSize > 200 ? "-0.035em" : fontSize > 100 ? "-0.025em" : "-0.012em",
            color: fg,
            textAlign: "center",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {card.t}
        </div>
      )}
    </div>
  );
}

/** A full-frame card with no type — used to sit on the logo. */
export function MarkCard({ src, size = 190 }: { src: string; size?: number }) {
  return (
    <Img
      id="card-mark"
      src={src}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
