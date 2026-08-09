import { AbsoluteFill, gsap, useGsapTimeline, useVideoConfig } from "@genmotion/motion";
import type { MetricVideoData } from "../types";
import type { VideoTemplate } from "./types";
import { alpha, shade } from "./shared";
import { RollingNumber } from "./rolling-number";

/**
 * The universal template: avatar + title, a big number spinning up to the real
 * value, unit and source caption. Works for every data source.
 *
 * The whole scene is one GSAP timeline, seeked to the current frame by
 * `useGsapTimeline`. Choreographing it as a timeline rather than as a pile of
 * independent `interpolate` calls is what lets beats overlap deliberately —
 * elements are placed relative to one another (`"-=0.4"`) instead of every
 * animation being hand-timed against absolute frame numbers.
 */
function CountUpScene({ data }: { data: MetricVideoData }) {
  const { width, height } = useVideoConfig();

  // A single scale factor keyed off the short edge keeps type and spacing
  // proportional across 16:9, 1:1 and 9:16.
  const unit = Math.min(width, height) / 100;
  const portrait = height > width;

  const ref = useGsapTimeline<HTMLDivElement>((c) => {
    const q = <T extends Element = HTMLElement>(sel: string) =>
      c.querySelectorAll<T>(sel);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(q("[data-wash]"), { scale: 0.6, opacity: 0, duration: 1.1, ease: "power2.out" }, 0)
      .from(q("[data-head]"), { y: unit * 3, opacity: 0, duration: 0.7 }, 0.05)
      .from(q("[data-number]"), { scale: 0.92, opacity: 0, duration: 0.8 }, 0.12)
      .from(q("[data-caption]"), { y: unit * 2, opacity: 0, duration: 0.6, stagger: 0.1 }, 1.35)
      .from(q("[data-footer]"), { opacity: 0, duration: 0.6 }, "-=0.4");

    return tl;
  });

  return (
    <AbsoluteFill
      ref={ref}
      style={{
        background: `linear-gradient(160deg, ${shade(data.accent, -0.82)} 0%, #08080a 55%)`,
        color: "#ededef",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: unit * 3,
        padding: unit * 8,
      }}
    >
      <div
        data-wash
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: unit * 70,
          height: unit * 70,
          marginTop: unit * -35,
          marginLeft: unit * -35,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(data.accent, 0.28)} 0%, ${alpha(data.accent, 0)} 68%)`,
        }}
      />

      <div
        data-head
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: unit * 2.2,
        }}
      >
        {data.avatar && (
          // A plain <img>: GSAP owns this element's transform, and motion's
          // <Img> only adds the render-mode decode barrier, which the avatar
          // (already a data: URI) doesn't need.
          <img
            src={data.avatar}
            alt=""
            style={{
              width: unit * 7,
              height: unit * 7,
              borderRadius: "50%",
              border: `${unit * 0.2}px solid ${alpha("#ffffff", 0.14)}`,
              objectFit: "cover",
            }}
          />
        )}
        <span style={{ fontSize: unit * 4.4, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {data.title}
        </span>
      </div>

      <div data-number style={{ position: "relative", fontWeight: 650 }}>
        <RollingNumber value={data.value} size={portrait ? unit * 19 : unit * 24} />
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: unit * 1.6,
        }}
      >
        <span
          data-caption
          style={{
            fontSize: unit * 4.2,
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: data.accent,
          }}
        >
          {data.unit}
        </span>
        {data.delta && (
          <span
            data-caption
            style={{
              fontSize: unit * 2.8,
              fontWeight: 500,
              color: "#a0a0a6",
              padding: `${unit * 0.7}px ${unit * 2}px`,
              borderRadius: unit * 10,
              background: alpha("#ffffff", 0.06),
              border: `1px solid ${alpha("#ffffff", 0.09)}`,
            }}
          >
            {data.delta.label}
          </span>
        )}
      </div>

      <span
        data-footer
        style={{
          position: "absolute",
          bottom: unit * 6,
          fontSize: unit * 2.4,
          color: "#6b6b71",
        }}
      >
        {data.subtitle}
      </span>
    </AbsoluteFill>
  );
}

export const countUp: VideoTemplate = {
  id: "count-up",
  name: "Count up",
  supports: () => true,
  Scene: CountUpScene,
};
