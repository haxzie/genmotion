"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { cx } from "@/lib/cx";

/**
 * Animated grainy aurora gradient behind the hero, in the logo's teal → lime
 * gradient. Needs a real shader canvas (not CSS blur), so it's its own client
 * component rather than living in the server-rendered primitives module.
 */
export function HeroShaderBackground({
  className,
  scale = 1.5,
  speed = 0.8,
  colorBack = "#08080a",
}: {
  className?: string;
  /** Wave size — the shader's own `scale`. Defaults to the marketing hero's tuning. */
  scale?: number;
  /** Wave speed — the shader's own `speed`. Defaults to the marketing hero's tuning. */
  speed?: number;
  /**
   * The canvas's flat fill, outside the wave shape itself. Defaults to
   * `--color-background` (the marketing hero sits directly on the page
   * background) — pass the actual surface it's mounted on wherever that
   * differs, or the canvas's edges show as a seam against it.
   */
  colorBack?: string;
}) {
  return (
    <div
      aria-hidden
      className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <GrainGradient
        className="absolute inset-0 h-full w-full"
        colorBack={colorBack}
        colors={["#16F5BD", "#C6F91E"]}
        softness={0.9}
        intensity={0.35}
        noise={0.12}
        shape="wave"
        scale={scale}
        offsetY={0.4}
        speed={speed}
      />
      {/* Scrim so body copy stays legible over the brightest part of the
          band — the raw shader reads great but leaves text-secondary too
          low-contrast where the band peaks. */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}
