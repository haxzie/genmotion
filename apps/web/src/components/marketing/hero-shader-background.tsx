"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { cx } from "@/lib/cx";

/**
 * Animated grainy aurora gradient behind the hero, in the logo's teal → lime
 * gradient. Needs a real shader canvas (not CSS blur), so it's its own client
 * component rather than living in the server-rendered primitives module.
 */
export function HeroShaderBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <GrainGradient
        className="absolute inset-0 h-full w-full"
        colorBack="#08080a"
        colors={["#16F5BD", "#C6F91E"]}
        softness={0.9}
        intensity={0.35}
        noise={0.12}
        shape="wave"
        scale={1.5}
        offsetY={0.4}
        speed={0.8}
      />
      {/* Scrim so body copy stays legible over the brightest part of the
          band — the raw shader reads great but leaves text-secondary too
          low-contrast where the band peaks. */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}
