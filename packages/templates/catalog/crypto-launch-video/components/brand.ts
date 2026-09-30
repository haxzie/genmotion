/** Palette + type tokens. Layout measured off the gains.trade reference; colours re-skinned to yellow / red (loss). */
export const C = {
  bg: "#070605",
  /** Primary accent (was the reference's mint). */
  yellow: "#ffd23f",
  yellowDeep: "#9e7f1f",
  /** Secondary accent + every number that is going the wrong way. */
  red: "#ff4d4f",
  redDeep: "#551518",
  /** Losses: counters, down-arrows, the chart. ≈5.9:1 on the background. */
  loss: "#ff4d4f",
  white: "#ededef",
  grey: "#9a9a9f",
  dim: "#6f6f76",
  hudFill: "#2a0d0e",
  hudBracketYellow: "#f2c230",
  hudBracketGrey: "#8a8a93",
  stroke: "#d9d9d9",
  panel: "#0d0e10",
  panelEdge: "#1c1d21",
  purple: "#5a1a1d",
};

/** Tech display face of the reference. System fallbacks keep it crisp offline. */
export const FONT_TECH = '"Bai Jamjuree", "SF Pro Display", system-ui, -apple-system, "Helvetica Neue", sans-serif';
/** Dashboard UI face. */
export const FONT_UI = 'Inter, "SF Pro Text", system-ui, -apple-system, "Helvetica Neue", sans-serif';
