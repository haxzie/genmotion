import type { MetricPoint } from "../types";

/** Full thousands-separated form: 238412 -> "238,412". */
export function formatFull(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/**
 * How a value breaks down in compact form. Shared by `formatCompact` and the
 * rolling number, so the static text and the odometer can never disagree about
 * the scale or the suffix.
 */
export function compactParts(n: number): {
  divisor: number;
  decimals: number;
  suffix: string;
} {
  const abs = Math.abs(n);
  const divisor =
    abs >= 1_000_000_000 ? 1_000_000_000 : abs >= 1_000_000 ? 1_000_000 : abs >= 10_000 ? 1000 : 1;
  const suffix = divisor === 1_000_000_000 ? "B" : divisor === 1_000_000 ? "M" : divisor === 1000 ? "K" : "";
  const scaled = abs / divisor;
  // 3 significant figures reads better than a fixed decimal count across
  // magnitudes: 1.24M, 12.4M, 124M.
  const decimals = divisor === 1 ? 0 : scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return { divisor, decimals, suffix };
}

/** Compact form for tight spaces: 238412 -> "238.4K", 1240000 -> "1.24M". */
export function formatCompact(n: number): string {
  const { divisor, decimals, suffix } = compactParts(n);
  if (divisor === 1) return formatFull(n);
  return `${(n / divisor).toFixed(decimals).replace(/\.0+$/, "")}${suffix}`;
}

/**
 * Which integer places take a thousands separator immediately *before* them.
 *
 * Groups run 10^0..10^2, 10^3..10^5, and so on, so the comma sits at the top of
 * each group — before places 2, 5, 8. In 238,412 the comma precedes the 10^2
 * digit ("4"), giving 238,412 rather than 23,8412.
 */
export function groupPositions(digits: number): Set<number> {
  const places = new Set<number>();
  for (let e = 2; e < digits - 1; e += 3) places.add(e);
  return places;
}

export function formatSigned(n: number): string {
  return `${n >= 0 ? "+" : "−"}${formatFull(Math.abs(n))}`;
}

/**
 * Lighten/darken a hex colour towards white (positive) or black (negative).
 * Templates use this to derive a palette from `data.accent` without needing a
 * colour library. `amount` is 0..1.
 */
export function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1]!, 16);
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * t);
  const r = mix((int >> 16) & 0xff);
  const g = mix((int >> 8) & 0xff);
  const b = mix(int & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** `rgba()` string from a hex colour — safe in `foreignObject`, unlike `color-mix()`. */
export function alpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1]!, 16);
  return `rgba(${(int >> 16) & 0xff}, ${(int >> 8) & 0xff}, ${int & 0xff}, ${a})`;
}

/**
 * Resample an irregular series onto `count` evenly spaced points, so the chart
 * geometry doesn't depend on how the source happened to sample its history.
 * Values are linearly interpolated between neighbours.
 */
export function resample(series: MetricPoint[], count: number): number[] {
  if (series.length === 0) return [];
  if (series.length === 1) return new Array(count).fill(series[0]!.v);

  const sorted = [...series].sort((a, b) => a.t - b.t);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const span = last.t - first.t;
  if (span <= 0) return new Array(count).fill(last.v);

  const out: number[] = [];
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const t = first.t + (span * i) / (count - 1);
    while (cursor < sorted.length - 2 && sorted[cursor + 1]!.t < t) cursor++;
    const a = sorted[cursor]!;
    const b = sorted[cursor + 1] ?? a;
    const dt = b.t - a.t;
    out.push(dt <= 0 ? b.v : a.v + ((b.v - a.v) * (t - a.t)) / dt);
  }
  return out;
}

/**
 * The largest font size at which something `widthInEm` wide still fits
 * `maxWidth`, never exceeding `desired`.
 *
 * This is what keeps 1:1 and 9:16 honest. Every template sizes type off the
 * SHORT edge so the design scales, but what a headline has to fit into is the
 * LONG edge minus padding — at 9:16 those are 1080 and 1920, so a size that is
 * comfortable in landscape overflows the frame in portrait and the text is
 * clipped at both margins. Sizing down to fit is the fix; nothing is ever
 * trimmed.
 */
export function fitSize(desired: number, maxWidth: number, widthInEm: number): number {
  if (!(maxWidth > 0) || !(widthInEm > 0)) return desired;
  return Math.min(desired, maxWidth / widthInEm);
}

/**
 * Width of a run of text in em, estimated from its length.
 *
 * Real subjects — repo slugs, package names, channel handles, the source
 * captions — measure between 0.47 and 0.55 em per character in Geist. 0.62 sits
 * above that whole range, so the estimate errs towards a slightly smaller font
 * rather than an overflowing one. Digits don't go through here: `RollingNumber`
 * knows its exact glyph composition and computes a real width.
 */
const TEXT_EM_PER_CHAR = 0.62;

export function textEm(text: string): number {
  return text.length * TEXT_EM_PER_CHAR;
}

/** Build an SVG path through points already mapped into the viewBox. */
export function linePath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
}
