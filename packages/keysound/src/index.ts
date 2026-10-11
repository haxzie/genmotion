/**
 * Keyboard and mouse sounds, synthesised locally, and the typing rhythm that
 * drives them.
 *
 * Nothing here calls a network or reads a sample library. A keystroke is
 * arithmetic — a few impacts ringing a table of resonances (`synth.ts`) — so a
 * typing run for a scene costs a few hundred milliseconds of CPU and no
 * credits, which is what makes it a tool an agent can use freely rather than one
 * it has to ask about. It is also why it is deterministic: the same text, seed
 * and profile give the same file byte for byte, so re-rendering a project never
 * re-times or re-voices its typing.
 *
 * The three things a caller wants:
 *
 * - `renderTyping(text, …)` — a WAV of someone typing that text, plus the
 *   keystroke timings, so the picture and the sound come from one plan.
 * - `renderClicks(times, …)` — a WAV of mouse clicks at given moments.
 * - `renderDemo(id)` — a few seconds of one profile, for a picker's play button.
 */

export { Rng, seedFrom } from "./rng";
export {
  CLICKS,
  CUE_KINDS,
  DEFAULT_CLICK,
  DEFAULT_KEYBOARD,
  KEYBOARDS,
  KEY_KINDS,
  findClick,
  findKeyboard,
  findProfile,
  isLongKey,
  type ClassSound,
  type CueKind,
  type Mechanism,
  type Mode,
  type Profile,
  type SoundProfile,
} from "./profiles";
export { MIN_SAME_KIND_GAP_MS, kindIndex, planCues, type Cue, type SoundEvent } from "./schedule";
export { SAMPLE_RATE, VARIANTS, clickBank, keyBank, voiceOf, type Bank } from "./bank";
export { MAX_MS, ONSET_MS, renderVoice, type Voice } from "./synth";
export { keyFor, neighbours, type Hand, type Key } from "./layout";
export {
  planTyping,
  textAtFrame,
  toFrameSteps,
  type Keystroke,
  type TypingOptions,
  type TypingPlan,
} from "./typing";
export { mix, type MixOptions } from "./mix";
export { toWav } from "./wav";

import { SAMPLE_RATE, clickBank, keyBank, type Bank } from "./bank";
import { mix } from "./mix";
import {
  CLICKS,
  DEFAULT_CLICK,
  DEFAULT_KEYBOARD,
  KEYBOARDS,
  findClick,
  findKeyboard,
  type SoundProfile,
} from "./profiles";
import { planCues, type Cue, type SoundEvent } from "./schedule";
import { planTyping, toFrameSteps, type TypingOptions, type TypingPlan } from "./typing";
import { toWav } from "./wav";

/** Thrown when a caller names a profile that does not exist. */
export class UnknownProfileError extends Error {
  constructor(id: string, kind: "keyboard" | "click") {
    const names = (kind === "keyboard" ? KEYBOARDS : CLICKS).map((p) => p.id).join(", ");
    super(`No ${kind} sound called "${id}". Available: ${names}`);
    this.name = "UnknownProfileError";
  }
}

/**
 * Banks, kept for the life of the process.
 *
 * Sixty voices is about eighteen seconds of synthesis and a few megabytes; doing
 * it per call would dominate a run of a hundred keystrokes. There are fifteen
 * profiles in total, so an unbounded cache is bounded anyway.
 */
const banks = new Map<string, Bank>();

function bankFor(profile: SoundProfile, kind: "keyboard" | "click"): Bank {
  const key = `${kind}:${profile.id}`;
  const cached = banks.get(key);
  if (cached) return cached;
  const made = kind === "keyboard" ? keyBank(profile.id, profile.table) : clickBank(profile.id, profile.table);
  banks.set(key, made);
  return made;
}

/** What the pickers and the `list` tools show. */
export interface ProfileInfo {
  id: string;
  label: string;
  blurb: string;
  isDefault: boolean;
}

export interface ProfileCatalog {
  keyboards: ProfileInfo[];
  clicks: ProfileInfo[];
}

function info(profile: SoundProfile, fallback: string): ProfileInfo {
  return { id: profile.id, label: profile.label, blurb: profile.blurb, isDefault: profile.id === fallback };
}

export function listProfiles(): ProfileCatalog {
  return {
    keyboards: KEYBOARDS.map((p) => info(p, DEFAULT_KEYBOARD)),
    clicks: CLICKS.map((p) => info(p, DEFAULT_CLICK)),
  };
}

/** A rendered run: the file, and everything needed to place it or draw it. */
export interface SoundRender {
  /** A 48kHz 16-bit stereo WAV. */
  wav: Uint8Array;
  sampleRate: number;
  durationMs: number;
  cues: Cue[];
  profile: string;
}

export interface TypingRender extends SoundRender {
  plan: TypingPlan;
  /**
   * What the text says on each frame, when `fps` was given. A scene draws from
   * this: it is a pure function of the frame, which is the only kind of state a
   * GenMotion scene may have.
   */
  steps?: { frame: number; text: string }[];
}

export interface TypingRenderOptions extends TypingOptions {
  /** Keyboard id. Default `thock`. */
  profile?: string;
  /** Include frame steps for a scene that draws the text. */
  fps?: number;
  /**
   * Linear gain on the mix. Keys belong well under the rest of a film — 6dB or
   * more under any hit in the picture, which is 0.5 or less — so the default
   * leaves the file at full scale and the level is set on the timeline clip,
   * where it is visible and adjustable.
   */
  gain?: number;
}

export function renderTyping(text: string, options: TypingRenderOptions = {}): TypingRender {
  const id = options.profile ?? DEFAULT_KEYBOARD;
  const profile = findKeyboard(id);
  if (!profile) throw new UnknownProfileError(id, "keyboard");

  const plan = planTyping(text, options);
  const cues = planCues(plan.events, `${options.seed ?? "genmotion"}/${id}`);
  const samples = mix(bankFor(profile, "keyboard"), cues, {
    durationMs: plan.durationMs,
    ...(options.gain !== undefined ? { gain: options.gain } : {}),
  });

  return {
    wav: toWav(samples, SAMPLE_RATE),
    sampleRate: SAMPLE_RATE,
    durationMs: plan.durationMs,
    cues,
    profile: id,
    plan,
    ...(options.fps ? { steps: toFrameSteps(plan, options.fps) } : {}),
  };
}

export interface ClickRenderOptions {
  /** Click id. Default `soft`. */
  profile?: string;
  seed?: string;
  gain?: number;
  /** How long the file runs. Default: the last click plus its tail. */
  durationMs?: number;
}

/** A run of mouse clicks at the given moments, in milliseconds. */
export function renderClicks(times: readonly number[], options: ClickRenderOptions = {}): SoundRender {
  const id = options.profile ?? DEFAULT_CLICK;
  const profile = findClick(id);
  if (!profile) throw new UnknownProfileError(id, "click");

  const events: SoundEvent[] = times.map((atMs) => ({ atMs: Math.max(0, atMs), kind: "click" as const }));
  const cues = planCues(events, `${options.seed ?? "genmotion"}/${id}`);
  const bank = bankFor(profile, "click");
  const last = cues[cues.length - 1];
  const tailMs = ((bank.voices[0]?.length ?? 0) / bank.sampleRate) * 1_000;
  const durationMs = options.durationMs ?? Math.round((last ? last.atMs : 0) + tailMs);
  const samples = mix(bank, cues, {
    durationMs,
    ...(options.gain !== undefined ? { gain: options.gain } : {}),
  });

  return { wav: toWav(samples, SAMPLE_RATE), sampleRate: SAMPLE_RATE, durationMs, cues, profile: id };
}

/**
 * The phrase every keyboard demo types.
 *
 * A picker previews a profile before anything is written, so there is no real
 * typing to plan from. A fixed phrase, long enough to hear a rhythm and short
 * enough that pressing play again is not a wait — and it carries a capital, a
 * space, a full stop and a newline, so every key class but Backspace is in it.
 * The typo rate puts the Backspace in: the slip is what makes the demo sound
 * like typing rather than like a drum machine, and with a fixed seed the same
 * keyboard always demos identically.
 */
const DEMO_PHRASE = "The quick brown fox.\n";
const DEMO_SEED = "demo";
const DEMO_TYPO_RATE = 0.09;
/** Brisk, and with the thinking pauses mostly out: a picker is not a rehearsal. */
const DEMO_WPM = 78;
const DEMO_HESITATION = 0.4;

/** Where a click demo's single click falls: far enough in that nothing is clipped. */
const DEMO_CLICK_AT_MS = 60;

/**
 * A few seconds of one profile, for a picker's play button.
 *
 * A keyboard gets the phrase and a mouse gets one click: what distinguishes two
 * keyboards is partly the rhythm of a run of keys, which takes a few seconds to
 * hear, while a mouse has one voice and no rhythm, so a second click only says
 * what the first already did.
 */
export function renderDemo(id: string): SoundRender & { kind: "keyboard" | "click" } {
  if (findKeyboard(id)) {
    const render = renderTyping(DEMO_PHRASE, {
      profile: id,
      seed: DEMO_SEED,
      typoRate: DEMO_TYPO_RATE,
      wpm: DEMO_WPM,
      hesitation: DEMO_HESITATION,
    });
    return { ...render, kind: "keyboard" };
  }
  if (findClick(id)) {
    return { ...renderClicks([DEMO_CLICK_AT_MS], { profile: id, seed: DEMO_SEED }), kind: "click" };
  }
  throw new UnknownProfileError(id, "keyboard");
}
