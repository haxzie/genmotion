import {
  AbsoluteFill,
  Easing,
  gsap,
  interpolate,
  useCurrentFrame,
  useGsapTimeline,
  useVideoConfig,
} from "@genmotion/motion";
import type { MetricVideoData } from "../types";
import type { VideoTemplate } from "./types";
import { alpha, fitSize, linePath, resample, shade, textEm } from "./shared";
import { BrandMark } from "./brand";
import { RollingNumber } from "./rolling-number";

/** Points the curve is resampled onto — enough to read as smooth at 1080p. */
const RESOLUTION = 120;
/** Frame the curve starts drawing, and the frame it completes. */
const DRAW_FROM = 12;
const DRAW_TO = 140;

/**
 * History template: the curve draws in left to right while the headline number
 * counts along with it, so the number and the curve land together.
 */
function ChartRiseScene({ data }: { data: MetricVideoData }) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const unit = Math.min(width, height) / 100;
  const portrait = height > width;

  // Width budget for the header block — see `fitSize`. The header is inset by
  // `unit * 10` on each side.
  const content = width - unit * 20;

  const values = resample(data.series ?? [], RESOLUTION);
  const peak = Math.max(...values, 1);

  // Chart box, in composition pixels.
  //
  // The header and the bottom caption sit at fixed offsets (`unit` is the same
  // at every aspect), so the curve gets whatever is left between them — but
  // capped relative to its own width and centred in that gap. Without the cap a
  // 9:16 export stretches the curve into an implausibly steep wall; without the
  // centring the header is left floating above a void.
  const left = unit * 10;
  const right = width - unit * 10;
  const chartWidth = right - left;
  const gapTop = unit * 38;
  const gapBottom = height - unit * 16;
  const chartHeight = Math.min(gapBottom - gapTop, chartWidth * (portrait ? 1.1 : 0.45));
  const middle = (gapTop + gapBottom) / 2;
  const chart = {
    left,
    right,
    top: middle - chartHeight / 2,
    bottom: middle + chartHeight / 2,
  };

  // The curve draws over frames 12–140, easing out so it decelerates into place.
  const drawnAt = (f: number) =>
    interpolate(f, [DRAW_FROM, DRAW_TO], [0, 1], {
      easing: Easing.outCubic,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const drawn = drawnAt(frame);
  const visibleCount = Math.max(2, Math.round(drawn * RESOLUTION));
  const visible = values.slice(0, visibleCount);

  const points = visible.map((v, i) => ({
    x: chart.left + (chartWidth * i) / (RESOLUTION - 1),
    y: chart.bottom - (chartHeight * v) / peak,
  }));
  const last = points[points.length - 1] ?? { x: chart.left, y: chart.bottom };

  const path = linePath(points);
  const area = `${path} L${last.x.toFixed(2)},${chart.bottom} L${chart.left},${chart.bottom} Z`;

  // The headline follows the curve's head, so its velocity comes from the same
  // curve one frame back rather than from a separate count-up.
  const headlineAt = (f: number) =>
    values[Math.max(2, Math.round(drawnAt(f) * RESOLUTION)) - 1] ?? 0;
  const headline = headlineAt(frame);
  const headlineVelocity = headline - headlineAt(frame - 1);
  // The curve's geometry stays a pure function of the frame — its `d` attribute
  // is recomputed per frame, which GSAP has no way to tween — but everything
  // that is a plain transform or fade rides one timeline alongside it.
  const ref = useGsapTimeline<HTMLDivElement>((c) => {
    const q = (sel: string) => c.querySelectorAll<HTMLElement>(sel);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(q("[data-head]"), { y: unit * 1.6, opacity: 0, duration: 0.6, stagger: 0.1 }, 0)
      .from(q("[data-caption]"), { y: unit * 1.2, opacity: 0, duration: 0.6, stagger: 0.08 },
        DRAW_TO / fps - 0.25);
    return tl;
  });

  return (
    <AbsoluteFill
      ref={ref}
      style={{
        background: `linear-gradient(165deg, ${shade(data.accent, -0.85)} 0%, #08080a 60%)`,
        color: "#ededef",
        fontFamily: "var(--font-sans)",
        alignItems: "stretch",
        justifyContent: "flex-start",
        padding: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: unit * 1.2,
          padding: `${unit * 9}px ${unit * 10}px 0`,
        }}
      >
        <div
          data-head
          style={{
            display: "flex",
            alignItems: "center",
            gap: unit * 1.2,
            color: "#a0a0a6",
          }}
        >
          <BrandMark source={data.source} size={unit * 3} />
          <span
            style={{
              fontSize: fitSize(unit * 3.4, content - unit * 4.2, textEm(data.subtitle)),
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {data.subtitle}
          </span>
        </div>
        <span
          data-head
          style={{
            fontSize: fitSize(unit * 5.2, content, textEm(data.title)),
            fontWeight: 550,
            letterSpacing: "-0.015em",
            whiteSpace: "nowrap",
          }}
        >
          {data.title}
        </span>
        <span data-head style={{ fontWeight: 650 }}>
          {/* Tied to the curve: the number starts and lands with the line, so
              the two finish together rather than the headline settling early
              over a graph that is still drawing. More spins because a single
              revolution stretched over four seconds barely reads as motion. */}
          <RollingNumber
            value={data.value}
            size={portrait ? unit * 12 : unit * 13}
            maxWidth={content}
            delay={DRAW_FROM / fps}
            duration={(DRAW_TO - DRAW_FROM) / fps}
            spins={2}
            ease="power2.out"
          />
        </span>
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Baseline */}
        <line
          x1={chart.left}
          y1={chart.bottom}
          x2={chart.right}
          y2={chart.bottom}
          stroke={alpha("#ffffff", 0.1)}
          strokeWidth={unit * 0.15}
        />
        <path d={area} fill={alpha(data.accent, 0.18)} />
        <path
          d={path}
          fill="none"
          stroke={data.accent}
          strokeWidth={unit * 0.55}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Leading dot rides the head of the curve. */}
        <circle cx={last.x} cy={last.y} r={unit * 1.1} fill={data.accent} />
        <circle cx={last.x} cy={last.y} r={unit * 2.2} fill={alpha(data.accent, 0.22)} />
      </svg>

      <div
        style={{
          position: "absolute",
          left: unit * 10,
          bottom: unit * 8,
          display: "flex",
          alignItems: "center",
          gap: unit * 1.6,
        }}
      >
        <span data-caption style={{ fontSize: unit * 3, color: data.accent, fontWeight: 500 }}>
          {data.unit}
        </span>
        {data.delta && (
          <span data-caption style={{ fontSize: unit * 2.6, color: "#6b6b71" }}>
            {data.delta.label}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
}

export const chartRise: VideoTemplate = {
  id: "chart-rise",
  name: "Chart rise",
  // Two points is the minimum that draws as a line rather than a dot.
  supports: (data) => (data.series?.length ?? 0) >= 2,
  Scene: ChartRiseScene,
};
