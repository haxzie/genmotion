"use client";

import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, useWindowDuration } from "../context";
import { useIsCameraScaled } from "../camera-context";
import { Easing, type EasingFunction } from "../easing";
import { random } from "../random";
import { getTextEffect, type TextEffectName } from "../text/effects";
import { holdStyle, type HoldBehaviour } from "../text/hold";
import { maxRank, orderRanks, type StaggerOrder } from "../text/order";
import { splitText, toLines, type SplitMode, type TextUnit } from "../text/split";
import {
  autoExitAt,
  DEFAULT_EXIT_EASE,
  defaultExitDuration,
  unitProgress,
  type EnterWindow,
} from "../text/timing";
import { resolveTextStyle, type TextTransform } from "../text/transform";

/** Any catalog effect name. Kept as the historical type name. */
export type TextAnimationPreset = TextEffectName;

export interface TextExitSpec {
  /** Borrow another effect's shape for the exit. */
  preset?: TextEffectName;
  /** Explicit target displacement, overriding `preset`. */
  transform?: TextTransform;
  /** Explicit start frame; omit to auto-time against the end of the window. */
  at?: number;
  duration?: number;
  stagger?: number;
  easing?: EasingFunction;
}

/**
 * `"auto"` continues the entrance's own travel, timed to finish just before the
 * element's window ends. A preset name borrows that effect's shape instead.
 */
export type TextExit = "auto" | TextEffectName | TextExitSpec | false;

export interface TextAnimationProps {
  /** Newlines split into lines; an array is taken as the lines directly. */
  text: string | string[];
  /** Split granularity. Defaults to the effect's own preference, else "word". */
  by?: SplitMode;
  preset?: TextEffectName;
  /** Frame at which the entrance starts. */
  startFrom?: number;
  /** Frames between successive units. */
  stagger?: number;
  /** Frames each unit animates for. */
  duration?: number;
  easing?: EasingFunction;
  /** How the element leaves. Omit for no exit. */
  exit?: TextExit;
  /** The sequence in which units fire. */
  order?: StaggerOrder;
  /** Ambient motion held between the entrance and the exit. */
  hold?: HoldBehaviour;
  /** Seed for `order: "random"`. Defaults to the text itself. */
  seed?: string;
  /** Stable id — needed by <Camera focus> and the editor's preview inspector. */
  id?: string;
  /** Element to render as. Defaults to a span. */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4";
  style?: React.CSSProperties;
  className?: string;
}

const MASK_WRAPPER: React.CSSProperties = {
  display: "inline-block",
  overflow: "hidden",
  verticalAlign: "bottom",
};

const PLAIN_WRAPPER: React.CSSProperties = { display: "inline-block" };

/**
 * Animated text, split by line, word or character, with staggered entrances and
 * — unlike the original — a matching exit.
 *
 *   <TextAnimation text="Ship it faster" preset="riseMask" exit="auto" />
 *
 * Every visual is a pure function of the current frame, so scrubbing backwards
 * and the export renderer's forward sweep agree exactly.
 */
export function TextAnimation({
  text,
  by,
  preset = "fadeUp",
  startFrom = 0,
  stagger,
  duration,
  easing,
  exit,
  order = "forward",
  hold = "none",
  seed,
  id,
  as: Tag = "span",
  style,
  className,
}: TextAnimationProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const windowEnd = useWindowDuration();
  const cameraScaled = useIsCameraScaled();

  const effect = getTextEffect(preset);
  const splitBy: SplitMode = by ?? effect.by ?? "word";

  // The thirteen original presets carry no defaults of their own, so they fall
  // through to the values this component has always used.
  const enterDuration = duration ?? effect.duration ?? 18;
  const enterStagger = stagger ?? effect.stagger ?? (splitBy === "char" ? 2 : 4);
  const enterEase = easing ?? effect.ease ?? Easing.outSmooth;

  const units = useMemo(() => splitText(text, splitBy), [text, splitBy]);
  const lineCount = useMemo(() => toLines(text).length, [text]);

  const animatable = useMemo(() => units.filter((u) => u.animate).length, [units]);
  const orderSeed = useMemo(
    () => seed ?? (Array.isArray(text) ? text.join("|") : text),
    [seed, text],
  );
  const ranks = useMemo(
    () => orderRanks(order, animatable, orderSeed),
    [order, animatable, orderSeed],
  );
  const lastRank = useMemo(() => maxRank(ranks), [ranks]);

  const enterWindow: EnterWindow = {
    at: startFrom,
    duration: enterDuration,
    stagger: enterStagger,
    easing: enterEase,
  };

  const exitPlan = useMemo(() => {
    if (exit === undefined || exit === false) return null;
    const spec: TextExitSpec =
      typeof exit === "string"
        ? exit === "auto"
          ? {}
          : { preset: exit }
        : exit;

    const target =
      spec.transform ??
      (spec.preset ? getTextEffect(spec.preset).from : (effect.to ?? effect.from));
    const exitDuration =
      spec.duration ?? effect.exitDuration ?? defaultExitDuration(enterDuration);
    const exitStagger = spec.stagger ?? enterStagger;
    const at =
      spec.at ??
      autoExitAt({
        windowEnd,
        maxRank: lastRank,
        duration: exitDuration,
        stagger: exitStagger,
      });

    return {
      target,
      window: {
        at,
        duration: exitDuration,
        stagger: exitStagger,
        easing: spec.easing ?? effect.exitEase ?? DEFAULT_EXIT_EASE,
      } satisfies EnterWindow,
    };
  }, [exit, effect, enterDuration, enterStagger, windowEnd, lastRank]);

  const exitTarget = exitPlan?.target ?? {};

  let animIndex = 0;
  const rendered = units.map((unit, i) => {
    if (!unit.animate) {
      return { line: unit.line, node: <span key={i}>{unit.text}</span> };
    }
    const index = animIndex++;
    const rank = ranks[index] ?? index;

    const enterP = unitProgress(frame, enterWindow, rank);
    const exitP = exitPlan ? unitProgress(frame, exitPlan.window, rank) : 0;

    const ambient = holdStyle(hold, {
      frame,
      fps,
      index,
      // Ramped by the entrance and unwound by the exit, so ambient motion never
      // fights a move that is already happening.
      amplitude: enterP * (1 - exitP),
    });

    const unitStyle = resolveTextStyle(
      effect.from,
      exitTarget,
      enterP,
      exitP,
      effect.perspective,
      {
        step: effect.step,
        extraTransforms: ambient.transforms,
        opacityFactor: ambient.opacityFactor,
      },
    );

    const inner = (
      <span
        style={{
          display: "inline-block",
          whiteSpace: "pre",
          // Promoting each unit pins its raster scale, so under a camera zoom
          // the glyph texture is stretched rather than re-rasterized. Outside a
          // camera the compositing win is real, so keep it there.
          willChange: cameraScaled ? undefined : "transform, opacity, filter",
          textShadow: ambient.textShadow,
          ...unitStyle,
        }}
      >
        {unit.text}
      </span>
    );

    return {
      line: unit.line,
      node: (
        <span key={i} style={effect.mask ? MASK_WRAPPER : PLAIN_WRAPPER}>
          {inner}
        </span>
      ),
    };
  });

  return (
    <Tag id={id} className={className} style={{ display: "inline-block", ...style }}>
      {lineCount > 1
        ? Array.from({ length: lineCount }, (_, line) => (
            <span key={line} style={{ display: "block" }}>
              {rendered.filter((r) => r.line === line).map((r) => r.node)}
            </span>
          ))
        : rendered.map((r) => r.node)}
    </Tag>
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
  /** Glyph pool to flicker through. */
  glyphs?: string;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
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
  glyphs = SCRAMBLE_GLYPHS,
  style,
  className,
  id,
}: ScrambleTextProps) {
  const frame = useCurrentFrame();
  const t = frame - startFrom;
  const chars = useMemo(() => [...text], [text]);
  const step = Math.floor(t / Math.max(1, flickerEvery));

  return (
    <span id={id} className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
      {chars.map((ch, i) => {
        if (ch.trim() === "") return <span key={i}>{ch}</span>;
        // Each character locks in once the wipe front passes it.
        const settleAt = ((i + 1) / chars.length) * duration;
        if (t >= settleAt) return <span key={i}>{ch}</span>;
        // Before the start, reserve width with the real (hidden) character.
        if (t < 0) return <span key={i} style={{ opacity: 0 }}>{ch}</span>;
        const glyph =
          glyphs[Math.floor(random(`scramble-${i}-${step}`) * glyphs.length)];
        return (
          <span key={i} style={{ opacity: 0.75 }}>
            {glyph}
          </span>
        );
      })}
    </span>
  );
}
