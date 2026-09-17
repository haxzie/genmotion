import { AbsoluteFill, gsap, useGsapTimeline, useVideoConfig } from "@genmotion/motion";
import type { MetricVideoData } from "../types";
import type { VideoTemplate } from "./types";
import { alpha, fitSize, formatFull, shade, textEm } from "./shared";
import { BrandMark } from "./brand";
import { LaunchCardIcon } from "./icons";
import { RollingNumber } from "./rolling-number";

/**
 * A launch announcement: icon tile, name and tagline, the upvote count rolling
 * up with the comment count beside it, and the rank as a ribbon across the
 * top of the card. Built for Product Hunt, but anything with a tagline can use
 * it.
 *
 * One GSAP timeline drives the scene; see `count-up.tsx` for why.
 */
function LaunchCardScene({ data }: { data: MetricVideoData }) {
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 100;

  // Width budget inside the card — the same geometry as `stat-card`.
  const card = Math.min(width - unit * 16, unit * 78);
  const content = card - unit * 12;
  const titleWidth = content - (data.avatar ? unit * 12.4 : 0);

  const ref = useGsapTimeline<HTMLDivElement>((c) => {
    const q = (sel: string) => c.querySelectorAll<HTMLElement>(sel);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(q("[data-card]"), { y: unit * 5, scale: 0.95, opacity: 0, duration: 0.8 }, 0)
      .from(q("[data-row]"), { y: unit * 2, opacity: 0, duration: 0.6, stagger: 0.12 }, 0.2)
      // The ribbon drops in last, after the number has landed, so the honour
      // reads as the payoff rather than the opener.
      .from(q("[data-ribbon]"), { y: -unit * 3, opacity: 0, duration: 0.6, ease: "back.out(1.8)" }, 2.1)
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
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: unit * 3.6,
          width: "100%",
          maxWidth: unit * 78,
          padding: unit * 6,
          paddingTop: data.badge ? unit * 8 : unit * 6,
          borderRadius: unit * 3,
          background: "#0f0f12",
          border: `${unit * 0.14}px solid ${alpha("#ffffff", 0.1)}`,
          boxShadow: `0 ${unit * 2}px ${unit * 6}px rgba(0, 0, 0, 0.45)`,
        }}
      >
        {data.badge && (
          <span
            data-ribbon
            style={{
              position: "absolute",
              top: -unit * 2.2,
              left: unit * 6,
              display: "flex",
              alignItems: "center",
              gap: unit * 1,
              padding: `${unit * 0.9}px ${unit * 2}px`,
              borderRadius: unit * 10,
              background: data.accent,
              color: "#ffffff",
              fontSize: unit * 2.5,
              fontWeight: 600,
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
              boxShadow: `0 ${unit * 0.8}px ${unit * 2.4}px ${alpha(data.accent, 0.45)}`,
            }}
          >
            <Trophy size={unit * 2.6} />
            {data.badge}
          </span>
        )}

        <div data-row style={{ display: "flex", alignItems: "center", gap: unit * 2.4 }}>
          {data.avatar && (
            // A plain <img>: GSAP owns this element's transform, and the icon is
            // already a data: URI so it needs no decode barrier.
            <img
              src={data.avatar}
              alt=""
              style={{
                width: unit * 10,
                height: unit * 10,
                borderRadius: unit * 2.2,
                objectFit: "cover",
                border: `${unit * 0.14}px solid ${alpha("#ffffff", 0.12)}`,
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: unit * 0.8 }}>
            <span
              style={{
                fontSize: fitSize(unit * 4.6, titleWidth, textEm(data.title)),
                fontWeight: 600,
                letterSpacing: "-0.015em",
                whiteSpace: "nowrap",
              }}
            >
              {data.title}
            </span>
            {data.tagline && (
              <span
                style={{
                  fontSize: fitSize(unit * 2.7, titleWidth, textEm(data.tagline)),
                  color: "#a0a0a6",
                  whiteSpace: "nowrap",
                }}
              >
                {data.tagline}
              </span>
            )}
          </div>
        </div>

        {/* The chevron and the "Product Hunt upvotes" row below already say
            what the number is, so no unit word beside it. */}
        <div
          data-row
          style={{ fontWeight: 650, display: "flex", alignItems: "center", gap: unit * 1.4 }}
        >
          <Upvote size={unit * 6} color={data.accent} />
          <RollingNumber value={data.value} size={unit * 13} maxWidth={content - unit * 8} delay={0.4} />
        </div>

        <div data-row style={{ display: "flex", alignItems: "center", gap: unit * 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: unit * 1.2, color: "#ffffff" }}>
            <BrandMark source={data.source} size={unit * 3} />
            <span
              style={{
                fontSize: unit * 2.9,
                fontWeight: 500,
                letterSpacing: "-0.005em",
                whiteSpace: "nowrap",
              }}
            >
              {data.subtitle}
            </span>
          </div>
          {data.secondary && (
            <span
              style={{
                fontSize: unit * 2.6,
                fontWeight: 550,
                color: "#c9c9ce",
                padding: `${unit * 0.6}px ${unit * 1.6}px`,
                borderRadius: unit * 10,
                background: alpha("#ffffff", 0.08),
                whiteSpace: "nowrap",
              }}
            >
              {formatFull(data.secondary.value)} {data.secondary.unit}
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
          fontSize: fitSize(unit * 2.3, width - unit * 16, textEm(data.url.replace(/^https?:\/\//, ""))),
          color: "#6b6b71",
          whiteSpace: "nowrap",
        }}
      >
        {data.url.replace(/^https?:\/\//, "")}
      </span>
    </AbsoluteFill>
  );
}

/** Product Hunt's upvote chevron, as a filled triangle in the accent. */
function Upvote({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 5l8 12H4z" fill={color} strokeLinejoin="round" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function Trophy({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
    </svg>
  );
}

export const launchCard: VideoTemplate = {
  id: "launch-card",
  name: "Launch card",
  Icon: LaunchCardIcon,
  // The card is built around a pitch line; sources without one have nothing
  // to put in its second row.
  supports: (data) => !!data.tagline,
  Scene: LaunchCardScene,
};
