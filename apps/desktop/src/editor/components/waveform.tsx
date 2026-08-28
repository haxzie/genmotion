"use client";

import { useMemo } from "react";
import { cx } from "@/components/ui";
import { useWaveform, sampleEnvelope } from "@/hooks/use-waveform";

/**
 * Vertical detail of the SVG. The path is drawn in this coordinate space and
 * stretched to the strip with `preserveAspectRatio="none"`, so the numbers here
 * are pure geometry — nothing depends on the rendered pixel height.
 */
const VIEW_H = 100;
/** Height of the silence line, in view units — a hairline along the base. */
const FLOOR = 2.5;
/** Card pixels per sampled column. Roughly one column per 2px reads clean: */
const PX_PER_COLUMN = 2;
/**
 * Moving-average radius over the sampled columns. One neighbour each side is
 * enough to take the fizz off dense material without rounding beats away.
 */
const SMOOTH_RADIUS = 1;

/** Moving average over the column series — the last of the de-fuzzing steps. */
function smooth(values: number[], radius: number): number[] {
  if (radius <= 0) return values;
  return values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let k = -radius; k <= radius; k++) {
      const v = values[i + k];
      if (v !== undefined) {
        sum += v;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  });
}

/**
 * Outline of the waveform: a smooth curve across the top of the levels, closed
 * down to the baseline so the shape sits ON the bottom edge of the card. One
 * sided — the mirrored form halves the height available to each lobe, which at
 * this size is what made it read as noise rather than as sound.
 *
 * The curve is Catmull-Rom through one point per column, emitted as cubic
 * béziers. Columns are evenly spaced, so each control point sits a third of a
 * column either side of its anchor.
 */
function envelopePath(levels: number[]): string {
  const n = levels.length;
  if (n === 0) return "";
  // Anchor at each column's centre; y grows downward, so a loud column is a
  // SMALL y. Silence still gets FLOOR, so the baseline never disappears.
  const y = (i: number) =>
    VIEW_H - Math.max(FLOOR, (levels[Math.min(n - 1, Math.max(0, i))] ?? 0) * VIEW_H);
  const x = (i: number) => i + 0.5;
  // A control point may only be lifted within the box — without this, a spike
  // next to silence overshoots below the baseline and punches a hole in the fill.
  const clamp = (v: number) => Math.min(VIEW_H, Math.max(0, v));

  let d = `M0 ${VIEW_H}L${x(0).toFixed(2)} ${y(0).toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1y = clamp(y(i) + (y(i + 1) - y(i - 1)) / 6);
    const c2y = clamp(y(i + 1) - (y(i + 2) - y(i)) / 6);
    d +=
      `C${(x(i) + 1 / 3).toFixed(2)} ${c1y.toFixed(2)},` +
      `${(x(i + 1) - 1 / 3).toFixed(2)} ${c2y.toFixed(2)},` +
      `${x(i + 1).toFixed(2)} ${y(i + 1).toFixed(2)}`;
  }
  return `${d}L${n} ${VIEW_H}L0 ${VIEW_H}Z`;
}

/**
 * One shared waveform so every strip in the editor — scene voiceovers and
 * project audio clips alike — renders identically. Only the tint differs per
 * context (purple for scenes, the lane's own hue for audio), passed via
 * `selectedClassName`.
 *
 * It draws a single-sided filled envelope planted on the card's bottom edge:
 * full-bleed horizontally, so a column's position is exactly its position in
 * time within the clip, and loudness reads as height off the floor.
 *
 * Callers own the surrounding container (its position in the card, the mute
 * button); this component owns the strip's height and the shape inside it.
 */
export function Waveform({
  url,
  widthPx,
  startSec = 0,
  durationSec,
  heightPx = 22,
  selected,
  selectedClassName,
  inactiveClassName = "text-text-tertiary",
  className,
}: {
  url: string;
  /** Card width in px — drives column count so wider cards show more detail. */
  widthPx: number;
  /** Seconds into the source where the card begins (0 for scenes; clip trim). */
  startSec?: number;
  /** Card length in seconds — waveform maps to real time, flat past the audio. */
  durationSec: number;
  /** Strip height in px. The card owns it; the shape scales to whatever it is. */
  heightPx?: number;
  selected: boolean;
  /** Fill color when selected, as a text color (e.g. "text-orange"). */
  selectedClassName: string;
  /** Fill color when NOT selected — tints the waveform to the card's theme. */
  inactiveClassName?: string;
  /** Extra container classes (flex sizing, muted opacity). */
  className?: string;
}) {
  const columns = Math.max(
    8,
    Math.min(400, Math.floor(widthPx / PX_PER_COLUMN)),
  );
  const data = useWaveform(url);
  const d = useMemo(
    () =>
      envelopePath(
        smooth(
          sampleEnvelope(data, columns, startSec, durationSec),
          SMOOTH_RADIUS,
        ),
      ),
    [data, columns, startSec, durationSec],
  );

  return (
    // No padding: the shape is meant to sit flush in the card, which clips it
    // to its own rounded corners. The height is the card's call — the viewBox
    // is stretched, so the shape reads the same at any strip height.
    <div className={cx(className)} style={{ height: heightPx }}>
      <svg
        viewBox={`0 0 ${columns} ${VIEW_H}`}
        // The viewBox is in columns, not pixels: let it stretch to the card's
        // real width instead of letter-boxing the shape.
        preserveAspectRatio="none"
        className={cx(
          "h-full w-full",
          selected ? selectedClassName : inactiveClassName,
        )}
      >
        <path d={d} fill="currentColor" />
      </svg>
    </div>
  );
}
