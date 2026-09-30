/**
 * The song's clock. Measured from the track: 132 BPM, first downbeat at 0.269s.
 * Everything here takes GLOBAL song time in seconds (scene start + local time).
 */
export const FPS = 30;
export const BPM = 132;
export const SPB = 60 / BPM; // seconds per beat (0.4545)
export const OFFSET = 0.269; // first downbeat
export const BAR = SPB * 4;

/** Scene start frames on the global timeline (all on bar lines). */
export const SCENE_START = {
  intro: 0,
  servant: 390,
  chorus1: 663,
  singularity: 1154,
  sydney: 1644,
  chorus2: 1754,
  flops: 2190,
  gato: 2681,
  paperclips: 2844,
  fuse: 3281,
  foretold: 3717,
  finale: 4154,
  end: 4701,
} as const;

export const beatPos = (t: number) => (t - OFFSET) / SPB;
export const beatIndex = (t: number) => Math.floor(beatPos(t));
export const barIndex = (t: number) => Math.floor(beatPos(t) / 4);
const frac = (x: number) => x - Math.floor(x);

/** 1 on each beat, decaying exponentially over the beat. */
export function beatPulse(t: number, sharp = 5): number {
  if (t < OFFSET) return 0;
  return Math.exp(-frac(beatPos(t)) * sharp);
}
/** Same on every half beat (8ths). */
export function eighthPulse(t: number, sharp = 5): number {
  if (t < OFFSET) return 0;
  return Math.exp(-frac(beatPos(t) * 2) * sharp);
}
/** 1 on each downbeat, decaying over the bar. */
export function barPulse(t: number, sharp = 4): number {
  if (t < OFFSET) return 0;
  return Math.exp(-frac(beatPos(t) / 4) * sharp);
}
/** Snap a time to the nearest beat (seconds). */
export const beatTime = (n: number) => OFFSET + n * SPB;
export const barTime = (n: number) => OFFSET + n * BAR;

/** Normalised loudness per bar, measured from the track (bar 0 = 0.269s). */
const BARS = [0.18,0.4,0.42,0.37,0.4,0.43,0.36,0.44,0.47,0.55,0.54,0.6,0.45,0.67,0.69,0.7,0.65,0.64,0.63,0.72,0.74,0.68,0.71,0.7,0.69,0.68,0.7,0.69,0.69,0.59,0.48,0.64,0.54,0.69,0.74,0.73,0.76,0.73,0.71,0.77,0.83,0.71,0.77,0.72,0.78,0.77,0.75,0.8,0.85,0.42,0.26,0.42,0.48,0.35,0.33,0.4,0.36,0.44,0.33,0.45,0.6,0.85,0.84,0.83,0.8,0.8,0.8,0.86,0.91,0.87,0.88,0.82,0.81,0.84,0.86,0.84,0.21,0.91,0.95,0.98,1.0,0.96,0.94,0.89,0.52,0.05,0.0];
/** Smoothed energy 0..1 at time t. */
export function energy(t: number): number {
  const b = (t - OFFSET) / BAR - 0.5;
  const i = Math.max(0, Math.min(BARS.length - 1, Math.floor(b)));
  const j = Math.min(BARS.length - 1, i + 1);
  const f = Math.max(0, Math.min(1, b - Math.floor(b)));
  return BARS[i] * (1 - f) + BARS[j] * f;
}

/** Measured onset strength (0..9) on every 8th note. */
const HITS = "9256314251626046244071404363041445331530351332312131133253013153561150112112114132532170811110112211291971434540344332344242422442332453235322453154633141333233335436532443425321413153545220545344424144533151354131423371215243623252511241211243433121132392222329069153465243425473354363413222225622523564236244642152244423416633414251841253435221424286224223533253514242313552512141322231213241111211211121511002002110051311613763989078889991230018907111379111191907762676911029593236532244337244314445343224324433452174226221533332244331453121312115242332413221513282213133562244132242113532212121403352246210119085903251613223211372412231233421513362319441523333424142453021413000011111";
/** Onset-weighted pulse: flashes harder on the hits the track actually hits. */
export function hitPulse(t: number, sharp = 7): number {
  if (t < OFFSET) return 0;
  const p = beatPos(t) * 2;
  const i = Math.floor(p);
  const s = i >= 0 && i < HITS.length ? Number(HITS[i]) / 9 : 0;
  return s * Math.exp(-(p - i) * sharp);
}

/** Deterministic PRNG (mulberry32). Call in builders only. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Stateless hash 0..1 for per-frame jitter. */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
