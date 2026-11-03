/**
 * GenMotion palette, type and the film grade every shot shares.
 * Change GRADE.saturation to bring colour back into the whole film (0 = the
 * reference's black-and-white, 1 = full colour).
 */
export const FONT = 'Inter, -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
export const MONO = '"SF Mono", "JetBrains Mono", Menlo, monospace';

export const UI = {
  bg: "#0c0c0e",
  panel: "#151518",
  panel2: "#1c1c20",
  field: "#232328",
  line: "#2c2c32",
  text: "#ededef",
  muted: "#8a8a93",
  faint: "#5a5a63",
  accent: "#c6f91e",
  accent2: "#16f5bd",
};

export const GRADE = {
  saturation: 0,
  contrast: 1.12,
  grain: 0.055,
  /** Corner darkening. Kept faint so the frame has no dark border. */
  vignette: 0.12,
  /** Letterbox bar height as a fraction of frame height. 0 = full 16:9 frame (the reference used 110 / 1080). */
  bar: 0,
};

/** The real GenMotion mark, from apps/desktop/public/logo.svg (512 viewBox). */
export const LOGO_PATH =
  "M280.083 111.725V38.5C280.083 25.2083 269.208 14.3333 255.917 14.3333C179.55 14.3333 118.65 108.1 111.642 231.833H38.4167C25.125 231.833 14.25 242.708 14.25 256C14.25 332.367 108.017 393.267 231.75 400.275V473.5C231.75 486.792 242.625 497.667 255.917 497.667C332.283 497.667 393.183 403.9 400.192 280.167H473.417C486.708 280.167 497.583 269.292 497.583 256C497.583 179.633 403.817 118.733 280.083 111.725ZM255.917 292.25C235.858 292.25 219.667 276.058 219.667 256C219.667 235.942 235.858 219.75 255.917 219.75C275.975 219.75 292.167 235.942 292.167 256C292.167 276.058 275.975 292.25 255.917 292.25Z";

/**
 * The GenMotion desktop app's own design tokens, copied from
 * apps/web/src/app/globals.css (the desktop app uses that stylesheet verbatim).
 */
export const APP = {
  background: "#08080a",
  surface: "#0f0f12",
  surfaceRaised: "#17171b",
  surfaceHover: "#1f1f24",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  textPrimary: "#ededef",
  textSecondary: "#a0a0a6",
  textTertiary: "#6b6b71",
  accent: "#3b6ef6",
  scrub: "#ff5c5c",
  /** rgb triplets, for the `colour/alpha` utilities the app uses. */
  purple: "167,139,250",
  orange: "251,146,60",
};
