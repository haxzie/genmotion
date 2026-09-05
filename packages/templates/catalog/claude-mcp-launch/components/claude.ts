/**
 * claude.ai's light theme, shared by every scene that depicts Claude.
 *
 * Scenes draw Claude's UI at its REAL pixel dimensions and magnify with
 * `scale(n)`, so proportions stay correct at any camera distance. Pick the
 * factor so that 16px body copy still clears the readability floor at the
 * widest framing in that scene.
 */
export const claude = {
  page: "#faf9f5",
  pageGradient:
    "radial-gradient(1700px 1100px at 50% 42%, #fdfcf9 0%, #faf9f5 55%, #f1efe6 100%)",

  text: "#1f1e1d",
  textSoft: "#3d3d3a",
  muted: "#6b6a63",
  placeholder: "#9c9b93",

  border: "#e3e1d9",
  surface: "#ffffff",

  coral: "#d97757",
  green: "#4f7d5a",

  serif: "Georgia, 'Times New Roman', serif",
} as const;

/** Magnification helper: `const px = scale(2.2)` then `px(16)`. */
export const scale = (s: number) => (n: number) => n * s;
