/**
 * Sequel — brand tokens (sequel.sh)
 *
 * Sequel connects marketing, product and finance data to any AI agent.
 * The site is LIGHT mode. The mark is a ring carrying a magenta -> blue
 * gradient (sampled from https://sequel.sh/logo.png, saved to assets/).
 *
 * Change a colour here and the whole video re-skins.
 */

export const brand = {
  // Surfaces — light mode, matching the site
  bg: "#ffffff",
  bgSoft: "#fafafb",
  surface: "#ffffff",
  hairline: "rgba(10,10,11,0.10)",

  // Type
  ink: "#0a0a0b", // primary — 20:1 on white
  inkMuted: "#5f6169", // secondary — 6.2:1 on white, the dimmest allowed
  inkOnAccent: "#ffffff",

  // The mark's gradient
  pink: "#e8156b",
  purple: "#7b2bc4",
  blue: "#2e36e6",

  font: "Inter, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

/** The logo gradient, as a CSS value. `angle` in degrees. */
export const brandGradient = (angle = 135) =>
  `linear-gradient(${angle}deg, ${brand.pink} 0%, ${brand.purple} 52%, ${brand.blue} 100%)`;

/** Soft brand aurora for light backgrounds. `dx`/`dy` drift it, `k` sets intensity. */
export const brandAurora = (dx = 0, dy = 0, k = 1) =>
  [
    `radial-gradient(920px 640px at ${54 + dx}% ${28 + dy}%, rgba(232,21,107,${0.11 * k}) 0%, rgba(232,21,107,0) 62%)`,
    `radial-gradient(1040px 720px at ${42 - dx}% ${74 - dy}%, rgba(46,54,230,${0.11 * k}) 0%, rgba(46,54,230,0) 64%)`,
    `radial-gradient(760px 520px at ${50 + dy}% ${52 - dx}%, rgba(123,43,196,${0.06 * k}) 0%, rgba(123,43,196,0) 60%)`,
    brand.bg,
  ].join(", ");

/** The same aurora for dark frames — the closing lockup lives on this. */
export const brandAuroraDark = (dx = 0, dy = 0, k = 1) =>
  [
    `radial-gradient(1000px 700px at ${52 + dx}% ${44 + dy}%, rgba(232,21,107,${0.30 * k}) 0%, rgba(232,21,107,0) 62%)`,
    `radial-gradient(1150px 780px at ${46 - dx}% ${58 - dy}%, rgba(46,54,230,${0.32 * k}) 0%, rgba(46,54,230,0) 64%)`,
    `radial-gradient(820px 560px at ${50 + dy}% ${50 - dx}%, rgba(123,43,196,${0.24 * k}) 0%, rgba(123,43,196,0) 60%)`,
    "#0a0a0b",
  ].join(", ");

/** Ink for dark frames. */
export const inkOnDark = {
  primary: "#ededef", // 17:1 on #0a0a0b
  muted: "#8a8a93", // 5.8:1 — the dimmest allowed
} as const;

/** Type scale for 1920x1080. */
export const type = {
  hero: 86,
  title: 64,
  body: 36,
  label: 30,
  eyebrow: 26,
} as const;
