import type React from "react";

/**
 * How a clip-path reveal is shaped. `from` names the edge the reveal grows
 * OUT of, so "left" means the text is uncovered left-to-right.
 */
export interface ClipSpec {
  shape?: "inset" | "circle";
  from?: "left" | "right" | "top" | "bottom" | "center";
}

/**
 * A displacement away from the settled state. Effects only ever declare where
 * text comes FROM (and optionally where it goes TO); the settled state is
 * always identity, which is what keeps every effect a few lines of data and
 * means a value is only ever scaled towards zero — never interpolated between
 * two different CSS units.
 *
 * Numbers are pixels; strings pass through with their unit ("0.6em", "110%").
 */
export interface TextTransform {
  opacity?: number;
  x?: number | string;
  y?: number | string;
  /** translateZ; only meaningful with a `perspective` on the effect. */
  z?: number | string;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  /** Z-axis rotation, in degrees. */
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
  skewX?: number;
  skewY?: number;
  /** Blur radius in px. */
  blur?: number;
  letterSpacing?: number | string;
  clip?: ClipSpec;
  /** transform-origin, e.g. "bottom center". */
  origin?: string;
}

interface Length {
  value: number;
  unit: string;
}

const LENGTH = /^(-?\d*\.?\d+(?:e[-+]?\d+)?)(.*)$/i;

function parseLength(v: number | string): Length {
  if (typeof v === "number") return { value: v, unit: "px" };
  const m = LENGTH.exec(v.trim());
  if (!m) return { value: 0, unit: "px" };
  return { value: Number(m[1]), unit: m[2]!.trim() || "px" };
}

/**
 * Trims float noise (0.36000000000000004 → 0.36) so the markup stays small and
 * byte-stable. Deliberately generous: this is here to clean up representation
 * error, not to quantise the animation.
 */
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Sums the enter and exit contributions of one length channel. They are kept
 * separate when their units differ — CSS composes repeated transform functions,
 * so `translateY(4px) translateY(0.5em)` is exact where unit coercion wouldn't be.
 * In practice one side is always zero, so this emits a single function.
 */
function lengthTerms(
  from: number | string | undefined,
  to: number | string | undefined,
  fromWeight: number,
  toWeight: number,
): Length[] {
  const terms: Length[] = [];
  if (from !== undefined) {
    const l = parseLength(from);
    terms.push({ value: l.value * fromWeight, unit: l.unit });
  }
  if (to !== undefined) {
    const l = parseLength(to);
    const same = terms.find((t) => t.unit === l.unit);
    if (same) same.value += l.value * toWeight;
    else terms.push({ value: l.value * toWeight, unit: l.unit });
  }
  return terms;
}

/** Additive scalar channel (degrees, px blur): away-from-settled is a sum. */
function scalarTerm(
  from: number | undefined,
  to: number | undefined,
  fromWeight: number,
  toWeight: number,
): number {
  return (from ?? 0) * fromWeight + (to ?? 0) * toWeight;
}

/** Multiplicative channel (opacity, scale): 1 is the settled value. */
function factorTerm(
  from: number | undefined,
  to: number | undefined,
  enterP: number,
  exitP: number,
): number {
  const entered = from === undefined ? 1 : from + (1 - from) * enterP;
  const exited = to === undefined ? 1 : 1 + (to - 1) * exitP;
  return entered * exited;
}

function clipPath(spec: ClipSpec, amount: number): string {
  const a = round(Math.max(0, Math.min(1, amount)) * 100);
  if (spec.shape === "circle") {
    // 75% comfortably covers a text box corner-to-centre at full reveal.
    return `circle(${round((1 - a / 100) * 75)}% at 50% 50%)`;
  }
  switch (spec.from ?? "left") {
    case "right":
      return `inset(0 0 0 ${a}%)`;
    case "top":
      return `inset(0 0 ${a}% 0)`;
    case "bottom":
      return `inset(${a}% 0 0 0)`;
    case "center":
      return `inset(0 ${round(a / 2)}% 0 ${round(a / 2)}%)`;
    default:
      return `inset(0 ${a}% 0 0)`;
  }
}

export interface ResolveOptions {
  /** Typewriter-style binary opacity: visible the instant progress starts. */
  step?: boolean;
  /** Extra transform functions appended after the effect's own (ambient hold). */
  extraTransforms?: string[];
  /** Added to the effect's blur (ambient hold). */
  extraBlur?: number;
  /** Multiplied into the effect's opacity (ambient hold). */
  opacityFactor?: number;
}

/**
 * The inline style for one unit at a given enter/exit progress.
 *
 * Every channel DECLARED by the effect is emitted on every frame, even when its
 * current value is zero. That avoids style thrash mid-animation, and it is also
 * what the original presets did — the back-compat snapshots depend on it.
 */
export function resolveTextStyle(
  from: TextTransform,
  to: TextTransform,
  enterP: number,
  exitP: number,
  perspective?: number,
  opts: ResolveOptions = {},
): React.CSSProperties {
  const fw = 1 - enterP;
  const tw = exitP;

  const fns: string[] = [];
  if (perspective !== undefined) fns.push(`perspective(${round(perspective)}px)`);

  const translate: [keyof TextTransform, string][] = [
    ["x", "translateX"],
    ["y", "translateY"],
    ["z", "translateZ"],
  ];
  for (const [key, fn] of translate) {
    for (const term of lengthTerms(
      from[key] as number | string | undefined,
      to[key] as number | string | undefined,
      fw,
      tw,
    )) {
      fns.push(`${fn}(${round(term.value)}${term.unit})`);
    }
  }

  const rotations: [keyof TextTransform, string][] = [
    ["rotateX", "rotateX"],
    ["rotateY", "rotateY"],
    ["rotate", "rotate"],
    ["skewX", "skewX"],
    ["skewY", "skewY"],
  ];
  for (const [key, fn] of rotations) {
    if (from[key] === undefined && to[key] === undefined) continue;
    const v = scalarTerm(from[key] as number, to[key] as number, fw, tw);
    fns.push(`${fn}(${round(v)}deg)`);
  }

  if (from.scale !== undefined || to.scale !== undefined) {
    fns.push(`scale(${round(factorTerm(from.scale, to.scale, enterP, exitP))})`);
  }
  if (from.scaleX !== undefined || to.scaleX !== undefined) {
    fns.push(`scaleX(${round(factorTerm(from.scaleX, to.scaleX, enterP, exitP))})`);
  }
  if (from.scaleY !== undefined || to.scaleY !== undefined) {
    fns.push(`scaleY(${round(factorTerm(from.scaleY, to.scaleY, enterP, exitP))})`);
  }

  if (opts.extraTransforms?.length) fns.push(...opts.extraTransforms);

  const style: React.CSSProperties = {};

  // Opacity is always emitted: every original preset set it, and a unit that
  // never declares one still needs to be hidden by an ambient hold factor.
  let opacity = opts.step
    ? (enterP > 0 ? 1 : 0) * (exitP >= 1 ? 0 : 1)
    : factorTerm(from.opacity, to.opacity, enterP, exitP);
  if (opts.opacityFactor !== undefined) opacity *= opts.opacityFactor;
  style.opacity = round(opacity);

  if (fns.length > 0) style.transform = fns.join(" ");

  const blur = scalarTerm(from.blur, to.blur, fw, tw) + (opts.extraBlur ?? 0);
  if (from.blur !== undefined || to.blur !== undefined || opts.extraBlur) {
    style.filter = `blur(${round(Math.max(0, blur))}px)`;
  }

  if (from.letterSpacing !== undefined || to.letterSpacing !== undefined) {
    const terms = lengthTerms(from.letterSpacing, to.letterSpacing, fw, tw);
    // letter-spacing is a bare length, so mixed units can't be composed the way
    // repeated transform functions can. The dominant side wins; in practice
    // only one of the two is ever non-zero.
    const term =
      terms.length > 1 ? (tw > fw ? terms[terms.length - 1]! : terms[0]!) : terms[0];
    if (term) style.letterSpacing = `${round(term.value)}${term.unit}`;
  }

  // Exit clip wins while it is running, otherwise the entrance clip resolves.
  if (to.clip && exitP > 0) {
    style.clipPath = clipPath(to.clip, exitP);
  } else if (from.clip) {
    style.clipPath = clipPath(from.clip, fw);
  } else if (to.clip) {
    style.clipPath = clipPath(to.clip, 0);
  }

  const origin = from.origin ?? to.origin;
  if (origin !== undefined) style.transformOrigin = origin;

  return style;
}
