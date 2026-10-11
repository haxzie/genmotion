/**
 * How long a person takes between two keys.
 *
 * The naive version of this — one keystroke every `60000 / (wpm * 5)` ms — is
 * the single thing that makes a typing animation read as fake. Real typing is
 * nowhere near a metronome: the interval between two keystrokes varies by a
 * factor of five or more inside one sentence, and the variation is *structured*,
 * not noise. So the model here is four terms multiplied together, plus pauses
 * added on top:
 *
 * 1. **A base interval** from the asked-for words per minute (a word is five
 *    characters, which is the convention WPM is defined on).
 *
 * 2. **A digraph cost**, which is most of it. The time to hit a key depends
 *    mostly on which key came before, and the ordering is well established in
 *    the keystroke-dynamics literature: a doubled letter is the *fastest*
 *    digraph of all (one finger, a ballistic double tap), a hand alternation is
 *    next, two fingers of one hand is a little slower, and the same finger
 *    moving to a different key is by far the slowest — roughly twice a hand
 *    alternation, and worse the further it travels. Row jumps, outward rolls
 *    (index→pinky rather than pinky→index) and the weaker fingers each add to
 *    it. `layout.ts` is the geometry this reads.
 *
 * 3. **A drifting tempo**, as an AR(1) walk in log space. This is what gives
 *    typing its bursts and lulls: a run of five quick keys, then a slower
 *    patch. Independent per-keystroke noise cannot produce that — it sounds
 *    shuffled rather than human, which is audible immediately on a keyboard
 *    sound and is the usual failure of "add some jitter".
 *
 * 4. **Log-normal noise** per keystroke. Interkey intervals are right-skewed:
 *    the floor is physiological and the ceiling is attention, so the long tail
 *    is on the slow side only. A symmetric draw puts impossible 40ms intervals
 *    in the middle of a word.
 *
 * On top of those, the pauses that carry meaning: after a comma, longer after a
 * full stop, longer again after a newline, a planning pause before a long word,
 * and the occasional outright hesitation. And Shift, which is a real key press
 * with its own sound, held across a run of capitals rather than tapped per
 * letter.
 *
 * Then mistakes. A typed line with one typo backspaced out is unmistakably a
 * person; a clean one never quite is. The model slips onto a neighbouring key,
 * notices a character or two later, pauses, backspaces in an even rapid run, and
 * retypes a little more carefully — which is the actual shape of the thing, and
 * four distinct sounds.
 *
 * Everything is drawn from one seeded generator in a fixed order, so a text and
 * a seed give the same rhythm forever. A video that re-renders must not re-time.
 */

import { Rng } from "./rng";
import { keyFor, neighbours, travel, type Key } from "./layout";
import type { CueKind } from "./profiles";
import type { SoundEvent } from "./schedule";

/** One key going down. */
export interface Keystroke {
  /** Milliseconds from the start of the run. */
  atMs: number;
  kind: CueKind;
  /** The character it produced, or null for Shift and Backspace. */
  char: string | null;
  /**
   * What is on screen once this key has landed. With a correction in flight this
   * is *not* a prefix of the finished text, which is exactly the point — a
   * caller animating the text draws this, and gets the wrong letter and its
   * deletion for free.
   */
  text: string;
  /** True while this keystroke is part of a mistake or its correction. */
  correcting?: boolean;
}

export interface TypingPlan {
  /** The text as asked for. Always what the last keystroke leaves on screen. */
  text: string;
  keystrokes: Keystroke[];
  /** The cue events, for `planCues`. */
  events: SoundEvent[];
  /** When the last key lands, plus the tail its sound needs. */
  durationMs: number;
  /** Characters of final text per minute ÷ 5, corrections and pauses included. */
  effectiveWpm: number;
  /** How many slips the run made. */
  mistakes: number;
}

export interface TypingOptions {
  /**
   * Words per minute, a word being five characters. 40 is unhurried, 60 is an
   * ordinary office typist, 80-100 is fast and 120 is a demo nobody believes.
   * Default 62.
   */
  wpm?: number;
  /**
   * Fixes the rhythm. The same text and seed always time out identically — a
   * re-render must not re-time. Default `"genmotion"`.
   */
  seed?: string;
  /**
   * Chance per character of hitting the wrong key, 0 to 0.1. Each slip costs a
   * notice, a pause, one to three backspaces and a retype, so even 0.02 is
   * visible once or twice in a sentence. Default 0.01; pass 0 for a clean run.
   */
  typoRate?: number;
  /**
   * Scales the thinking pauses — at word starts, after punctuation, and the
   * outright hesitations. 0 types straight through, 1 is ordinary, 2 is someone
   * composing as they go. Default 1.
   */
  hesitation?: number;
  /**
   * Scales the per-keystroke noise and the tempo drift. 0 is a metronome (and
   * sounds like one), 1 is a person. Default 1.
   */
  variation?: number;
  /**
   * Stretch or squeeze the finished plan to exactly this many milliseconds.
   *
   * Applied as one linear scale over every moment, so the rhythm's shape — the
   * bursts, the pauses, which digraphs are quick — survives intact; only the
   * tempo changes. Use it when the typing has to fill a scene of a known length.
   * A scale outside 0.4-2.5 is clamped, because beyond that the result stops
   * being plausible typing, and `effectiveWpm` reports what it landed on.
   */
  fitMs?: number;
}

/** A word is five characters: the convention WPM is defined on. */
const CHARS_PER_WORD = 5;

/**
 * What the base interval is divided by so that `wpm` means what it says.
 *
 * The digraph costs average above 1 — most of them are not hand alternations —
 * and the word-planning pauses add more, so an uncalibrated base lands about
 * 30% slow. Measured over ordinary English prose at 40, 62 and 90wpm; the ratio
 * there is 1.27-1.32, hence this.
 *
 * Deliberately a constant and not a per-text normalisation. Dividing each text
 * by its *own* mean cost would make every text hit the number exactly and in
 * doing so erase the thing the model is for: code and shell commands are
 * genuinely slower to type than prose (the same measurement puts them at
 * 1.5-1.7), and a model that hid that would have an agent sizing a scene for a
 * command line as though it were a sentence.
 */
const WPM_CALIBRATION = 1.3;

/** Nothing human types two keys closer than this, nor waits longer in one go. */
const MIN_IKI_MS = 42;
const MAX_IKI_MS = 2_200;

/** Digraph costs, as multiples of the base interval. */
const SAME_KEY = 0.72;
const ALTERNATE_HAND = 0.9;
const SAME_HAND = 1.1;
const SAME_FINGER = 1.6;
/** Added per row of vertical travel on one hand. */
const ROW_JUMP = 0.13;
/** Added per key width when one finger has to move. */
const SAME_FINGER_TRAVEL = 0.14;
/** An outward roll (index towards pinky) against the easier inward one. */
const OUTWARD_ROLL = 0.08;

/** Per-finger weight on the *target* key: the weak fingers are slower. */
const FINGER_WEIGHT = [1.0, 1.04, 1.12, 1.22, 0.96] as const;

/** The number row is a reach off the home position for every finger. */
const NUMBER_ROW = 1.16;

/** Holding Shift costs the hand that is also typing. */
const SHIFT_COST = 0.3;
/** Shift goes down this long before the key it modifies. */
const SHIFT_LEAD_MS: readonly [number, number] = [55, 105];

/** How strongly the tempo remembers the last keystroke, and how far it wanders. */
const TEMPO_MEMORY = 0.86;
const TEMPO_DRIFT = 0.1;
/** Per-keystroke log-normal spread. */
const IKI_SIGMA = 0.21;

/** Pauses after a character, in ms, before whatever comes next. */
const AFTER: readonly { chars: string; range: readonly [number, number] }[] = [
  { chars: ".!?", range: [240, 620] },
  { chars: ",;:", range: [90, 210] },
  { chars: ")]}\"'", range: [40, 110] },
  { chars: "-–—/", range: [30, 90] },
];

/** A newline is a thought ending: the longest ordinary pause there is. */
const AFTER_NEWLINE: readonly [number, number] = [280, 720];

/** Planning a word before typing it, and how much likelier a long one is. */
const WORD_PAUSE_CHANCE = 0.3;
const WORD_PAUSE_MS: readonly [number, number] = [70, 240];
const LONG_WORD = 8;

/** An outright stop to think. */
const HESITATE_CHANCE = 0.035;
const HESITATE_MS: readonly [number, number] = [340, 1_100];

/** Noticing a slip, and clearing it. */
const NOTICE_MS: readonly [number, number] = [190, 460];
const BACKSPACE_MS: readonly [number, number] = [68, 115];
/** The breath between the last backspace and typing it again. */
const RESUME_MS: readonly [number, number] = [90, 200];
/** Retyping is deliberate: the keys after a correction come slower. */
const RETYPE_COST = 0.14;
/** And ease back to normal over the next few keys rather than the next one. */
const RETYPE_DECAY = 0.55;
/** How many more characters go in before the eye catches up. */
const NOTICE_AFTER = [0, 1, 1, 2, 2, 3] as const;

/** The tail a voice needs to ring out past the last key (see `synth.MAX_MS`). */
const TAIL_MS = 320;

/** What the run does when the rhythm has to fit a fixed length. */
const FIT_LIMITS: readonly [number, number] = [0.4, 2.5];

function classOf(char: string): CueKind {
  if (char === " ") return "space";
  if (char === "\n") return "enter";
  return "letter";
}

/** The cost of going from `from` to `to`, as a multiple of the base interval. */
function digraphCost(from: Key | undefined, to: Key): number {
  let cost: number;
  if (!from) {
    cost = 1;
  } else if (from.code === to.code) {
    // A doubled letter is the fastest digraph there is: one finger already in
    // place, tapping twice. Getting this backwards is the most audible mistake
    // a typing model can make — "ll" and "ee" are everywhere.
    cost = SAME_KEY;
  } else if (from.hand !== to.hand) {
    cost = ALTERNATE_HAND;
  } else if (from.finger === to.finger) {
    cost = SAME_FINGER + travel(from, to) * SAME_FINGER_TRAVEL;
  } else {
    cost = SAME_HAND + Math.abs(from.row - to.row) * ROW_JUMP;
    if (to.finger > from.finger) cost += OUTWARD_ROLL;
  }
  cost *= FINGER_WEIGHT[to.finger] ?? 1;
  if (to.row === 0) cost *= NUMBER_ROW;
  return cost;
}

/**
 * Plans the keystrokes for a piece of text.
 *
 * The result is the plan for *both* the sound and the picture: the same moments
 * drive the keyboard voices and whatever draws the text, so a typing scene can
 * never drift from the sound of itself.
 */
export function planTyping(text: string, options: TypingOptions = {}): TypingPlan {
  const {
    wpm = 62,
    seed = "genmotion",
    typoRate = 0.01,
    hesitation = 1,
    variation = 1,
    fitMs,
  } = options;

  const rng = new Rng(`typing/${seed}/${text.length}`);
  const base = 60_000 / (Math.max(5, wpm) * CHARS_PER_WORD) / WPM_CALIBRATION;
  const chars = [...text];

  const keystrokes: Keystroke[] = [];
  let at = 0;
  let onScreen = "";
  let previous: Key | undefined;
  /** Log-space tempo: positive is slower than nominal. */
  let tempo = 0;
  let shiftHeld = false;
  let mistakes = 0;
  /** Extra cost while a correction is still fresh in the fingers. */
  let retypePenalty = 0;
  /** Added to the next interval: the pause that belongs to what came before. */
  let pending = 0;

  const span = ([low, high]: readonly [number, number]) => rng.range(low, high);

  /** The interval before the next key, with everything applied. */
  function interval(key: Key | undefined, extraCost: number): number {
    const cost = key ? digraphCost(previous, key) : 1;
    tempo = tempo * TEMPO_MEMORY + rng.normal() * TEMPO_DRIFT * variation;
    const noise = rng.normal() * IKI_SIGMA * variation;
    const shaped = base * (cost + extraCost) * Math.exp(tempo + noise);
    const clamped = Math.min(Math.max(shaped, MIN_IKI_MS), MAX_IKI_MS);
    const total = clamped + pending;
    pending = 0;
    return total;
  }

  function press(kind: CueKind, char: string | null, nextText: string, correcting?: boolean): void {
    onScreen = nextText;
    keystrokes.push({ atMs: Math.round(at), kind, char, text: onScreen, ...(correcting ? { correcting } : {}) });
  }

  /** One character onto the screen, Shift and all. */
  function type(char: string, correcting?: boolean): void {
    const key = keyFor(char);
    const needsShift = key?.shifted ?? false;

    // Shift is *held* across a run of capitals rather than tapped per letter,
    // which is both what a typist does and the difference between one modifier
    // sound and six.
    if (needsShift && !shiftHeld) {
      at += interval(key, SHIFT_COST + retypePenalty);
      const lead = span(SHIFT_LEAD_MS);
      // The modifier lands before the key it modifies: the interval just drawn
      // is to the letter, and Shift goes down `lead` ahead of it.
      const letterAt = at;
      at = Math.max(keystrokes[keystrokes.length - 1]?.atMs ?? 0, letterAt - lead);
      press("modifier", null, onScreen, correcting);
      at = letterAt;
      shiftHeld = true;
    } else {
      at += interval(key, (needsShift ? SHIFT_COST : 0) + retypePenalty);
    }
    if (!needsShift) shiftHeld = false;

    press(classOf(char), char, onScreen + char, correcting);
    previous = key;
    retypePenalty *= RETYPE_DECAY;

    // The pause that belongs to this character, paid before the next one.
    if (char === "\n") {
      pending += span(AFTER_NEWLINE) * hesitation;
      return;
    }
    const after = AFTER.find((entry) => entry.chars.includes(char));
    if (after) pending += span(after.range) * hesitation;
  }

  function backspace(): void {
    // `pending` carries the pause that belongs to what came before — for the
    // first backspace of a correction, the time the eye took to notice. The
    // backspaces after it run on their own fast, even cadence.
    at += span(BACKSPACE_MS) + pending;
    pending = 0;
    previous = undefined;
    press("backspace", null, onScreen.slice(0, -1), true);
  }

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char === undefined) continue;

    // A word boundary is where a typist plans, and where they stop to think.
    const startsWord = i === 0 || chars[i - 1] === " " || chars[i - 1] === "\n";
    if (startsWord && hesitation > 0) {
      const word = /\S*/.exec(text.slice(i))?.[0] ?? "";
      const chance = WORD_PAUSE_CHANCE * (word.length >= LONG_WORD ? 1.7 : 1);
      if (rng.next() < chance * hesitation) pending += span(WORD_PAUSE_MS) * hesitation;
      if (rng.next() < HESITATE_CHANCE * hesitation) pending += span(HESITATE_MS) * hesitation;
    }

    // A slip: a neighbouring key, noticed a character or two later, backspaced
    // out and retyped. Never on a space or a newline — a missed space reads as
    // two words run together, which is a different mistake and a worse one to
    // watch.
    const slips = typoRate > 0 && char !== " " && char !== "\n" && rng.next() < typoRate;
    const slipTo = slips ? neighbours(char) : [];
    if (slips && slipTo.length > 0) {
      mistakes++;
      const wrong = slipTo[rng.below(slipTo.length)] ?? char;
      type(wrong, true);

      // How far the fingers get before the eye catches up.
      const extra = NOTICE_AFTER[rng.below(NOTICE_AFTER.length)] ?? 1;
      const typedOn: string[] = [];
      for (let k = 1; k <= extra && i + k < chars.length; k++) {
        const next = chars[i + k];
        if (next === undefined || next === "\n") break;
        typedOn.push(next);
        type(next, true);
      }

      pending += span(NOTICE_MS);
      for (let k = 0; k <= typedOn.length; k++) backspace();
      pending += span(RESUME_MS);
      // Retyping is deliberate. The penalty decays over the next few keys.
      retypePenalty = RETYPE_COST;

      type(char, true);
      for (const again of typedOn) type(again, true);
      i += typedOn.length;
      continue;
    }

    type(char);
  }

  let plan: Keystroke[] = keystrokes;
  let duration = Math.round(at) + TAIL_MS;

  if (fitMs !== undefined && fitMs > 0 && at > 0) {
    // One linear scale over every moment: the rhythm's shape is kept and only
    // the tempo moves.
    const wanted = Math.max(1, fitMs - TAIL_MS);
    const scale = Math.min(Math.max(wanted / at, FIT_LIMITS[0]), FIT_LIMITS[1]);
    plan = keystrokes.map((stroke) => ({ ...stroke, atMs: Math.round(stroke.atMs * scale) }));
    duration = Math.round(at * scale) + TAIL_MS;
  }

  const last = plan[plan.length - 1];
  const spanMs = last ? last.atMs : 0;
  return {
    text,
    keystrokes: plan,
    events: plan.map((stroke) => ({ atMs: stroke.atMs, kind: stroke.kind })),
    durationMs: duration,
    effectiveWpm: spanMs > 0 ? Math.round((text.length / CHARS_PER_WORD / (spanMs / 1_000)) * 60) : 0,
    mistakes,
  };
}

/**
 * The plan as frame steps, for a scene that draws the text.
 *
 * A GenMotion scene is a pure function of the current frame, so it cannot read a
 * clock: it needs to know what the text says *on frame n*. Consecutive
 * keystrokes that land on one frame collapse — at 30fps two keys 20ms apart are
 * one frame, and the earlier one was never seen.
 */
export function toFrameSteps(plan: TypingPlan, fps: number): { frame: number; text: string }[] {
  const steps: { frame: number; text: string }[] = [];
  for (const stroke of plan.keystrokes) {
    if (stroke.kind === "modifier") continue;
    const frame = Math.round((stroke.atMs / 1_000) * fps);
    const last = steps[steps.length - 1];
    if (last && last.frame === frame) last.text = stroke.text;
    else steps.push({ frame, text: stroke.text });
  }
  return steps;
}

/** What the text says on `frame`. Nothing before the first keystroke lands. */
export function textAtFrame(steps: readonly { frame: number; text: string }[], frame: number): string {
  let low = 0;
  let high = steps.length - 1;
  let found = "";
  while (low <= high) {
    const mid = (low + high) >> 1;
    const step = steps[mid];
    if (!step) break;
    if (step.frame <= frame) {
      found = step.text;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}
