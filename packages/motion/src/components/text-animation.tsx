"use client";

import { useMemo } from "react";
import { useCurrentFrame } from "../context";
import { Easing, type EasingFunction } from "../easing";
import { stagger as staggerFn } from "../helpers";
import { random } from "../random";

export type TextAnimationPreset =
  | "fadeUp"
  | "fadeIn"
  | "typewriter"
  | "blurIn"
  | "blurUp"
  | "slideIn"
  | "scaleIn"
  | "scaleBlur"
  | "dropIn"
  | "flipUp"
  | "clipReveal"
  | "wordReveal"
  | "riseMask";

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
    case "blurUp":
      // Blur + rise + fade — the smoothest, most cinematic general entrance.
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * 0.5}em)`,
        filter: `blur(${(1 - p) * 10}px)`,
      };
    case "slideIn":
      return { opacity: p, transform: `translateX(${(1 - p) * 1.2}em)` };
    case "scaleIn":
      return { opacity: p, transform: `scale(${0.4 + 0.6 * p})` };
    case "scaleBlur":
      // Settles down from slightly larger + blurred (zoom-blur focus-in).
      return {
        opacity: p,
        transform: `scale(${1 + (1 - p) * 0.35})`,
        filter: `blur(${(1 - p) * 8}px)`,
      };
    case "dropIn":
      return { opacity: p, transform: `translateY(${(1 - p) * -0.6}em)` };
    case "flipUp":
      // 3D rotate up around the baseline — great per word or line.
      return {
        opacity: p,
        transform: `perspective(600px) rotateX(${(1 - p) * -90}deg)`,
        transformOrigin: "bottom center",
      };
    case "clipReveal":
      // Left-to-right wipe via clip-path (no fade; the clip does the reveal).
      return { opacity: 1, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case "wordReveal":
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * 100}%)`,
      };
    case "riseMask":
      // Masked slide-up (no fade) — clean editorial reveal; needs the overflow wrap.
      return { opacity: 1, transform: `translateY(${(1 - p) * 110}%)` };
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

  const wrapInOverflow = preset === "wordReveal" || preset === "riseMask";

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

const SCRAMBLE_GLYPHS = "ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789#%&*<>/\\-_=+?";

export interface ScrambleTextProps {
  text: string;
  /** Frame at which the decode starts. */
  startFrom?: number;
  /** Frames over which the whole string resolves (left-to-right). */
  duration?: number;
  /** Frames between glyph changes while a character is still scrambling. */
  flickerEvery?: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * "Decode" / scramble effect: each character flickers through random glyphs,
 * then locks into the real character left-to-right. Deterministic (uses the
 * frame-seeded random), so it renders identically in preview and export.
 * Use a monospace font so the width doesn't jitter while scrambling.
 * <ScrambleText text="INITIALIZING" duration={40} />
 */
export function ScrambleText({
  text,
  startFrom = 0,
  duration = 36,
  flickerEvery = 2,
  style,
  className,
}: ScrambleTextProps) {
  const frame = useCurrentFrame();
  const t = frame - startFrom;
  const chars = useMemo(() => [...text], [text]);
  const step = Math.floor(t / Math.max(1, flickerEvery));

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
      {chars.map((ch, i) => {
        if (ch.trim() === "") return <span key={i}>{ch}</span>;
        // Each character locks in once the wipe front passes it.
        const settleAt = ((i + 1) / chars.length) * duration;
        if (t >= settleAt) return <span key={i}>{ch}</span>;
        // Before the start, reserve width with the real (hidden) character.
        if (t < 0) return <span key={i} style={{ opacity: 0 }}>{ch}</span>;
        const glyph =
          SCRAMBLE_GLYPHS[
            Math.floor(random(`scramble-${i}-${step}`) * SCRAMBLE_GLYPHS.length)
          ];
        return (
          <span key={i} style={{ opacity: 0.75 }}>
            {glyph}
          </span>
        );
      })}
    </span>
  );
}
