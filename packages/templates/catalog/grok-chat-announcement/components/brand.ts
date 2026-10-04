/**
 * Palette and layout tokens, sampled from the reference (1080 x 1080 @ 60fps).
 * Every px value below is in reference pixels; the stage maps 1 unit = 1px.
 */
export const COLORS = {
  background: "#000000",
  incoming: "#121212", // bubble fill, sampled rgb(18,18,18)
  outgoing: "#26a1e9", // sent bubble, sampled rgb(38,161,233)
  text: "#ffffff",
  label: "#a9a9a9", // sender names
  dot: "#8e8e8e", // typing dots at rest
  dotLit: "#d0d0d0",
  reactionFill: "#131313",
};

export const FONT_FAMILY =
  '-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

export const LAYOUT = {
  /** Bottom edge of the newest bubble once the list has settled. */
  bottom: 902,
  incomingX: 163,
  outgoingRight: 917,
  textPad: 34,
  lineHeight: 49.5,
  firstLine: 48, // first line centre, measured from the bubble's top
  singleH: 97,
  labelX: 197,
  labelAbove: 30, // label centre sits this far above the bubble top
  avatar: 60,
  incomingAvatarX: 112,
  outgoingAvatarX: 967,
  typingW: 142,
};

/** The reference's measured scroll spring (fit to the tracked bubble edges). */
export const SCROLL_SPRING = { omega: 13.4, zeta: 0.88 };

/** The reference runs at 60fps; all timings in the chat script are in its frames. */
export const SOURCE_FPS = 60;
