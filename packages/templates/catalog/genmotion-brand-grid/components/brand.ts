/**
 * GenMotion brand tokens + the pixel-art icon bitmaps used by the tile grid.
 * The ramp is sampled straight off the logo gradient (#B0F932 -> #28F6AF),
 * with graphite and violet as the two off-ramp accents.
 */

export const BRAND = {
  bg: "#0A100E",
  line: "rgba(214,238,224,0.16)",
  ink: "#EAF2EC",

  // the GenMotion ramp, lime -> teal (logo gradient, top-left to bottom-right)
  lime: "#B0F932",
  green: "#8AF748",
  mint: "#5CF670",
  spring: "#3DF59B",
  teal: "#28F6AF",

  // supporting tones
  deepTeal: "#0FBF8E",
  graphite: "#0D1412",
  slate: "#2A3835",
  violet: "#7B5CFF",
  lavender: "#D6CBFF",
  paleMint: "#C8FFEA",
  chalk: "#EEFFE6",
} as const;

/** A bitmap is a list of equal-length rows; "#" paints, "." is transparent. */
export type Bitmap = readonly string[];

export const ICONS = {
  /** playback */
  play: [
    ".##....",
    ".###...",
    ".####..",
    ".#####.",
    ".####..",
    ".###...",
    ".##....",
  ],
  /** keyframe marker */
  keyframe: [
    "...#...",
    "..#.#..",
    ".#...#.",
    "#.....#",
    ".#...#.",
    "..#.#..",
    "...#...",
  ],
  /** AI sparkle */
  sparkle: [
    "...#...",
    "...#...",
    "..###..",
    "#######",
    "..###..",
    "...#...",
    "...#...",
  ],
  /** pointer */
  cursor: [
    "#......",
    "##.....",
    "###....",
    "####...",
    "#####..",
    "###....",
    "#.##...",
  ],
  /** stacked layers */
  layers: [
    "#######",
    "#..##.#",
    "#.....#",
    ".#####.",
    "#..##.#",
    "#.....#",
    "#######",
  ],
  /** clips staggered across timeline tracks */
  timeline: [
    "#####..",
    ".......",
    "..#####",
    ".......",
    "####...",
    ".......",
    ".######",
  ],
  /** easing curve */
  curve: [
    ".....##",
    "....#..",
    "...#...",
    "..##...",
    ".#.....",
    "#......",
    "#......",
  ],
  /** composition frame */
  frame: [
    "##...##",
    "#.....#",
    ".......",
    ".......",
    ".......",
    "#.....#",
    "##...##",
  ],
  /** the GenMotion pinwheel, traced off the logo at 11x11 */
  logo: [
    ".....#.....",
    "...###.....",
    "...####....",
    "...#######.",
    "..########.",
    "#####.#####",
    ".########..",
    ".#######...",
    "....####...",
    ".....###...",
    ".....#.....",
  ],
} satisfies Record<string, Bitmap>;

export type IconName = keyof typeof ICONS;

export type Variant = { bg: string; ink: string; icon: IconName };

/** The deck each animated cell shuffles through. */
export const VARIANTS: readonly Variant[] = [
  { bg: BRAND.lime, ink: BRAND.graphite, icon: "play" },
  { bg: BRAND.chalk, ink: BRAND.graphite, icon: "sparkle" },
  { bg: BRAND.spring, ink: BRAND.graphite, icon: "keyframe" },
  { bg: BRAND.green, ink: BRAND.graphite, icon: "layers" },
  { bg: BRAND.teal, ink: BRAND.graphite, icon: "cursor" },
  { bg: BRAND.violet, ink: BRAND.lavender, icon: "sparkle" },
  { bg: BRAND.mint, ink: BRAND.graphite, icon: "timeline" },
  { bg: BRAND.slate, ink: BRAND.teal, icon: "curve" },
  { bg: BRAND.lime, ink: BRAND.graphite, icon: "frame" },
  { bg: BRAND.deepTeal, ink: BRAND.paleMint, icon: "play" },
  { bg: BRAND.spring, ink: BRAND.graphite, icon: "logo" },
  { bg: BRAND.slate, ink: BRAND.lime, icon: "keyframe" },
  { bg: BRAND.teal, ink: BRAND.graphite, icon: "curve" },
  { bg: BRAND.chalk, ink: BRAND.violet, icon: "cursor" },
  { bg: BRAND.mint, ink: BRAND.graphite, icon: "frame" },
];
