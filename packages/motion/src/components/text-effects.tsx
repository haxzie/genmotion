"use client";

import { useMemo } from "react";
import { useCurrentFrame } from "../context";
import { Easing, type EasingFunction } from "../easing";
import { interpolate } from "../interpolate";
import { splitText, type SplitMode } from "../text/split";
import type { TextEffectName } from "../text/effects";
import { Sequence } from "./sequence";
import { TextAnimation } from "./text-animation";

/* ────────────────────────────── Typewriter ────────────────────────────── */

export interface TypewriterProps {
  text: string;
  /** Frame at which typing starts. */
  startFrom?: number;
  /** Frames per character. */
  speed?: number;
  /** Show a caret. Pass a string to choose the glyph. */
  caret?: boolean | string;
  /** Frames per caret blink phase. */
  caretBlink?: number;
  /** Keep the caret once typing has finished. */
  caretAfterTyping?: boolean;
  caretColor?: string;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

/**
 * Types text out one character at a time, with a caret that sits at the typing
 * position.
 *
 * The untyped remainder is rendered with `visibility: hidden` rather than
 * omitted, so the element reserves its final width from frame 0 and the line
 * never reflows mid-animation — which on a proportional face is the difference
 * between a typewriter and a jitter.
 */
export function Typewriter({
  text,
  startFrom = 0,
  speed = 2,
  caret = true,
  caretBlink = 8,
  caretAfterTyping = false,
  caretColor = "currentColor",
  style,
  className,
  id,
}: TypewriterProps) {
  const frame = useCurrentFrame();
  const chars = useMemo(() => splitText(text, "char").map((u) => u.text), [text]);

  const elapsed = frame - startFrom;
  const typed = Math.max(
    0,
    Math.min(chars.length, Math.floor(elapsed / Math.max(1, speed))),
  );
  const done = typed >= chars.length;

  const glyph = typeof caret === "string" ? caret : "▌";
  const blinkOn = Math.floor(Math.max(0, elapsed) / Math.max(1, caretBlink)) % 2 === 0;
  const showCaret =
    caret !== false && elapsed >= 0 && (!done || caretAfterTyping) && blinkOn;

  return (
    <span id={id} className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
      <span>{chars.slice(0, typed).join("")}</span>
      {caret !== false && (
        <span
          style={{
            // Always laid out, only ever toggled invisible, so the text after
            // the caret never shifts as it blinks.
            visibility: showCaret ? "visible" : "hidden",
            color: caretColor,
          }}
        >
          {glyph}
        </span>
      )}
      <span style={{ visibility: "hidden" }}>{chars.slice(typed).join("")}</span>
    </span>
  );
}

/* ─────────────────────────────── TextSwap ─────────────────────────────── */

export interface TextSwapProps {
  words: string[];
  /** Frames each word owns, entrance and exit included. */
  every?: number;
  startFrom?: number;
  preset?: TextEffectName;
  by?: SplitMode;
  /**
   * Frames for the entrance; the exit is derived from it. Defaults tighter
   * than a standalone entrance would, because each word has to enter, hold and
   * leave inside `every` frames.
   */
  duration?: number;
  stagger?: number;
  /** Cycle forever, rather than holding on the last word. */
  loop?: boolean;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4";
}

/**
 * Rotates through a list of words in place — "Ship it faster / safer / cheaper".
 *
 * Each word gets its own <Sequence>, so the frame clock rebases to zero for it
 * and `exit="auto"` times the hand-off against that word's slot rather than the
 * whole scene.
 */
export function TextSwap({
  words,
  every = 45,
  startFrom = 0,
  preset = "blurUp",
  by,
  // At the catalog's standard 18-frame entrance a word would spend nearly all
  // of `every` arriving and leaving, with no hold in between.
  duration = 12,
  stagger,
  loop = false,
  style,
  className,
  id,
  as,
}: TextSwapProps) {
  const frame = useCurrentFrame();
  const slot = Math.floor((frame - startFrom) / Math.max(1, every));

  if (words.length === 0 || slot < 0) return null;

  // Without a loop the slot has to stop advancing at the last word, or `from`
  // would keep sliding forward with the frame and the final word would sit at
  // local frame ~0 forever, re-entering on every frame.
  const activeSlot = loop ? slot : Math.min(slot, words.length - 1);
  const index = loop
    ? ((activeSlot % words.length) + words.length) % words.length
    : activeSlot;
  const word = words[index];
  if (word === undefined) return null;

  // The last word holds indefinitely when not looping, so it gets no exit.
  const isFinalHold = !loop && slot >= words.length - 1;

  return (
    <span id={id} className={className} style={style}>
      <Sequence
        // Keyed so React remounts per word instead of diffing one into the next.
        key={activeSlot}
        from={startFrom + activeSlot * every}
        durationInFrames={isFinalHold ? undefined : every}
        layout="none"
      >
        <TextAnimation
          text={word}
          preset={preset}
          by={by}
          duration={duration}
          stagger={stagger}
          exit={isFinalHold ? undefined : "auto"}
          as={as}
        />
      </Sequence>
    </span>
  );
}

/* ─────────────────────────────── CountText ────────────────────────────── */

export interface CountTextProps {
  to: number;
  from?: number;
  startFrom?: number;
  duration?: number;
  easing?: EasingFunction;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /**
   * BCP-47 locale for grouping separators, or false for none. Defaults to
   * "en-US" rather than the host default so preview and export agree.
   */
  locale?: string | false;
  /** Abbreviate as 1.2K / 3.4M. */
  compact?: boolean;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

/**
 * A number that counts up (or down) to its target.
 *
 * Set in tabular figures so the glyph widths don't shuffle as the digits
 * change — without it, a counter visibly wobbles on most proportional faces.
 */
export function CountText({
  to,
  from = 0,
  startFrom = 0,
  duration = 40,
  easing = Easing.outExpo,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale = "en-US",
  compact = false,
  style,
  className,
  id,
}: CountTextProps) {
  const frame = useCurrentFrame();

  const value = interpolate(frame, [startFrom, startFrom + duration], [from, to], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const formatter = useMemo(
    () =>
      locale === false
        ? null
        : new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            ...(compact
              ? { notation: "compact" as const, maximumFractionDigits: Math.max(1, decimals) }
              : {}),
          }),
    [locale, decimals, compact],
  );

  const text = formatter ? formatter.format(value) : value.toFixed(decimals);

  return (
    <span
      id={id}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums", ...style }}
    >
      {prefix}
      {text}
      {suffix}
    </span>
  );
}

/* ───────────────────────────── HighlightText ──────────────────────────── */

export interface HighlightTextProps {
  children: React.ReactNode;
  /** Frame at which the mark starts drawing. */
  startFrom?: number;
  duration?: number;
  easing?: EasingFunction;
  variant?: "highlight" | "underline" | "strike";
  color?: string;
  /** Bar thickness as a fraction of the font size (underline/strike). */
  thickness?: number;
  /** Draw direction. */
  from?: "left" | "right" | "center";
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

/**
 * Draws a highlight bar, underline, or strike-through across a phrase.
 *
 * The bar is a scaleX transform rather than an animated width, so it composites
 * on the GPU and never triggers layout during the draw.
 */
export function HighlightText({
  children,
  startFrom = 0,
  duration = 14,
  easing = Easing.outSmooth,
  variant = "highlight",
  color = "#ffe14d",
  thickness = 0.08,
  from = "left",
  style,
  className,
  id,
}: HighlightTextProps) {
  const frame = useCurrentFrame();

  const p = interpolate(frame, [startFrom, startFrom + duration], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bar: React.CSSProperties =
    variant === "highlight"
      ? { top: "0.05em", bottom: "-0.05em", left: "-0.05em", right: "-0.05em" }
      : variant === "underline"
        ? { bottom: "-0.12em", left: 0, right: 0, height: `${thickness}em` }
        : { top: "50%", left: 0, right: 0, height: `${thickness}em` };

  return (
    <span
      id={id}
      className={className}
      style={{ position: "relative", display: "inline-block", ...style }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          ...bar,
          background: color,
          transform: `scaleX(${p})${variant === "strike" ? " translateY(-50%)" : ""}`,
          transformOrigin: from === "center" ? "center" : from,
          // Behind the text for a highlight, over it for a strike.
          zIndex: variant === "strike" ? 1 : 0,
          borderRadius: variant === "highlight" ? "0.06em" : 0,
        }}
      />
      <span style={{ position: "relative", zIndex: variant === "strike" ? 0 : 1 }}>
        {children}
      </span>
    </span>
  );
}
