/**
 * Palette and type tokens. Layout and greens are the template's; the GenMotion
 * mark gradient (gmLime → gmMint) and ink tones come from genmotion.dev.
 */
export const C = {
  bg: "#f6f9fc",
  ink: "#0a0b0d",
  green: "#0aa062",
  greenScreen: "#0a8f58",
  greenDeep: "#076b42",
  waveGreen: "#c6f91e",
  red: "#e24245",
  accept: "#16c98f",
  cancel: "#3a3a3c",
  bezel: "#0b0b0b",
  bezelRim: "#3a3a3c",
  greyName: "#8a8a8e",
  bubbleGrey: "#ededed",
  pane: "#fdfdfd",
  sidebar: "#f3f3f3",
  white: "#ffffff",
  black: "#000000",
  eye: "#f4f5f3",
  darkBg: "#030a07",
  gmLime: "#c6f91e",
  gmMint: "#16f5bd",
  gmText: "#ededef",
} as const;

export const FONT = '"Inter Display", Inter, -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
export const FONT_TEXT = 'Inter, -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
