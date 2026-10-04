import * as THREE from "three";

/** Assemble launch film palette, sampled from the reference frames. */
export const BRAND = {
  bg: "#fdfdfd",
  ink: "#31302f", // primary words
  inkSoft: "#4a4a4a",
  accent: "#45748b", // slate-teal accent words ("Pricing", "custom logic.")
  accentLight: "#9fbccb", // pale accent (icons, node labels)
  grey: "#c4c7c9", // words before they ink
  muted: "#8c8f91",
  line: "#e6ecef", // hairline grid
  teal: "#3aa0c0", // bright dashed-ring teal
  glow: "#7fb0b8", // bottom glow in the second half
  mint: "#bfe7dc",
  black: "#0d0d0d", // wordmark
} as const;

export const C = Object.fromEntries(
  Object.entries(BRAND).map(([k, v]) => [k, new THREE.Color(v)]),
) as Record<keyof typeof BRAND, THREE.Color>;
