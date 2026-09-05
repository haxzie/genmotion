// Prequel brand tokens.
// Colors sampled directly from the official app icon (assets/prequel-logo.svg).

export const brand = {
  // Surface — the video runs on a sleek white stage.
  bg: "#ffffff",
  bgSoft: "#f7f7f8",
  surface: "#f2f2f4",
  hairline: "rgba(0,0,0,0.07)",
  hairlineStrong: "rgba(0,0,0,0.12)",

  // Type on white. Both clear WCAG AA.
  text: "#16161a", // ~16.8:1
  textMuted: "#6b6b73", // ~5.2:1

  // Signature marks from the icon.
  sunsetFrom: "#e14b15",
  sunsetTo: "#ac1860",
  playhead: "#4e84f9",
  selection: "#c000f0",
  handle: "#eeacff",
  iconBase: "#1e1e1e",
} as const;

export const font = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

export const type = {
  hero: {
    fontSize: 132,
    fontWeight: 500,
    letterSpacing: "-0.035em",
    color: brand.text,
    fontFamily: font,
    margin: 0,
    lineHeight: 1,
  },
  sub: {
    fontSize: 38,
    fontWeight: 400,
    letterSpacing: "-0.01em",
    color: brand.textMuted,
    fontFamily: font,
    margin: 0,
  },
  eyebrow: {
    fontSize: 26,
    fontWeight: 500,
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color: brand.textMuted,
    fontFamily: font,
    margin: 0,
  },
} as const;

// macOS squircle. Used for every dock tile and the hero icon.
export const squircle = 0.2237;
