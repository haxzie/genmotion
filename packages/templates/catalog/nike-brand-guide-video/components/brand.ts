// Brand tokens for the guidelines film.
// The palette hexes are the ones the reference states on screen.

export const BRAND = {
  tagline: "JUST DO IT.",
  // The outro sets it in mixed case across three blocks, as the reference does.
  outroWords: ["Don’t", "do", "it."],
};

export const C = {
  ink: "#101010",
  paper: "#FEFEFE",
  sand: "#D1C481",
  bone: "#D1CDC9",
  muted: "#6B6B6B",
  rule: "rgba(16,16,16,0.38)",
};

// The four-up palette strip, in the order it steps into frame.
// Widths follow the reference's proportions at 1920 wide.
export const BANDS = [
  { hex: "#D1C481", label: "#D1C481", x: 864, w: 266, at: 10 },
  { hex: "#D1CDC9", label: "#D1CDC9", x: 1130, w: 296, at: 22 },
  { hex: "#FEFEFE", label: "#FEFEFE", x: 1426, w: 494, at: 34 },
];

export const DISPLAY = "Futura, 'Avenir Next Condensed', Inter, sans-serif";
export const CONDENSED = "'Avenir Next Condensed', Futura, Inter, sans-serif";
export const LABEL = "'Avenir Next', Inter, system-ui, sans-serif";

// Type specimens: the word, the face it demonstrates, and the colour its
// freshly-typed characters trail through. Word list and face labels follow
// the reference; the families are the closest cuts available on this system.
export const SPECIMEN = [
  {
    text: "TOMORROW",
    face: "Procrastina Extrabold",
    accent: "#3CB44A",
    family: DISPLAY,
    metrics: "futura",
    weight: 800,
    italic: false,
    tracking: "-0.01em",
  },
  {
    text: "SNOOZE",
    face: "Snooze Medium",
    accent: "#7B3FA0",
    family: DISPLAY,
    metrics: "futura",
    weight: 500,
    italic: false,
    tracking: "0em",
  },
  {
    text: "DOUBT IT.",
    face: "Doubtful Ultralight",
    accent: "#16C48A",
    family: CONDENSED,
    metrics: "condensed",
    weight: 700,
    italic: true,
    tracking: "0em",
  },
  {
    text: "SHRUG",
    face: "Shrug Compact",
    accent: "#C8641E",
    family: DISPLAY,
    metrics: "futura",
    weight: 800,
    italic: true,
    tracking: "0em",
  },
  {
    text: "FIND SNACKS.",
    face: "Mediocre Narrow",
    accent: "#1B4FA0",
    family: CONDENSED,
    metrics: "condensed",
    weight: 700,
    italic: false,
    tracking: "-0.01em",
  },
  {
    text: "DON’T DO IT.",
    face: "Whenever Condensed",
    accent: "#101010",
    family: CONDENSED,
    metrics: "condensed",
    weight: 800,
    italic: false,
    tracking: "-0.01em",
  },
];

// Typographic guideline rules. cap → baseline is 146px, which is the cap
// height of the specimen face at SPECIMEN_SIZE, so every word sits in the band
// exactly. The median rule sits 57% down, matching the reference proportions.
export const RULES = { cap: 474, median: 557, baseline: 620 };
export const RULE_X = { from: 100, to: 1820 };

// Per-family optical metrics, measured off rendered frames rather than guessed.
// `size` is the font size whose cap height equals the 146px cap→baseline band;
// `shift` is how far the lineHeight:1 box must drop for the glyph baseline to
// land on the baseline rule. Both are family properties — weight and italic
// don't change vertical metrics — so a family only needs measuring once.
//
//   Futura            cap = 0.780em  →  146 / 0.780 = 187
//   Avenir Next Cond  cap = 0.730em  →  146 / 0.730 = 200
export const METRICS = {
  futura: { size: 187, shift: "10%" },
  condensed: { size: 200, shift: "17.5%" },
} as const;

export type MetricKey = keyof typeof METRICS;

// Frames per specimen word, and the pace inside one. Six words at 25 frames
// fills the reference's 5.16s specimen section (155 frames), leaving the last
// word held for the final 5 frames to hand off to 04.
export const WORD_DUR = 25;
export const TYPE_DUR = 13;
export const HOLD_END = 19;

// Where the outro blocks sit — carried across the 04 → 05 cut unchanged.
// Derived from the reference frame at 13.5s, scaled 1.5× to 1920×1080.
export const OUTRO_BLOCKS = [
  { x: 285, y: 357, w: 265, h: 135 },
  { x: 885, y: 480, w: 145, h: 157 },
  { x: 1370, y: 307, w: 145, h: 138 },
];

function hex(c: string) {
  const s = c.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

/** Blend two hex colours. t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(A[0] + (B[0] - A[0]) * u);
  const g = Math.round(A[1] + (B[1] - A[1]) * u);
  const bl = Math.round(A[2] + (B[2] - A[2]) * u);
  return `rgb(${r}, ${g}, ${bl})`;
}
