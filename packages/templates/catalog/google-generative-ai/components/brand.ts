// Shared tokens. The blue field is the handoff between scene 01 and scene 02 —
// it must be byte-identical on both sides of the cut, so it lives here.
export const BLUE_RADIAL =
  "radial-gradient(1500px 950px at 50% 44%, #2f52ff 0%, #16276b 52%, #060b22 100%)";

// The full-frame state the hero card opens out to at the end of scene 02, and
// that scene 03 opens on. Slightly overscanned so camera drift never exposes an
// edge. Both scenes must use these exact numbers.
export const HERO_FRAME = { left: -30, top: -20, width: 1980, height: 1120 };

// The Gemini mark's resting lockup — shared by scene 03's tail and scene 04.
export const MARK_SIZE = 190;
export const MARK_Y = -74;

export const INK = "#17171a";
export const PAPER = "#ffffff";
export const ON_BLUE = "#eef1ff";
export const FONT = "Inter, sans-serif";
