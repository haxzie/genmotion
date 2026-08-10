import { Easing, interpolate, useCurrentFrame } from "@genmotion/motion";
import type { MetricPoint } from "../types";
import { alpha, linePath, resample } from "./shared";

/**
 * A small history curve for the templates whose subject is a number rather than
 * a chart.
 *
 * `count-up` and `stat-card` are source-agnostic, so a star-history video used
 * to look identical to a plain star-count one — the history was in the data and
 * never on screen. This puts it back, quietly: it reads as texture under the
 * headline rather than as a chart to be studied, which is `chart-rise`'s job.
 *
 * Like `chart-rise`, the geometry is a pure function of the frame — the path's
 * `d` is recomputed per frame because GSAP has no way to tween it.
 */

/** Points the curve is resampled onto. Fewer than chart-rise; it's smaller. */
const RESOLUTION = 80;

export interface SparklineProps {
  series: MetricPoint[];
  accent: string;
  width: number;
  height: number;
  strokeWidth: number;
  /** Frames over which the curve draws itself in. */
  drawFrom?: number;
  drawTo?: number;
}

export function Sparkline({
  series,
  accent,
  width,
  height,
  strokeWidth,
  drawFrom = 16,
  drawTo = 112,
}: SparklineProps) {
  const frame = useCurrentFrame();

  const values = resample(series, RESOLUTION);
  if (values.length < 2) return null;

  const peak = Math.max(...values, 1);

  const drawn = interpolate(frame, [drawFrom, drawTo], [0, 1], {
    easing: Easing.outCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visible = values.slice(0, Math.max(2, Math.round(drawn * RESOLUTION)));

  // The stroke is centred on the path, so inset the plot by half of it at the
  // top and by the head dot's radius at the bottom — otherwise the peak and the
  // baseline are shaved off by the viewBox.
  const dot = strokeWidth * 1.7;
  const top = strokeWidth / 2;
  const plot = height - top - dot;

  const points = visible.map((v, i) => ({
    x: (width * i) / (RESOLUTION - 1),
    y: top + plot - (plot * v) / peak,
  }));
  const last = points[points.length - 1] ?? { x: 0, y: height };

  const path = linePath(points);
  const area = `${path} L${last.x.toFixed(2)},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <path d={area} fill={alpha(accent, 0.14)} />
      <path
        d={path}
        fill="none"
        stroke={alpha(accent, 0.85)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={dot} fill={accent} />
    </svg>
  );
}
