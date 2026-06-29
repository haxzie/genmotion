"use client";

import { useMemo } from "react";
import { useCurrentFrame } from "../context";
import { Easing, type EasingFunction } from "../easing";
import { stagger as staggerFn } from "../helpers";

export type TextAnimationPreset =
  | "fadeUp"
  | "fadeIn"
  | "typewriter"
  | "blurIn"
  | "slideIn"
  | "scaleIn"
  | "wordReveal";

export interface TextAnimationProps {
  text: string;
  /** Split granularity. */
  by?: "char" | "word";
  preset?: TextAnimationPreset;
  /** Frame at which the animation starts. */
  startFrom?: number;
  /** Frames between successive units. */
  stagger?: number;
  /** Frames each unit animates for. */
  duration?: number;
  easing?: EasingFunction;
  style?: React.CSSProperties;
  className?: string;
}

function unitStyle(
  preset: TextAnimationPreset,
  p: number,
): React.CSSProperties {
  switch (preset) {
    case "fadeUp":
      return { opacity: p, transform: `translateY(${(1 - p) * 0.6}em)` };
    case "fadeIn":
      return { opacity: p };
    case "typewriter":
      return { opacity: p >= 1 ? 1 : p > 0 ? 1 : 0 };
    case "blurIn":
      return { opacity: p, filter: `blur(${(1 - p) * 12}px)` };
    case "slideIn":
      return { opacity: p, transform: `translateX(${(1 - p) * 1.2}em)` };
    case "scaleIn":
      return { opacity: p, transform: `scale(${0.4 + 0.6 * p})` };
    case "wordReveal":
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * 100}%)`,
      };
  }
}

/**
 * Animated text, split by word or character, with staggered entrances.
 * <TextAnimation text="Ship faster" preset="fadeUp" by="word" />
 */
export function TextAnimation({
  text,
  by = "word",
  preset = "fadeUp",
  startFrom = 0,
  stagger = by === "char" ? 2 : 4,
  duration = 18,
  easing = Easing.outSmooth,
  style,
  className,
}: TextAnimationProps) {
  const frame = useCurrentFrame();

  const units = useMemo(() => {
    if (by === "word") return text.split(/(\s+)/);
    return [...text];
  }, [text, by]);

  const wrapInOverflow = preset === "wordReveal";

  let animatableIndex = 0;
  return (
    <span className={className} style={{ display: "inline-block", ...style }}>
      {units.map((unit, i) => {
        const isSpace = /^\s+$/.test(unit);
        if (isSpace) {
          return <span key={i}>{unit}</span>;
        }
        const p = staggerFn({
          frame: frame - startFrom,
          index: animatableIndex++,
          each: stagger,
          duration,
          easing,
        });
        const inner = (
          <span
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              willChange: "transform, opacity, filter",
              ...unitStyle(preset, p),
            }}
          >
            {unit}
          </span>
        );
        return wrapInOverflow ? (
          <span
            key={i}
            style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}
          >
            {inner}
          </span>
        ) : (
          <span key={i} style={{ display: "inline-block" }}>
            {inner}
          </span>
        );
      })}
    </span>
  );
}
