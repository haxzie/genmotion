import { AbsoluteFill, gsap, useGsapTimeline, useVideoConfig } from "@genmotion/motion";
import type { MetricVideoData } from "../types";
import type { VideoTemplate } from "./types";
import { alpha, formatSigned, shade } from "./shared";
import { RollingNumber } from "./rolling-number";

/**
 * A social-card layout: the metric sits inside a raised card that springs in,
 * with the delta as a pill. Compact enough to read well at 1:1 and 9:16.
 *
 * One GSAP timeline drives the scene; see `count-up.tsx` for why.
 */
function StatCardScene({ data }: { data: MetricVideoData }) {
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 100;

  const ref = useGsapTimeline<HTMLDivElement>((c) => {
    const q = (sel: string) => c.querySelectorAll<HTMLElement>(sel);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(q("[data-card]"), { y: unit * 5, scale: 0.95, opacity: 0, duration: 0.8 }, 0)
      .from(q("[data-row]"), { y: unit * 2, opacity: 0, duration: 0.6, stagger: 0.12 }, 0.2)
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
          <div style={{ display: "flex", flexDirection: "column", gap: unit * 0.5 }}>
            <span style={{ fontSize: unit * 3.6, fontWeight: 550, letterSpacing: "-0.01em" }}>
              {data.title}
            </span>
            <span style={{ fontSize: unit * 2.5, color: "#6b6b71" }}>{data.subtitle}</span>
          </div>
        </div>

        <span style={{ fontWeight: 650 }}>
          <RollingNumber value={data.value} size={unit * 15} compact delay={0.4} />
        </span>

        <div data-row style={{ display: "flex", alignItems: "center", gap: unit * 1.6 }}>
          <span
            style={{
              fontSize: unit * 2.9,
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: data.accent,
            }}
          >
            {data.unit}
          </span>
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
          fontSize: unit * 2.3,
          color: "#6b6b71",
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
