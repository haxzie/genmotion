/**
 * Every timed event in the film, in one place, so the picture and the score
 * can never drift apart: every audio clip in project.json is cut to a frame
 * named here, so retiming a beat means moving its clip too.
 * Frames are local to each scene; SCENES gives each scene's global start.
 */

export const FPS = 30;

export const SCENES = {
  apply: { start: 0, length: 330 },
  notify: { start: 330, length: 105 },
  inbox: { start: 435, length: 280 },
  montage: { start: 715, length: 422 },
};

/* --------------------------------------------------------------- Act I */

const slow = [
  { page: "job", target: "easy-apply", start: 0, end: 48, click: 38, from: [1480, 760], z: [1.15, 1.6], rot: [0.06, -0.1, 0] },
  { page: "modal", target: "submit", start: 48, end: 92, click: 82, from: [900, 640], z: [1.45, 1.9], rot: [0.04, 0.08, 0], count: 1 },
  { page: "indeed", target: "apply-now", start: 92, end: 130, click: 121, from: [1350, 720], z: [1.4, 1.85], rot: [-0.05, -0.08, 0] },
  { page: "indeedApply", target: "submit", start: 130, end: 164, click: 155, from: [1150, 760], z: [1.45, 1.8], rot: [0.06, 0.05, 0], count: 2 },
  { page: "ats", target: "submit", start: 164, end: 192, click: 185, from: [1450, 820], z: [1.8, 2.2], rot: [-0.04, 0.1, 0], count: 3 },
  { page: "form", target: "submit", start: 192, end: 216, click: 210, from: [1000, 760], z: [1.9, 2.3], rot: [0.05, -0.06, 0], count: 4 },
] as { page: string; target: string; start: number; end: number; click: number; from: number[]; z: number[]; rot: number[]; count?: number }[];

const RAPID_LENGTHS = [7, 6, 6, 5, 5, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
const rapid: { start: number; end: number; count: number }[] = [];
{
  let f = 216;
  const n = RAPID_LENGTHS.length;
  let prev = 4;
  RAPID_LENGTHS.forEach((len, i) => {
    let c = Math.round(4 * Math.pow(247 / 4, (i + 1) / n));
    if (c <= prev) c = prev + 1;
    prev = c;
    rapid.push({ start: f, end: f + len, count: c });
    f += len;
  });
}

export const APPLY = {
  slow,
  rapid,
  final: { start: 292, end: 330, dark: 316 },
};

/* ------------------------------------------------- Act II: the phone */

export const NOTIFY_T = {
  wake: 12,          // the screen lights
  chime: 12,        // the notification sound, as the screen lights
  cardIn: 17,        // the notification rises in
  push: [30, 96],    // the camera leans in until it can be read
};

/* -------------------------------------------------------------- Act II */

export const Z_LOCK = 1.95;

export const INBOX_T = {
  dimUp: [0, 22],
  cursor: [
    [24, 1520, 940],
    [52, 1130, 560],
    [61, 1110, 548],
    [82, 840, 204],
  ] as [number, number, number][],
  rack: 38,
  rowClick: 88,
  cut: 92,
  scroll: [116, 128, 140, 154, 170],
  scrollLen: 9,
  push: [106, 240],
  focusPara: [128, 166],
  focusLine: [170, 202],
  beamAt: 202,
  beamArrive: 214,
  mouseDown: 216,
  drag: [218, 244],
  release: 246,
  cursorAway: [250, 264],
  glitch: [273, 279], // the line shudders on the cut into Act III
};

/* ------------------------------------------------------------- Act III */

const SHOT_LENGTHS = [12, 34, 30, 26, 22, 18, 15, 12, 10, 8, 7, 6, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2];
const shots: { start: number; end: number; mail: number }[] = [];
{
  let f = 0;
  SHOT_LENGTHS.forEach((len, i) => {
    shots.push({ start: f, end: f + len, mail: i % 8 });
    f += len;
  });
}

const E = shots[shots.length - 1]!.end;

export const MONTAGE = {
  shots,
  pull: [E, E + 68],
  black: [E + 98, E + 110],
  loop: { start: E + 110, dimUp: 16, arrive: E + 154, click: E + 166, cut: E + 168 },
  length: E + 188,
};
