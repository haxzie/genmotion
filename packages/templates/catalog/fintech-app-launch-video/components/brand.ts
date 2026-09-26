/**
 * LightPay — the palette and type tokens every scene draws from.
 *
 * The look is lifted from the reference edit: bright paper-white frames, one
 * electric lime accent used as fills, rays and glows (never as small text),
 * a warm peach glow for the app moments, and an electric blue for the one
 * word that has to punch.
 */
export const BRAND = {
  name: "LightPay",
  url: "lightpay.app",

  paper: "#ffffff",
  ink: "#0c0d10",
  /** Secondary copy on white: ≈6:1. */
  muted: "#5e606a",
  /** Secondary copy on lime: ≈9:1. */
  olive: "#2b3600",

  lime: "#c8f31d",
  limeBright: "#dcff4d",
  limeDeep: "#9ccc00",
  /** The glossy 3D type: dark enough to read on white and on the lime rays. */
  greenTop: "#3f8a00",
  greenBottom: "#255300",
  greenSide: "#173800",

  blue: "#1d2bf0",
  peach: "#ffd8bd",
  orange: "#ff7a3d",
  silver: "#e9eaee",
  grey: "#e6e6e2",
} as const;

export const FONT =
  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
