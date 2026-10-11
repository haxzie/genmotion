/**
 * Every voice a profile can play, rendered once.
 *
 * A bank is a pure function of its profile: the variant seeds are fixed, so two
 * renders of the same keyboard are the same samples. Twelve variants a kind is
 * enough that a run of letters does not repeat inside a word, and small enough —
 * about 3.5MB of float for a keyboard — to hold for a session.
 */

import { Rng } from "./rng";
import { CUE_KINDS, KEY_KINDS, type CueKind, type Profile } from "./profiles";
import { renderVoice, type Voice } from "./synth";

/** Variants rendered per kind. */
export const VARIANTS = 12;

/**
 * The rate every bank is rendered at.
 *
 * 48kHz because that is what ffmpeg mixes the project's audio at, and a bank at
 * the wrong rate would play every sound pitch-shifted — which is the kind of
 * wrong that sounds deliberate.
 */
export const SAMPLE_RATE = 48_000;

export interface Bank {
  sampleRate: number;
  /**
   * Where the press falls in every voice. The same for all of them, so a player
   * subtracts one number rather than one per voice.
   */
  onset: number;
  kinds: readonly CueKind[];
  /** `kinds.length * VARIANTS` voices, kind-major. */
  voices: readonly Float32Array[];
}

function render(id: string, profile: Profile, kinds: readonly CueKind[]): Bank {
  let onset = 0;
  const voices: Float32Array[] = [];

  for (const kind of kinds) {
    for (let variant = 0; variant < VARIANTS; variant++) {
      // Seeded by name, kind and index rather than by position in the loop, so
      // adding a kind or a profile leaves every existing voice exactly as it was.
      const seed = new Rng(`${id}/${CUE_KINDS.indexOf(kind)}/${variant}`).nextU64();
      const voice: Voice = renderVoice(profile, kind, seed, SAMPLE_RATE);
      onset = voice.onset;
      voices.push(voice.samples);
    }
  }

  return { sampleRate: SAMPLE_RATE, onset, kinds, voices };
}

/** The five key kinds of a keyboard. */
export function keyBank(id: string, profile: Profile): Bank {
  return render(id, profile, KEY_KINDS);
}

/** The one kind of a mouse. */
export function clickBank(id: string, profile: Profile): Bank {
  return render(id, profile, ["click"]);
}

/**
 * The samples for a cue, or `undefined` for a kind this bank does not have — a
 * click asked of a keyboard bank, which a player treats as silence.
 */
export function voiceOf(bank: Bank, kind: CueKind, variant: number): Float32Array | undefined {
  const slot = bank.kinds.indexOf(kind);
  if (slot < 0 || variant < 0 || variant >= VARIANTS) return undefined;
  return bank.voices[slot * VARIANTS + variant];
}
