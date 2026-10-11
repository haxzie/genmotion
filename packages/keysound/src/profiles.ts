/**
 * What each keyboard and mouse sounds like, as a table.
 *
 * A profile is numbers, not code: a new keyboard is a new row and the synth
 * never asks which one it has. Every figure is a starting point taken from how
 * a keystroke is actually measured and then tuned by ear.
 *
 * Acoustically, a recorded key press shows a small *touch* peak as the finger
 * lands, a larger *hit* peak within tens of milliseconds as the stem bottoms
 * out, and a *release* peak about 100ms later at roughly half the height as the
 * slider tops out (Zhuang, Zhou & Tygar, "Keyboard Acoustic Emanations
 * Revisited", CCS 2005, fig. 3). Each of those is an impact — a short burst of
 * contact noise ringing a handful of resonances in the keycap, the housing and
 * the case — which is the standard modal model of a struck rigid body. "Thock"
 * is those resonances sitting below 500Hz with the highs damped; "clack" is
 * hard plastic on plastic above 2kHz; the metallic ring on a cheap switch is a
 * spring mode at 2-5kHz that decays slowly and mostly on the way back up.
 *
 * The tests pin the orderings that must survive tuning — thock darker than
 * linear, linear darker than clicky, a space bar deeper than a letter — rather
 * than the numbers themselves.
 */

/** Which voice a cue plays: the five key classes, and a mouse click. */
export type CueKind = "letter" | "space" | "enter" | "backspace" | "modifier" | "click";

/**
 * In index order. A bank lays its voices out in this order and `click` is last
 * so the keyboard kinds are a prefix.
 */
export const CUE_KINDS = ["letter", "space", "enter", "backspace", "modifier", "click"] as const;

export const KEY_KINDS = ["letter", "space", "enter", "backspace", "modifier"] as const;

/** A key on stabilisers: a wider cap on a wire, bigger-sounding, and it rattles once more. */
export function isLongKey(kind: CueKind): boolean {
  return kind === "space" || kind === "enter" || kind === "backspace";
}

/** One resonance of the struck object: a damped sinusoid. */
export interface Mode {
  hz: number;
  /**
   * Where `hz` has arrived by the end of this mode's T60. Equal to `hz` for
   * everything struck, which is nearly everything: a rigid body cannot change
   * pitch while it rings. Set it apart and the mode stops being a resonance and
   * becomes a played tone — `synth.ts` renders the two differently.
   */
  toHz: number;
  /** Time to fall 60dB, in milliseconds — the acoustician's decay figure. */
  t60Ms: number;
  /**
   * Relative level, linear. For a struck mode this is scaled by how hard the
   * contact drives that frequency; for a glided one it is the tone's own
   * amplitude, because nothing is driving it.
   */
  gain: number;
}

const mode = (hz: number, t60Ms: number, gain: number): Mode => ({ hz, toHz: hz, t60Ms, gain });

/**
 * A tone that bends from `hz` to `toHz` as it fades.
 *
 * Only two things here need it, and neither is a body being hit: a bubble rises
 * as it collapses (Minnaert), and a duck's quack falls as the bird runs out of
 * breath. Modelling either as a struck resonance gets a bell.
 */
const glide = (hz: number, toHz: number, t60Ms: number, gain: number): Mode => ({ hz, toHz, t60Ms, gain });

/** Whether the profile is a keyboard or a mouse — which sub-events a press has. */
export type Mechanism =
  /** Touch, bottom-out, release; a stabiliser tick on long keys. */
  | "keyboard"
  /** Press and release, nothing else. A microswitch has no travel to speak of. */
  | "mouse"
  /**
   * One strike and nothing else: glass has no travel and no release, and a
   * phone plays one sound per key.
   */
  | "tap";

/**
 * A held tone's end: it sustains until `holdMs` past the press, then dies with
 * time constant `releaseMs`. What a sample-based sound has and a struck body
 * does not — the phone's Delete is a note, not a knock.
 */
export interface Gate {
  holdMs: number;
  releaseMs: number;
}

/**
 * A different sound for one class of key.
 *
 * Where a mechanical board's long keys are the same switch under a bigger cap
 * (`longKeyRatio`), a phone plays a *different file* for Delete and for the
 * modifiers. An override replaces the body wholesale for its kind.
 */
export interface ClassSound {
  kind: CueKind;
  modes: readonly Mode[];
  gate?: Gate;
  /**
   * Level against the letter, in dB, after the scheduler has had its say. The
   * plan gives a long key +2.5dB and a modifier -4dB, which is right for a
   * board and is decided before the keyboard is known; a phone's three files
   * peak alike, so its overrides undo that here.
   */
  trimDb: number;
}

/** The table for one keyboard or mouse. */
export interface Profile {
  mechanism: Mechanism;
  /**
   * How long the contact noise lasts, in milliseconds. A harder contact is a
   * shorter burst and a brighter sound; this is the "manner of contact" knob.
   */
  exciteTauMs: number;
  /**
   * Where the contact noise rolls off. Foam, thick caps and lube all act as a
   * lowpass on the impact, which is most of what "thock" is.
   */
  contactLowpassHz: number;
  /** The body — case, keycap, housing, plate. */
  modes: readonly Mode[];
  /**
   * A spring or leaf ringing after the release, or none where the switch is
   * lubed. High-Q, quiet, and the thing that makes a stock switch sound cheap.
   */
  ping?: Mode;
  /**
   * The click jacket or bar of a clicky switch: a separate, very short, bright
   * impact at the moment of actuation, on the way down only (the MX Blue
   * mechanism; a box-bar switch would click both ways).
   */
  jacket?: readonly Mode[];
  /** The finger landing on the cap, relative to the hit. Soft and quiet. */
  touchDb: number;
  /** The slider topping out, relative to the hit. */
  releaseDb: number;
  /** How long after the press the release lands, in ms. Drawn per variant. */
  releaseDelayMs: readonly [number, number];
  /** How much lower a long key's body rings than a letter's. */
  longKeyRatio: number;
  /** Classes that are a different sound altogether. Empty for a real board. */
  overrides: readonly ClassSound[];
}

/** One row of the picker: an id to store, words to read, and the table. */
export interface SoundProfile {
  id: string;
  label: string;
  /** One line the picker shows under the name, and the agent reads in a list. */
  blurb: string;
  table: Profile;
}

// ── Keyboards ────────────────────────────────────────────────────────────────

/**
 * A stock linear — MX Red, Gateron Yellow — in a plastic case. Mid-bright
 * plastic, and a faint spring ping on the way back up.
 */
const LINEAR: Profile = {
  mechanism: "keyboard",
  exciteTauMs: 1.2,
  contactLowpassHz: 8_000,
  modes: [mode(320, 35, 0.5), mode(900, 20, 0.6), mode(2_600, 10, 1.0), mode(4_200, 6, 0.7)],
  ping: mode(3_600, 120, 0.08),
  touchDb: -18,
  releaseDb: -8,
  releaseDelayMs: [60, 140],
  longKeyRatio: 0.75,
  overrides: [],
};

/**
 * A tactile — MX Brown, Holy Panda. The bump slows the stem before it lands, so
 * the hit is a little duller and the body a little fuller.
 */
const TACTILE: Profile = {
  mechanism: "keyboard",
  exciteTauMs: 1.6,
  contactLowpassHz: 6_500,
  modes: [mode(300, 40, 0.6), mode(750, 25, 0.8), mode(2_200, 9, 0.8), mode(3_800, 5, 0.5)],
  ping: mode(3_400, 90, 0.05),
  touchDb: -18,
  releaseDb: -8,
  releaseDelayMs: [60, 140],
  longKeyRatio: 0.75,
  overrides: [],
};

/**
 * A clicky — MX Blue. The click jacket collapsing is its own impact, bright and
 * very short, on top of an ordinary plastic bottom-out.
 */
const CLICKY: Profile = {
  mechanism: "keyboard",
  exciteTauMs: 1.0,
  contactLowpassHz: 9_000,
  modes: [mode(340, 30, 0.4), mode(1_000, 15, 0.6), mode(3_000, 8, 1.0), mode(5_000, 5, 0.9)],
  ping: mode(4_200, 110, 0.1),
  jacket: [mode(3_600, 4, 0.8), mode(5_400, 3, 1.0), mode(7_200, 2, 0.6)],
  touchDb: -18,
  releaseDb: -8,
  releaseDelayMs: [60, 140],
  longKeyRatio: 0.75,
  overrides: [],
};

/**
 * Lubed linears in a foam-filled aluminium case under thick PBT. Everything
 * above 3kHz is gone, the case rings low and long, and there is no spring to
 * ping.
 */
const THOCK: Profile = {
  mechanism: "keyboard",
  exciteTauMs: 2.5,
  contactLowpassHz: 3_200,
  modes: [mode(210, 70, 1.0), mode(420, 45, 0.9), mode(800, 20, 0.5), mode(1_900, 6, 0.25)],
  touchDb: -20,
  releaseDb: -9,
  releaseDelayMs: [60, 140],
  longKeyRatio: 0.75,
  overrides: [],
};

/** The phone's letter. */
const PHONE_NORMAL: readonly Mode[] = [
  mode(350, 16, 1.0),
  mode(1_000, 10, 2.2),
  mode(340, 170, 0.32),
  mode(980, 120, 0.2),
];

/** The phone's space bar: the letter, lower and heavier. */
const PHONE_SPACE: readonly Mode[] = [
  mode(245, 18, 1.0),
  mode(700, 10, 1.4),
  mode(238, 190, 0.5),
  mode(690, 120, 0.15),
];

/**
 * The phone's "clear" sound: the Delete tone with a partial, held a little
 * longer. The partial's gain looks large against the tone's because the contact
 * pulse hands a 1.3kHz mode a tenth of what it hands 440Hz.
 */
const PHONE_CLEAR: readonly Mode[] = [mode(460, 8, 1.6), mode(440, 3_000, 0.56), mode(1_320, 150, 5.0)];
const PHONE_CLEAR_GATE: Gate = { holdMs: 85, releaseMs: 4 };

/**
 * The iPhone's keyboard, iOS 10 onwards — three sounds, measured from the
 * system's own files (`keyboard_press_normal`, `_delete`, `_clear`).
 *
 * A letter is a 4ms tick at 350Hz with a partial at 1kHz, then, fifteen
 * decibels quieter, a 340Hz ring that fades over 150ms: nothing above 1.5kHz,
 * 95% of the energy below 500Hz. Delete is a 440Hz tone — A4 — with a brighter
 * 5ms attack, held 80ms and released with a 4ms time constant. The "clear"
 * sound, which UIKit plays for its modifier keys, is the same tone with a
 * 1.32kHz partial 13dB under it. The space bar plays the normal sound; here it
 * is the letter dropped to seven tenths of its pitch, because the bar's own
 * weight is the one thing a listener misses from the real board.
 *
 * None of these is the 2-3kHz "Tock" of iOS 6 and earlier, which is what most
 * recordings labelled "iPhone click" on the internet actually are.
 */
const PHONE: Profile = {
  mechanism: "tap",
  exciteTauMs: 1.0,
  contactLowpassHz: 2_500,
  modes: PHONE_NORMAL,
  touchDb: 0,
  releaseDb: 0,
  releaseDelayMs: [0, 0],
  longKeyRatio: 1.0,
  overrides: [
    {
      kind: "backspace",
      modes: [mode(450, 10, 1.6), mode(440, 3_000, 0.63)],
      gate: { holdMs: 80, releaseMs: 4 },
      trimDb: -2.5,
    },
    { kind: "space", modes: PHONE_SPACE, trimDb: 0 },
    { kind: "enter", modes: PHONE_CLEAR, gate: PHONE_CLEAR_GATE, trimDb: -2.5 },
    { kind: "modifier", modes: PHONE_CLEAR, gate: PHONE_CLEAR_GATE, trimDb: 4 },
  ],
};

/**
 * The keyboards offered, in the order the picker shows them. `thock` is first
 * because it is the default (see `DEFAULT_KEYBOARD`).
 */
export const KEYBOARDS: readonly SoundProfile[] = [
  {
    id: "thock",
    label: "Thock",
    blurb: "Lubed linears in a foam-filled aluminium case. Deep, soft, nothing above 3kHz — the safest under narration.",
    table: THOCK,
  },
  {
    id: "linear",
    label: "Linear",
    blurb: "A stock MX Red in a plastic case. Mid-bright, a faint spring ping on the way back up.",
    table: LINEAR,
  },
  {
    id: "tactile",
    label: "Tactile",
    blurb: "An MX Brown. The bump dulls the hit and fills out the body — a little rounder than Linear.",
    table: TACTILE,
  },
  {
    id: "clicky",
    label: "Clicky",
    blurb: "An MX Blue: the click jacket snaps on the way down. The brightest, and the one that fights a voiceover.",
    table: CLICKY,
  },
  {
    id: "phone",
    label: "Phone",
    blurb: "An iPhone's on-screen keyboard. Low and bubbly, one sound per tap, with its own Delete and Return notes.",
    table: PHONE,
  },
];

// ── Mouse clicks ─────────────────────────────────────────────────────────────

/** A dull tap — a silent-switch mouse, or a trackpad. */
const CLICK_SOFT: Profile = {
  mechanism: "mouse",
  exciteTauMs: 1.4,
  contactLowpassHz: 5_000,
  modes: [mode(900, 10, 0.8), mode(2_000, 6, 0.6)],
  touchDb: 0,
  releaseDb: -4,
  releaseDelayMs: [70, 90],
  longKeyRatio: 1.0,
  overrides: [],
};

/** A crisp microswitch under a hard shell. */
const CLICK_MECHANICAL: Profile = {
  mechanism: "mouse",
  exciteTauMs: 0.6,
  contactLowpassHz: 10_000,
  modes: [mode(1_800, 6, 0.7), mode(3_200, 5, 1.0), mode(4_800, 3, 0.6)],
  touchDb: 0,
  releaseDb: -4,
  releaseDelayMs: [70, 90],
  longKeyRatio: 1.0,
  overrides: [],
};

/**
 * `soft` with the lid shut: a silenced switch through a soft shell, almost
 * nothing above 2kHz. The one to leave on under a voiceover — it reads as a
 * click without competing with a consonant.
 */
const CLICK_HUSH: Profile = {
  mechanism: "mouse",
  exciteTauMs: 2.2,
  contactLowpassHz: 2_200,
  modes: [mode(560, 12, 1.0), mode(1_250, 7, 0.45)],
  touchDb: 0,
  releaseDb: -5,
  releaseDelayMs: [70, 90],
  longKeyRatio: 1.0,
  overrides: [],
};

/**
 * A switch in a small hardwood shell. Wood is light and stiff and loses much
 * less per cycle than ABS, so the body rings four times longer than the plastic
 * ones here and does it low — a warm knock rather than a tick.
 */
const CLICK_WALNUT: Profile = {
  mechanism: "mouse",
  exciteTauMs: 1.9,
  contactLowpassHz: 3_000,
  modes: [mode(300, 45, 1.0), mode(680, 28, 0.45), mode(1_450, 14, 0.18), mode(2_600, 7, 0.06)],
  touchDb: 0,
  releaseDb: -4,
  releaseDelayMs: [70, 90],
  longKeyRatio: 1.0,
  overrides: [],
};

/**
 * A beige office mouse, twenty years old. A thin hollow ABS shell over a cheap
 * switch: boxy and mid-forward, with the highs still on it because there is no
 * foam, no lube and no mass anywhere in it. The fundamental is deliberately
 * weak — a shell that thin has very little surface to move air with at 800Hz,
 * and a strong low mode put this within a few per cent of `soft`, which is a
 * longer menu and not a wider choice.
 */
const CLICK_BEIGE: Profile = {
  mechanism: "mouse",
  exciteTauMs: 1.0,
  contactLowpassHz: 7_500,
  modes: [mode(820, 18, 0.35), mode(1_750, 16, 1.0), mode(3_250, 9, 0.8), mode(5_400, 5, 0.35)],
  touchDb: 0,
  releaseDb: -4,
  releaseDelayMs: [70, 90],
  longKeyRatio: 1.0,
  overrides: [],
};

/**
 * A knock on a short closed tube. The second mode is twice the first because
 * that is what a tube does, and a clear octave above the fundamental is what
 * makes this one read as a pitch rather than a noise.
 */
const CLICK_TOK: Profile = {
  mechanism: "mouse",
  exciteTauMs: 1.3,
  contactLowpassHz: 4_200,
  modes: [mode(640, 30, 1.0), mode(1_280, 16, 0.5), mode(2_450, 8, 0.2)],
  touchDb: 0,
  releaseDb: -4,
  releaseDelayMs: [70, 90],
  longKeyRatio: 1.0,
  overrides: [],
};

/**
 * Two small stones. Dense and tiny: high modes that are gone in a few
 * milliseconds, which is how it stays out of the way despite being bright.
 */
const CLICK_PEBBLE: Profile = {
  mechanism: "mouse",
  exciteTauMs: 0.55,
  contactLowpassHz: 10_500,
  modes: [mode(3_100, 5, 0.5), mode(5_000, 2.5, 1.0), mode(7_600, 1.5, 0.4)],
  touchDb: 0,
  releaseDb: -4,
  releaseDelayMs: [70, 90],
  longKeyRatio: 1.0,
  overrides: [],
};

/**
 * A pin on a steel plate. One high-Q mode doing almost all of it — steel at a
 * T60 of 55ms against plastic's 10 — over a tiny body thud for the contact
 * itself. The brightest of the ten, and damped well short of what steel would
 * happily do: at 5kHz a 190ms ring is sibilance territory, which is the one
 * place a repeating sound must not sit.
 */
const CLICK_TINK: Profile = {
  mechanism: "mouse",
  exciteTauMs: 0.5,
  contactLowpassHz: 11_000,
  modes: [mode(1_900, 5, 0.25), mode(5_200, 55, 1.0), mode(7_800, 22, 0.3)],
  touchDb: 0,
  releaseDb: -4,
  releaseDelayMs: [70, 90],
  longKeyRatio: 1.0,
  overrides: [],
};

/**
 * A bubble surfacing.
 *
 * A bubble's frequency *rises* as it collapses — Minnaert's result, pitch going
 * as the inverse of the radius — which is the whole character of the sound and
 * why this is a glide and not a struck mode. `tap` because a bubble has no
 * release: there is no slider to come back up.
 */
const CLICK_POP: Profile = {
  mechanism: "tap",
  exciteTauMs: 0.8,
  contactLowpassHz: 4_000,
  modes: [glide(420, 1_250, 55, 1.0), glide(840, 2_500, 25, 0.18)],
  touchDb: 0,
  releaseDb: 0,
  releaseDelayMs: [0, 0],
  longKeyRatio: 1.0,
  overrides: [],
};

/**
 * A duck.
 *
 * Not a struck body at all: a quack is voiced, which means a buzzy harmonic
 * stack rather than a handful of unrelated resonances. Ten harmonics of one
 * fundamental, all falling by the same ratio — a mallard hen's quack drops as
 * she runs out of breath, and a stack that held its pitch would read as a car
 * horn.
 *
 * **Every partial carries the same T60.** `bend` sweeps each mode over its own
 * T60, so partials given different decay times finish their sweeps at different
 * moments and the stack is only harmonic on the first sample. Harmonics of one
 * fundamental stay phase-locked, which is what makes the sum a pulse train, and
 * a pulse train is what "voiced" means; let them drift and it is ten sliding
 * sines — a kazoo. So the taper is in the gains instead, peaking on the fourth
 * partial: that 2kHz emphasis is the nasal formant, and half the energy sits
 * above it for the sound's whole length. That rasp is the duck.
 *
 * `exciteTauMs` is the attack, long here on purpose: a quack swells over its
 * first 20ms, where 1ms would put ten phase-aligned partials at full level on
 * sample zero and add a click in front of the bird.
 */
const CLICK_QUACK: Profile = {
  mechanism: "tap",
  exciteTauMs: 9.0,
  contactLowpassHz: 5_000,
  modes: [
    glide(520, 330, 220, 0.3),
    glide(1_040, 660, 220, 0.55),
    glide(1_560, 990, 220, 0.9),
    glide(2_080, 1_320, 220, 1.0),
    glide(2_600, 1_650, 220, 0.88),
    glide(3_120, 1_980, 220, 0.7),
    glide(3_640, 2_310, 220, 0.52),
    glide(4_160, 2_640, 220, 0.36),
    glide(4_680, 2_970, 220, 0.24),
    glide(5_200, 3_300, 220, 0.15),
  ],
  touchDb: 0,
  releaseDb: 0,
  releaseDelayMs: [0, 0],
  longKeyRatio: 1.0,
  overrides: [],
};

/**
 * Click sounds offered, and the spread matters more than the count: a click is
 * heard a couple of hundred times in a three-minute recording, under a voice,
 * and a viewer cannot turn it down separately from the narration. So most of
 * these sit low or sit brief — energy between 1 and 4kHz is where consonants
 * live and is the expensive place to put a sound that repeats. `hush` through
 * `walnut` are the ones to leave on while talking; `tink` and `pebble` are short
 * enough not to matter; `pop` and `quack` are not for a serious recording and
 * are not pretending to be.
 */
export const CLICKS: readonly SoundProfile[] = [
  { id: "soft", label: "Soft", blurb: "A dull tap — a silent-switch mouse, or a trackpad. The default.", table: CLICK_SOFT },
  { id: "hush", label: "Hush", blurb: "Soft with the lid shut: almost nothing above 2kHz. The safest under a voiceover.", table: CLICK_HUSH },
  { id: "mechanical", label: "Mechanical", blurb: "A crisp microswitch under a hard shell. Bright and quick.", table: CLICK_MECHANICAL },
  { id: "walnut", label: "Walnut", blurb: "A switch in a hardwood shell: a warm low knock that rings four times longer than plastic.", table: CLICK_WALNUT },
  { id: "beige", label: "Beige", blurb: "A twenty-year-old office mouse. Boxy, mid-forward, highs still on it.", table: CLICK_BEIGE },
  { id: "tok", label: "Tok", blurb: "A knock on a short closed tube, with a clear octave above the fundamental.", table: CLICK_TOK },
  { id: "pebble", label: "Pebble", blurb: "Two small stones. Bright, and gone in a few milliseconds.", table: CLICK_PEBBLE },
  { id: "tink", label: "Tink", blurb: "A pin on a steel plate. The brightest of them — use it sparingly.", table: CLICK_TINK },
  { id: "pop", label: "Pop", blurb: "A bubble surfacing, pitch rising as it collapses. Playful, not serious.", table: CLICK_POP },
  { id: "quack", label: "Quack", blurb: "A duck. Exactly what it says, and never under narration.", table: CLICK_QUACK },
];

/**
 * What a project gets when nobody chose: dark, soft and short enough to sit
 * under a voiceover, which is the only safe default for a sound that repeats
 * fifty times in a scene.
 */
export const DEFAULT_KEYBOARD = "thock";
export const DEFAULT_CLICK = "soft";

export function findKeyboard(id: string): SoundProfile | undefined {
  return KEYBOARDS.find((profile) => profile.id === id);
}

export function findClick(id: string): SoundProfile | undefined {
  return CLICKS.find((profile) => profile.id === id);
}

/** Either kind, by id — what a route or a tool argument resolves through. */
export function findProfile(id: string): { profile: SoundProfile; kind: "keyboard" | "click" } | undefined {
  const keyboard = findKeyboard(id);
  if (keyboard) return { profile: keyboard, kind: "keyboard" };
  const click = findClick(id);
  if (click) return { profile: click, kind: "click" };
  return undefined;
}
