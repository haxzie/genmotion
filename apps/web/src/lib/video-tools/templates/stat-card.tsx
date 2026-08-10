import { AbsoluteFill, gsap, useGsapTimeline, useVideoConfig } from "@genmotion/motion";
import type { MetricVideoData } from "../types";
import type { VideoTemplate } from "./types";
import { alpha, fitSize, formatSigned, shade, textEm } from "./shared";
import { BrandMark } from "./brand";
import { RollingNumber } from "./rolling-number";
import { Sparkline } from "./sparkline";

/**
 * A social-card layout: the metric sits inside a raised card that springs in,
 * with the delta as a pill. Compact enough to read well at 1:1 and 9:16.
 *
 * One GSAP timeline drives the scene; see `count-up.tsx` for why.
 */
function StatCardScene({ data }: { data: MetricVideoData }) {
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 100;

  // Width budget inside the card — see `fitSize`. The card is capped at
  // `unit * 76`, sits inside `unit * 8` of scene padding, and has `unit * 6` of
  // its own padding on each side.
  const card = Math.min(width - unit * 16, unit * 76);
  const content = card - unit * 12;

  const ref = useGsapTimeline<HTMLDivElement>((c) => {
    const q = (sel: string) => c.querySelectorAll<HTMLElement>(sel);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(q("[data-card]"), { y: unit * 5, scale: 0.95, opacity: 0, duration: 0.8 }, 0)
      .from(q("[data-row]"), { y: unit * 2, opacity: 0, duration: 0.6, stagger: 0.12 }, 0.2)
      // The curve draws itself in per frame; this only fades the box it lives in.
      .from(q("[data-spark]"), { opacity: 0, duration: 0.7 }, 0.7)
      // back.out gives the pill a small overshoot, so it pops rather than fades.
      .from(q("[data-pill]"), { scale: 0.6, opacity: 0, duration: 0.6, ease: "back.out(2.2)" }, 1.7)
      .from(q("[data-footer]"), { opacity: 0, duration: 0.6 }, 0.6);

    return tl;
  });

  return (
    <AbsoluteFill
      ref={ref}
      style={{
        background: `radial-gradient(120% 100% at 50% 0%, ${shade(data.accent, -0.72)} 0%, #08080a 62%)`,
        color: "#ededef",
        fontFamily: "var(--font-sans)",
        padding: unit * 8,
      }}
    >
      <div
        data-card
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: unit * 3.4,
          width: "100%",
          maxWidth: unit * 76,
          padding: unit * 6,
          borderRadius: unit * 3,
          background: "#0f0f12",
          border: `${unit * 0.14}px solid ${alpha("#ffffff", 0.1)}`,
          boxShadow: `0 ${unit * 2}px ${unit * 6}px rgba(0, 0, 0, 0.45)`,
        }}
      >
        <div data-row style={{ display: "flex", alignItems: "center", gap: unit * 2 }}>
          {data.avatar && (
            // A plain <img>: GSAP owns this element's transform, and the avatar
            // is already a data: URI so it needs no decode barrier.
            <img
              src={data.avatar}
              alt=""
              style={{
                width: unit * 6,
                height: unit * 6,
                borderRadius: unit * 1.4,
                objectFit: "cover",
                border: `${unit * 0.14}px solid ${alpha("#ffffff", 0.12)}`,
              }}
            />
          )}
          {/* Title only — the subtitle moved to the branded row below the
              number, where it sits next to its logo. */}
          <span
            style={{
              fontSize: fitSize(
                unit * 3.6,
                content - (data.avatar ? unit * 8 : 0),
                textEm(data.title),
              ),
              fontWeight: 550,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            {data.title}
          </span>
        </div>

        <span style={{ fontWeight: 650 }}>
          <RollingNumber value={data.value} size={unit * 15} maxWidth={content} compact delay={0.4} />
        </span>

        {/* Sources with history draw it inside the card; the rest don't. */}
        {data.series && data.series.length >= 2 && (
          <div data-spark>
            <Sparkline
              series={data.series}
              accent={data.accent}
              width={content}
              height={unit * 8}
              strokeWidth={unit * 0.36}
            />
          </div>
        )}

        <div data-row style={{ display: "flex", alignItems: "center", gap: unit * 1.6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: unit * 1.2,
              color: "#ffffff",
            }}
          >
            <BrandMark source={data.source} size={unit * 3} />
            <span
              style={{
                fontSize: fitSize(
                  unit * 2.9,
                  // The mark, the gap and the delta pill share the row.
                  content - unit * (data.delta ? 14 : 4.2),
                  textEm(data.subtitle),
                ),
                fontWeight: 500,
                letterSpacing: "-0.005em",
                whiteSpace: "nowrap",
              }}
            >
              {data.subtitle}
            </span>
          </div>
          {data.delta && (
            <span
              data-pill
              style={{
                fontSize: unit * 2.6,
                fontWeight: 550,
                color: data.delta.value >= 0 ? "#3fb96f" : "#f1646c",
                padding: `${unit * 0.6}px ${unit * 1.6}px`,
                borderRadius: unit * 10,
                background: alpha(data.delta.value >= 0 ? "#3fb96f" : "#f1646c", 0.14),
              }}
            >
              {formatSigned(data.delta.value)}
            </span>
          )}
        </div>
      </div>

      <span
        data-footer
        style={{
          position: "absolute",
          bottom: unit * 6,
          left: unit * 8,
          fontSize: fitSize(
            unit * 2.3,
            width - unit * 16,
            textEm(data.url.replace(/^https?:\/\//, "")),
          ),
          color: "#6b6b71",
          whiteSpace: "nowrap",
        }}
      >
        {data.url.replace(/^https?:\/\//, "")}
      </span>
    </AbsoluteFill>
  );
}

export const statCard: VideoTemplate = {
  id: "stat-card",
  name: "Stat card",
  supports: () => true,
  Scene: StatCardScene,
};
