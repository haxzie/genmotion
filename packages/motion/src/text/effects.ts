import { Easing, type EasingFunction } from "../easing";
import type { SplitMode } from "./split";
import type { TextTransform } from "./transform";

export type EffectGroup =
  | "fade"
  | "blur"
  | "mask"
  | "scale"
  | "dimensional"
  | "rotate"
  | "kinetic"
  | "editorial";

export interface TextEffect {
  /** Where a unit comes from. The settled state is always identity. */
  from: TextTransform;
  /**
   * Where a unit goes on exit. Omitted means "leave the way you came".
   * Directional effects set this to CONTINUE the travel instead of reversing
   * it, which is what makes a rise-in / rise-out pair read as one movement.
   *
   * Must not declare a channel `from` doesn't: every declared channel is
   * emitted on every frame, so a stray one changes the entrance too.
   */
  to?: TextTransform;
  /** Wrap each unit in an overflow-clip box, for masked reveals. */
  mask?: boolean;
  /** Perspective (px) applied to the unit, for the 3D effects. */
  perspective?: number;
  /** Binary opacity — visible the instant progress starts (typewriter). */
  step?: boolean;
  /** Recommended split granularity. */
  by?: SplitMode;
  /** House default frames per unit. Legacy names leave this unset on purpose. */
  duration?: number;
  stagger?: number;
  ease?: EasingFunction;
  exitDuration?: number;
  exitEase?: EasingFunction;
  group: EffectGroup;
  /** One line, shown in the docs and fed to the scene-authoring agent. */
  blurb: string;
}

/**
 * The effect catalog.
 *
 * The thirteen original preset names are marked LEGACY and deliberately carry
 * no `duration`/`stagger`/`by` of their own: scenes already stored in Postgres
 * reference them, so they must keep falling through to the component's original
 * global defaults (18 frames, stagger 4/2, split by word). New names are free
 * to carry tuned defaults, and do — entrances 8–14 frames and staggers 2–4, per
 * the house design standards.
 */
export const TEXT_EFFECTS = {
  // ── Fade ────────────────────────────────────────────────────────────────
  fadeIn: {
    from: { opacity: 0 },
    group: "fade",
    blurb: "Straight cross-fade. The quietest entrance there is.",
  },
  fadeUp: {
    from: { opacity: 0, y: "0.6em" },
    to: { opacity: 0, y: "-0.6em" },
    group: "fade",
    blurb: "Rises a little as it fades in, and keeps rising on the way out.",
  },
  dropIn: {
    from: { opacity: 0, y: "-0.6em" },
    to: { opacity: 0, y: "0.6em" },
    group: "fade",
    blurb: "Falls in from above and keeps falling on exit.",
  },
  slideIn: {
    from: { opacity: 0, x: "1.2em" },
    to: { opacity: 0, x: "-1.2em" },
    group: "fade",
    blurb: "Travels in from the right and continues left on exit.",
  },
  fadeLeft: {
    from: { opacity: 0, x: "-0.5em", blur: 4 },
    to: { opacity: 0, x: "0.5em", blur: 4 },
    duration: 12,
    stagger: 3,
    group: "fade",
    blurb: "Enters from the left with a touch of directional blur.",
  },
  fadeRight: {
    from: { opacity: 0, x: "0.5em", blur: 4 },
    to: { opacity: 0, x: "-0.5em", blur: 4 },
    duration: 12,
    stagger: 3,
    group: "fade",
    blurb: "Enters from the right with a touch of directional blur.",
  },

  // ── Blur ────────────────────────────────────────────────────────────────
  blurIn: {
    from: { opacity: 0, blur: 12 },
    group: "blur",
    blurb: "Resolves out of a soft blur, in place.",
  },
  blurUp: {
    from: { opacity: 0, y: "0.5em", blur: 10 },
    to: { opacity: 0, y: "-0.5em", blur: 10 },
    group: "blur",
    blurb: "Blur + rise + fade. The house default for hero headlines.",
  },
  blurDown: {
    from: { opacity: 0, y: "-0.45em", blur: 10 },
    to: { opacity: 0, y: "0.45em", blur: 10 },
    duration: 12,
    stagger: 3,
    group: "blur",
    blurb: "blurUp inverted — settles downward. Pairs with text leaving upward.",
  },
  scaleBlur: {
    from: { opacity: 0, scale: 1.35, blur: 8 },
    group: "blur",
    blurb: "Zoom-blur focus-in: settles down from slightly larger and soft.",
  },
  softFocus: {
    from: { opacity: 0, scale: 1.06, blur: 6 },
    to: { opacity: 0, scale: 0.98, blur: 6 },
    duration: 12,
    stagger: 3,
    group: "blur",
    blurb: "A gentler scaleBlur — barely-there scale, cinematic on long copy.",
  },
  focusIn: {
    from: { opacity: 0, blur: 14, letterSpacing: "0.25em" },
    by: "line",
    duration: 14,
    stagger: 4,
    group: "blur",
    blurb: "Wide and out of focus, pulling sharp and tight. Whole lines only.",
  },

  // ── Mask & wipe ─────────────────────────────────────────────────────────
  riseMask: {
    from: { opacity: 1, y: "110%" },
    to: { opacity: 1, y: "-110%" },
    mask: true,
    group: "mask",
    blurb: "Masked slide-up with no fade — the clean editorial reveal.",
  },
  wordReveal: {
    from: { opacity: 0, y: "100%" },
    to: { opacity: 0, y: "-100%" },
    mask: true,
    group: "mask",
    blurb: "Masked rise that also fades. Softer than riseMask.",
  },
  dropMask: {
    from: { opacity: 1, y: "-110%" },
    to: { opacity: 1, y: "110%" },
    mask: true,
    duration: 12,
    stagger: 3,
    group: "mask",
    blurb: "riseMask inverted — drops in from above the mask.",
  },
  clipReveal: {
    from: { opacity: 1, clip: { shape: "inset", from: "left" } },
    group: "mask",
    blurb: "Left-to-right wipe via clip-path. No fade; the clip does the work.",
  },
  wipeLeft: {
    from: { opacity: 1, clip: { shape: "inset", from: "right" } },
    duration: 14,
    stagger: 2,
    group: "mask",
    blurb: "Right-to-left clip wipe.",
  },
  wipeUp: {
    from: { opacity: 1, clip: { shape: "inset", from: "bottom" } },
    duration: 14,
    stagger: 3,
    group: "mask",
    blurb: "Bottom-to-top clip wipe. Strong on stacked lines.",
  },
  wipeDown: {
    from: { opacity: 1, clip: { shape: "inset", from: "top" } },
    duration: 14,
    stagger: 3,
    group: "mask",
    blurb: "Top-to-bottom clip wipe.",
  },
  curtain: {
    from: { opacity: 1, clip: { shape: "inset", from: "center" } },
    duration: 14,
    stagger: 3,
    group: "mask",
    blurb: "Opens outward from the centre line.",
  },
  irisIn: {
    from: { opacity: 1, clip: { shape: "circle" } },
    duration: 16,
    stagger: 3,
    group: "mask",
    blurb: "Circular iris opening. Best on short words or single lines.",
  },

  // ── Scale ───────────────────────────────────────────────────────────────
  scaleIn: {
    from: { opacity: 0, scale: 0.4 },
    group: "scale",
    blurb: "Grows in from small.",
  },
  scaleUp: {
    from: { opacity: 0, scale: 0.86, blur: 3 },
    to: { opacity: 0, scale: 0.94, blur: 3 },
    duration: 12,
    stagger: 3,
    group: "scale",
    blurb: "Restrained grow-in. The house-style alternative to scaleIn.",
  },
  scaleDown: {
    from: { opacity: 0, scale: 1.18, blur: 4 },
    to: { opacity: 0, scale: 1.08, blur: 4 },
    duration: 12,
    stagger: 3,
    group: "scale",
    blurb: "Settles down from slightly oversized. Confident, not showy.",
  },
  popIn: {
    from: { opacity: 0, scale: 0.6 },
    duration: 14,
    stagger: 3,
    ease: Easing.out(Easing.back(2)),
    group: "scale",
    blurb: "Overshoots past full size and settles back. Playful.",
  },
  stampIn: {
    from: { opacity: 0, scale: 2.2, blur: 10 },
    duration: 10,
    stagger: 4,
    ease: Easing.outExpo,
    group: "scale",
    blurb: "Slams down from far too big. Impact moments only.",
  },
  squashIn: {
    from: { opacity: 0, scaleY: 0.3, scaleX: 1.15 },
    duration: 12,
    stagger: 3,
    ease: Easing.out(Easing.back(1.4)),
    group: "scale",
    blurb: "Squashed flat, springing to full height.",
  },

  // ── Dimensional ─────────────────────────────────────────────────────────
  flipUp: {
    from: { opacity: 0, rotateX: -90, origin: "bottom center" },
    perspective: 600,
    group: "dimensional",
    blurb: "Rotates up around its baseline. Great per word or line.",
  },
  flipDown: {
    from: { opacity: 0, rotateX: 90, origin: "top center" },
    perspective: 600,
    duration: 12,
    stagger: 3,
    group: "dimensional",
    blurb: "Rotates down around its cap height.",
  },
  flipLeft: {
    from: { opacity: 0, rotateY: -80, origin: "left center" },
    perspective: 700,
    duration: 12,
    stagger: 3,
    group: "dimensional",
    blurb: "Swings in around its left edge, like a page turning.",
  },
  flipRight: {
    from: { opacity: 0, rotateY: 80, origin: "right center" },
    perspective: 700,
    duration: 12,
    stagger: 3,
    group: "dimensional",
    blurb: "Swings in around its right edge.",
  },
  foldIn: {
    from: { opacity: 0, rotateX: 60, y: "0.4em", origin: "top center" },
    perspective: 800,
    duration: 13,
    stagger: 3,
    group: "dimensional",
    blurb: "Unfolds downward from a hinge above. Editorial, restrained.",
  },
  perspectiveIn: {
    from: { opacity: 0, z: -400, blur: 6 },
    to: { opacity: 0, z: 260, blur: 6 },
    perspective: 900,
    duration: 14,
    stagger: 3,
    group: "dimensional",
    blurb: "Arrives from depth and exits past the camera. Needs headroom.",
  },
  tiltIn: {
    from: { opacity: 0, rotateX: 25, rotateY: -15, y: "0.3em" },
    perspective: 900,
    duration: 13,
    stagger: 3,
    group: "dimensional",
    blurb: "Settles out of a slight 3D tilt. Subtle depth without a camera move.",
  },

  // ── Rotate & skew ───────────────────────────────────────────────────────
  rollIn: {
    from: { opacity: 0, rotate: -35, x: "-0.8em" },
    to: { opacity: 0, rotate: 35, x: "0.8em" },
    duration: 13,
    stagger: 3,
    group: "rotate",
    blurb: "Rolls in from the left and keeps rolling out to the right.",
  },
  swingIn: {
    from: { opacity: 0, rotate: 12, origin: "top center" },
    duration: 14,
    stagger: 3,
    ease: Easing.out(Easing.back(1.6)),
    group: "rotate",
    blurb: "Hangs from a point above and swings to rest.",
  },
  skewIn: {
    from: { opacity: 0, skewX: -18, x: "0.6em" },
    to: { opacity: 0, skewX: 18, x: "-0.6em" },
    duration: 11,
    stagger: 2,
    group: "rotate",
    blurb: "Italic-leaning shear that straightens up. Fast and energetic.",
  },
  pivotIn: {
    from: { opacity: 0, rotate: -12, origin: "left bottom" },
    duration: 12,
    stagger: 3,
    group: "rotate",
    blurb: "Pivots up around its bottom-left corner.",
  },

  // ── Kinetic ─────────────────────────────────────────────────────────────
  bounceIn: {
    from: { opacity: 0, y: "0.9em" },
    duration: 16,
    stagger: 3,
    ease: Easing.outBounce,
    group: "kinetic",
    blurb: "Drops and bounces to rest. Use sparingly.",
  },
  springUp: {
    from: { opacity: 0, y: "0.7em" },
    to: { opacity: 0, y: "-0.5em" },
    duration: 14,
    stagger: 3,
    ease: Easing.out(Easing.back(1.7)),
    group: "kinetic",
    blurb: "fadeUp with a small overshoot. Lively but still tasteful.",
  },
  jitterIn: {
    from: { opacity: 0, x: "0.3em", rotate: 6 },
    by: "char",
    duration: 8,
    stagger: 2,
    ease: Easing.outQuint,
    group: "kinetic",
    blurb: "Fast, slightly disordered per-character snap. Reads as energy.",
  },
  elasticIn: {
    from: { opacity: 0, scale: 0.5 },
    duration: 20,
    stagger: 4,
    ease: Easing.out(Easing.elastic(1)),
    group: "kinetic",
    blurb: "Rubbery overshoot on scale. The loudest thing in the catalog.",
  },

  // ── Editorial ───────────────────────────────────────────────────────────
  typewriter: {
    from: { opacity: 0 },
    step: true,
    group: "editorial",
    blurb: "Units appear one at a time, no fade. Pair with a monospace face.",
  },
  trackingIn: {
    from: { opacity: 0, letterSpacing: "0.4em" },
    by: "line",
    duration: 16,
    stagger: 4,
    group: "editorial",
    blurb: "Letter-spacing collapses from wide to normal. Title-sequence staple.",
  },
  trackingOut: {
    from: { opacity: 0, letterSpacing: "-0.15em" },
    by: "line",
    duration: 16,
    stagger: 4,
    group: "editorial",
    blurb: "Opens out of tight tracking. The inverse of trackingIn.",
  },
  lineRise: {
    from: { opacity: 1, y: "100%" },
    to: { opacity: 1, y: "-100%" },
    mask: true,
    by: "line",
    duration: 14,
    stagger: 4,
    group: "editorial",
    blurb: "Whole lines rise through their own mask. For stacked copy.",
  },
} as const satisfies Record<string, TextEffect>;

/** Alternative names for identical looks, kept so both read naturally. */
export const TEXT_EFFECT_ALIASES = {
  fade: "fadeIn",
  fadeDown: "dropIn",
  blurScale: "scaleBlur",
  wipeRight: "clipReveal",
} as const satisfies Record<string, keyof typeof TEXT_EFFECTS>;

export type TextEffectName =
  | keyof typeof TEXT_EFFECTS
  | keyof typeof TEXT_EFFECT_ALIASES;

/** Resolves a name (or alias) to its effect. */
export function getTextEffect(name: TextEffectName): TextEffect {
  const canonical =
    name in TEXT_EFFECT_ALIASES
      ? TEXT_EFFECT_ALIASES[name as keyof typeof TEXT_EFFECT_ALIASES]
      : (name as keyof typeof TEXT_EFFECTS);
  return TEXT_EFFECTS[canonical];
}

export const TEXT_EFFECT_NAMES = Object.keys(TEXT_EFFECTS) as (keyof typeof TEXT_EFFECTS)[];
