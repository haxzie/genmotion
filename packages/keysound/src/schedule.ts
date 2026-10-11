/**
 * Which voice plays when, decided once.
 *
 * A cue carries everything a player needs that is not the samples: the moment,
 * the kind, which of the twelve variants, how loud, and where in the stereo
 * field. Cues are independent of the profile — a different keyboard is a
 * different bank under the same cues — so changing the sound swaps a bank rather
 * than re-planning.
 *
 * The variation here is what stops a run of presses sounding like a machine gun:
 * no two consecutive presses of a kind share a variant, every press is a little
 * louder or quieter than the last, and letters wander slightly across the stereo
 * image the way hands do across a board.
 */

import { Rng } from "./rng";
import { VARIANTS } from "./bank";
import { CUE_KINDS, type CueKind } from "./profiles";

/** One sound to place. */
export interface Cue {
  /** Milliseconds from the start of the run. The player puts the voice's onset here. */
  atMs: number;
  kind: CueKind;
  variant: number;
  /** Linear gain, before the clip's own volume. */
  gain: number;
  /** -1 left to +1 right. */
  pan: number;
}

/** An event to make a sound for: a key press, or a mouse click. */
export interface SoundEvent {
  atMs: number;
  kind: CueKind;
}

/**
 * Two presses of the same kind closer than this are one sound.
 *
 * Twelve milliseconds: rollover on a real board — two fingers landing almost
 * together — is one sound to the ear. Two *different* kinds this close both
 * play: Shift and a letter land together all day.
 */
export const MIN_SAME_KIND_GAP_MS = 12;

/** Level jitter per press, in dB either way. */
const JITTER_DB = 2;

/** A long key on a stabiliser is a bigger cap and a heavier hit. */
const LONG_KEY_DB = 2.5;

/** A modifier is pressed with the side of a finger and held; softer. */
const MODIFIER_DB = -4;

/** How far a letter may sit off centre. */
const LETTER_SPREAD = 0.15;

function db(value: number): number {
  return 10 ** (value / 20);
}

/**
 * Plans the sounds for a run of events.
 *
 * `events` need not be sorted; the result is, by `atMs`. `seed` fixes the plan,
 * so the same text with the same seed plans the same sounds forever.
 */
export function planCues(events: readonly SoundEvent[], seed: string): Cue[] {
  const sorted = [...events].sort((a, b) => a.atMs - b.atMs);
  const rng = new Rng(seed);
  const lastAt = new Map<CueKind, number>();
  const lastVariant = new Map<CueKind, number>();
  const out: Cue[] = [];

  for (const { atMs, kind } of sorted) {
    const previous = lastAt.get(kind);
    if (previous !== undefined && atMs - previous < MIN_SAME_KIND_GAP_MS) continue;
    lastAt.set(kind, atMs);

    // Drawn from the range one short and stepped past the last, so the choice is
    // uniform over the eleven that are not a repeat.
    let variant = rng.below(VARIANTS - 1);
    const before = lastVariant.get(kind);
    if (before !== undefined && variant >= before) variant += 1;
    lastVariant.set(kind, variant);

    const baseDb =
      kind === "space" || kind === "enter" || kind === "backspace"
        ? LONG_KEY_DB
        : kind === "modifier"
          ? MODIFIER_DB
          : 0;
    const gain = db(baseDb + rng.range(-JITTER_DB, JITTER_DB));

    // Always drawn, even for the kinds that ignore it, so a kind's place in the
    // sequence of draws does not depend on which kinds came before.
    const wander = rng.range(-LETTER_SPREAD, LETTER_SPREAD);
    const pan =
      kind === "letter"
        ? wander
        : // Return and Delete sit at the right hand; the modifiers a typist holds
          // are mostly on the left.
          kind === "enter" || kind === "backspace"
          ? LETTER_SPREAD
          : kind === "modifier"
            ? -LETTER_SPREAD
            : 0;

    out.push({ atMs, kind, variant, gain, pan });
  }

  return out;
}

/** The index a cue's kind carries, for anything crossing a wire. */
export function kindIndex(kind: CueKind): number {
  return CUE_KINDS.indexOf(kind);
}
