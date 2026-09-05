import {
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import { brand, grid } from "./brand";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Shape of the growth curve, as 14 evenly spaced control points from launch to
 * today. Deliberately unlabelled on the y-axis: GitHub no longer exposes
 * per-star timestamps, so only the endpoints (dates and the final total) are
 * stated as fact — the curve itself reads as shape, not as data.
 */
const CTRL = [
  0, 0.055, 0.095, 0.15, 0.215, 0.275, 0.34, 0.41, 0.48, 0.56, 0.65, 0.755,
  0.87, 1,
];

/** Catmull-Rom through the control points — smooth and monotonic here. */
function curveAt(t: number): number {
  const n = CTRL.length - 1;
  const s = Math.min(Math.max(t, 0), 1) * n;
  const i = Math.min(Math.floor(s), n - 1);
  const u = s - i;
  const p0 = CTRL[Math.max(i - 1, 0)];
  const p1 = CTRL[i];
  const p2 = CTRL[i + 1];
  const p3 = CTRL[Math.min(i + 2, n)];
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
  );
}

const X0 = grid.margin;
const X1 = grid.W - grid.margin;
const SPAN = X1 - X0;
const BASE = grid.baseline;
const TOP = grid.chartTop;
const HEIGHT = BASE - TOP;
const SAMPLES = 180;

function pointAt(t: number) {
  return {
    x: X0 + t * SPAN,
    y: BASE - curveAt(t) * HEIGHT,
  };
}

/**
 * The star-history curve, growing left to right along the bottom of the frame.
 * Sits behind the counter as the scene's floor.
 */
export function StarHistoryChart({
  startFrom = 22,
  duration = 210,
}: {
  startFrom?: number;
  duration?: number;
}) {
  const frame = useCurrentFrame();

  // Eased to match the counter's deceleration, so the head and the digits
  // settle on the same beat.
  const p = interpolate(frame, [startFrom, startFrom + duration], [0, 1], {
    easing: Easing.outCubic,
    ...CLAMP,
  });

  const fade = interpolate(frame, [startFrom - 6, startFrom + 10], [0, 1], {
    easing: Easing.outCubic,
    ...CLAMP,
  });

  const head = pointAt(p);

  // Sample only the drawn portion so the head dot rides the real path end.
  const pts = Array.from({ length: SAMPLES + 1 }, (_, i) =>
    pointAt((i / SAMPLES) * p),
  );
  const line = pts
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${head.x.toFixed(2)} ${BASE} L${X0} ${BASE} Z`;

  // Ambient: the head keeps breathing once the curve has landed.
  const pulse =
    0.5 +
    0.5 *
      Math.sin(((frame - startFrom) / 30) * Math.PI * 0.8);
  const settled = interpolate(
    frame,
    [startFrom + duration - 30, startFrom + duration],
    [0, 1],
    CLAMP,
  );

  return (
    <svg
      id="star-history-chart"
      width={grid.W}
      height={grid.H}
      viewBox={`0 0 ${grid.W} ${grid.H}`}
      style={{ position: "absolute", inset: 0, opacity: fade }}
    >
      <defs>
        <linearGradient id="fc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={brand.flame} stopOpacity={0.26} />
          <stop offset="55%" stopColor={brand.flame} stopOpacity={0.09} />
          <stop offset="100%" stopColor={brand.flame} stopOpacity={0.015} />
        </linearGradient>
      </defs>

      {/* area under the curve */}
      <path d={area} fill="url(#fc-area)" />

      {/* the curve itself */}
      <path
        d={line}
        fill="none"
        stroke={brand.flame}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* dropline from the head to the baseline */}
      <line
        x1={head.x}
        y1={head.y}
        x2={head.x}
        y2={BASE}
        stroke={brand.flame}
        strokeWidth={1}
        strokeDasharray="5 7"
        opacity={0.4}
      />

      {/* head marker */}
      <circle
        cx={head.x}
        cy={head.y}
        r={16 + pulse * 8 * (0.35 + settled * 0.65)}
        fill={brand.flame}
        opacity={0.14 + pulse * 0.08}
      />
      <circle
        cx={head.x}
        cy={head.y}
        r={9}
        fill={brand.flame}
        stroke={brand.paper}
        strokeWidth={4}
      />
    </svg>
  );
}
