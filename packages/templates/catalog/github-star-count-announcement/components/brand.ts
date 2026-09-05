/**
 * Firecrawl brand tokens — light theme.
 *
 * Orange #FA5D19 sampled from the official mark (assets/firecrawl-mark.svg,
 * fetched from firecrawl.dev). Warm off-white paper + hairline grid rules are
 * the Firecrawl "blueprint" look.
 * Figures pulled live from the GitHub API on 2026-09-05.
 */

export const brand = {
  // Paper
  paper: "#FBFAF8",
  paperWarm: "#F5F2EE",
  card: "#FFFFFF",

  // Ink (warm neutrals — all AA or better on `paper`)
  ink: "#1C1917", // 16.4:1
  inkSoft: "#44403C", // 10.3:1
  inkMuted: "#6E655D", // 5.3:1  — dimmest tone allowed for small text

  // Rules / grid
  rule: "rgba(28,25,23,0.14)",
  ruleSoft: "rgba(28,25,23,0.07)",
  ruleFaint: "rgba(28,25,23,0.035)",

  // Firecrawl orange
  flame: "#FA5D19",
  flameDeep: "#D1440A", // 4.6:1 on paper — safe for small text
  flameWash: "rgba(250,93,25,0.10)",

  font: "Inter, system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

/** Live GitHub data for firecrawl/firecrawl, fetched 2026-09-05. */
export const repo = {
  name: "firecrawl/firecrawl",
  owner: "firecrawl",
  repo: "firecrawl",
  stars: 176599,
  forks: 9665,
  createdLabel: "April 2024",
  todayLabel: "September 2026",
} as const;

/** The frame grid every element snaps to. */
export const grid = {
  W: 1920,
  H: 1080,
  margin: 80,
  cell: 96, // hairline grid pitch
  headerRule: 200, // y of the rule under the header band
  chartTop: 600, // y where the star-history chart begins
  baseline: 880, // y of the chart baseline — mirrors headerRule from the bottom
  footerRule: 992, // y of the outer bottom rule — mirrors the 88 top rule
} as const;
