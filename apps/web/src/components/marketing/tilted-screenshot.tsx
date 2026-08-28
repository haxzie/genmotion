"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/components/ui";

/** How far back the image leans before it straightens, in degrees. */
const MAX_TILT_DEG = 16;
/** How much smaller it sits while tilted. Straightening scales it back to 1. */
const MAX_SCALE_DOWN = 0.06;

/**
 * The app, leaning back, standing up as you scroll to it.
 *
 * The tilt is a progress value the browser interpolates, not a keyframed
 * animation: the image tracks the scroll position exactly, so it straightens
 * as you come down and leans back if you scroll up again. Progress is written
 * to a CSS variable and the transform is pure CSS, so the only per-scroll work
 * on the main thread is one number.
 *
 * Reads geometry inside a rAF and never writes layout, so it can't thrash: the
 * only mutation is a custom property on the element's own style, which the
 * compositor picks up with the transform.
 */
export function TiltedScreenshot({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // A tilt that corrects itself as you scroll is motion tied to scrolling,
    // which is the first thing to drop when someone has asked for less of it.
    // Straight, immediately, and no listener at all.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--tilt", "0");
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      // 0 when the top of the image reaches the middle of the viewport (fully
      // leaning), 1 by the time that point has travelled a further third of the
      // viewport up (fully upright). Anchoring on the top edge rather than the
      // element's centre keeps the straightening at the same reading position
      // regardless of how tall the image is on this screen.
      const start = window.innerHeight * 0.9;
      const end = window.innerHeight * 0.35;
      const progress = (start - rect.top) / (start - end);
      el.style.setProperty("--tilt", String(Math.min(1, Math.max(0, progress))));
    };

    const onScroll = () => {
      // Coalesce to one read per frame — scroll fires far more often than the
      // screen refreshes, and every handler here measures.
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    // The perspective lives on the wrapper, not the tilted element: on the
    // element itself it would be applied after the rotation and the lean would
    // read as a flat skew.
    <div
      className={cx("[perspective:2000px] [perspective-origin:50%_0%]", className)}
    >
      <div
        ref={ref}
        // `--tilt` runs 0 (leaning) → 1 (upright); it starts at 0 so the image
        // is already tilted on first paint, before any scroll has happened.
        style={
          {
            "--tilt": 0,
            transform: `
              rotateX(calc((1 - var(--tilt)) * ${MAX_TILT_DEG}deg))
              scale(calc(1 - (1 - var(--tilt)) * ${MAX_SCALE_DOWN}))
            `,
            transformOrigin: "50% 0%",
            willChange: "transform",
          } as React.CSSProperties
        }
        // No frame of its own: the screenshot already carries a window with
        // rounded corners and its own dark surround, and a border around that
        // reads as a second window drawn around the first.
        className="[&>img]:block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={1800}
          height={1176}
          // The one image below the fold that is worth loading eagerly: it is
          // the first thing under the hero, so a lazy load shows a gap.
          loading="eager"
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}
