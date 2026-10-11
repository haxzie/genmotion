/**
 * One keystroke, rendered.
 *
 * A voice is a few impacts laid on one timeline. Each impact is a burst of
 * contact noise — white noise under an exponential decay, low-passed by how
 * soft the contact is — driven through the profile's resonators, which ring and
 * fade the way a struck keycap does. There is no oscillator playing a "click"
 * here; the pitch a listener hears is the body ringing, which is why the same
 * code makes a thock and a clack from different tables.
 *
 * Everything random is drawn from the variant's own generator in a fixed order,
 * so a variant is a pure function of its seed.
 */

import { Rng } from "./rng";
import { isLongKey, type CueKind, type Gate, type Mode, type Profile } from "./profiles";

/** A rendered press: mono samples and where the press itself sits in them. */
export interface Voice {
  samples: Float32Array;
  /**
   * The sample the key-down event falls on. The finger's touch is rendered
   * *before* this, so a voice placed with its onset on the cue's moment puts the
   * touch where it happened rather than late.
   */
  onset: number;
}

/**
 * Where the press sits in the voice, in milliseconds. Leaves room for the touch
 * lead and its jitter in front of it.
 */
export const ONSET_MS = 15;

/** The longest a voice may be. Bounds the bank. */
export const MAX_MS = 300;

/** The finger lands this long before the switch registers. */
const TOUCH_LEAD_MS = 10;

/** The stem bottoms out this long after actuation, at typing speed. */
const HIT_DELAY_MS = 5;

/**
 * Every voice is scaled so its peak sits here, -6dBFS. Leaves the scheduler
 * headroom for a louder long key and its jitter without the mixer clipping.
 */
const TARGET_PEAK = 0.501;

/** Spread on every sub-event's timing, as a fraction. */
const TIMING_JITTER = 0.15;

/**
 * Spread on each mode's frequency per variant. Keycaps are not identical and
 * neither are fingers; ±6% is a semitone either way, which is the most that
 * still reads as the same key.
 */
const DETUNE = 0.06;

/** Spread on the contact time per variant. */
const TAU_SPREAD = 0.2;

/** Spread on a phone's pitch per variant. See `renderVoice`. */
const TAP_DETUNE = 0.012;

/** The stabiliser rattle lands this long after the hit. */
const STABILISER_DELAY_MS: readonly [number, number] = [2, 6];
const STABILISER_DB = -10;

/**
 * The click jacket is its own impact: hard, tiny, and much brighter than the
 * bottom-out, so its own contact figures rather than the profile's.
 */
const JACKET_DB = -6;
const JACKET_TAU_MS = 0.4;
const JACKET_LOWPASS_HZ = 12_000;

/** The touch is a fingertip, which is soft whatever the keyboard. */
const TOUCH_LOWPASS_HZ = 1_000;

/**
 * The tail is cut where it falls below this, -80dBFS. Below the encoder's noise
 * floor, and well below the -60dB a voice's last few milliseconds need.
 */
const TRIM_FLOOR = 1e-4;

/** The contact of one impact. */
interface Excite {
  tauMs: number;
  lowpassHz: number;
  /**
   * Noise, or a clean pulse. A real switch's contact is a scrape and no two are
   * alike, which is what noise gives; a phone plays one file, and a random burst
   * would ring its two low modes in a different balance on every variant. A
   * half-sine pulse `tauMs` long — the impact force of the contact literature —
   * excites each mode by a known amount, so the table's gains mean what they say
   * and only the detune varies.
   */
  noisy: boolean;
}

function db(value: number): number {
  return 10 ** (value / 20);
}

/** Renders one press of `kind` on `profile`. */
export function renderVoice(profile: Profile, kind: CueKind, variantSeed: bigint, sampleRate: number): Voice {
  const rng = new Rng(variantSeed);
  const rate = sampleRate;
  const ms = (value: number) => Math.round((value * rate) / 1_000);

  const out = new Float32Array(ms(MAX_MS));
  const onset = ms(ONSET_MS);

  // A class with its own sound uses it whole; otherwise the board's body, lower
  // for a long key.
  const custom = profile.overrides.find((sound) => sound.kind === kind);
  const ratio = !custom && isLongKey(kind) ? profile.longKeyRatio : 1;
  // A phone plays the same file every time, so its variants are barely detuned —
  // a tone that wandered a semitone between presses would sound like a different
  // instrument, not a different finger.
  const detune = profile.mechanism === "tap" ? TAP_DETUNE : DETUNE;
  // The body is detuned once per variant and then struck several times, so the
  // touch, the hit and the release all ring the same keycap. Both ends of a
  // glide move together, so a detuned variant bends by the same interval from a
  // different starting note — detuning only `hz` would change the interval per
  // variant, and would turn every non-gliding mode into a slight glide.
  const body: Mode[] = (custom?.modes ?? profile.modes).map((m) => {
    const shift = rng.around(detune);
    return { ...m, hz: m.hz * ratio * shift, toHz: m.toHz * ratio * shift };
  });
  const tau = profile.exciteTauMs * rng.around(TAU_SPREAD);
  const contact: Excite = {
    tauMs: tau,
    lowpassHz: profile.contactLowpassHz,
    noisy: profile.mechanism !== "tap",
  };

  const trim = custom?.trimDb ?? 0;

  if (profile.mechanism === "keyboard") {
    const touchAt = Math.max(0, onset - ms(TOUCH_LEAD_MS * rng.around(TIMING_JITTER)));
    strike(out, touchAt, db(profile.touchDb), {
      tauMs: tau * 2,
      lowpassHz: Math.min(TOUCH_LOWPASS_HZ, profile.contactLowpassHz),
      noisy: true,
    }, body, rate, rng);

    if (profile.jacket) {
      const jacket: Mode[] = profile.jacket.map((m) => {
        const shift = rng.around(DETUNE);
        return { ...m, hz: m.hz * shift, toHz: m.toHz * shift };
      });
      strike(out, onset, db(JACKET_DB), { tauMs: JACKET_TAU_MS, lowpassHz: JACKET_LOWPASS_HZ, noisy: true }, jacket, rate, rng);
    }

    const hitAt = onset + ms(HIT_DELAY_MS * rng.around(TIMING_JITTER));
    strike(out, hitAt, 1, contact, body, rate, rng);

    if (isLongKey(kind)) {
      const tickAt = hitAt + ms(rng.range(STABILISER_DELAY_MS[0], STABILISER_DELAY_MS[1]));
      strike(out, tickAt, db(STABILISER_DB), { ...contact, tauMs: tau * 0.7 }, body, rate, rng);
    }

    const releaseAt = onset + ms(rng.range(profile.releaseDelayMs[0], profile.releaseDelayMs[1]));
    // The ping is struck by the release like any other mode, rather than added
    // as a tone: driven by the same burst it sits at a level relative to the
    // body that the table can reason about.
    const releaseBody = [...body];
    if (profile.ping) {
      const shift = rng.around(DETUNE);
      releaseBody.push({ ...profile.ping, hz: profile.ping.hz * shift, toHz: profile.ping.toHz * shift });
    }
    strike(out, releaseAt, db(profile.releaseDb), { ...contact, tauMs: tau * 0.8 }, releaseBody, rate, rng);
  } else if (profile.mechanism === "tap") {
    strike(out, onset, 1, contact, body, rate, rng);
    if (custom?.gate) releaseGate(out, onset, custom.gate, rate);
  } else {
    strike(out, onset, 1, contact, body, rate, rng);
    const releaseAt = onset + ms(rng.range(profile.releaseDelayMs[0], profile.releaseDelayMs[1]));
    strike(out, releaseAt, db(profile.releaseDb), { ...contact, tauMs: tau * 0.8 }, body, rate, rng);
  }

  normalise(out);
  // After the normalise, so a class's trim is against the letter's peak and not
  // against whatever level its own body happened to sum to.
  if (trim !== 0) {
    const scale = db(trim);
    for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) * scale;
  }

  return { samples: cutTail(out, onset), onset };
}

/**
 * Adds one impact to `out`, starting at `start`.
 *
 * The burst is generated once and pushed through every mode; each mode is a
 * two-pole resonator. At a T60 of 120ms the pole sits at 0.9988, which is why
 * the recursion runs in doubles throughout.
 */
function strike(
  out: Float32Array,
  start: number,
  level: number,
  excite: Excite,
  modes: readonly Mode[],
  rate: number,
  rng: Rng,
): void {
  if (start >= out.length) return;

  const tauSamples = (excite.tauMs * rate) / 1_000;
  // Noise: eight time constants, by when the burst is at -70dB. A pulse: one
  // half-sine, `tau` long.
  const burstLen = excite.noisy
    ? Math.max(2, Math.ceil(tauSamples * 8))
    : Math.max(2, Math.ceil(tauSamples));
  const lowpass = 1 - Math.exp((-2 * Math.PI * excite.lowpassHz) / rate);

  const burst = new Float64Array(burstLen);
  let smoothed = 0;
  for (let n = 0; n < burstLen; n++) {
    const shaped = excite.noisy
      ? (rng.next() * 2 - 1) * Math.exp(-n / tauSamples)
      : Math.sin((Math.PI * n) / burstLen);
    smoothed += lowpass * (shaped - smoothed);
    burst[n] = smoothed;
  }

  for (const mode of modes) {
    // T60 to a time constant: 60dB is a factor of 1000 in amplitude.
    const decaySamples = (mode.t60Ms * rate) / 1_000 / Math.log(1000);

    // A mode that bends is not a resonance and is not driven by the burst.
    if (mode.toHz !== mode.hz) {
      bend(out, start, level, mode, decaySamples, tauSamples, rate);
      continue;
    }

    const r = Math.exp(-1 / decaySamples);
    const omega = (2 * Math.PI * mode.hz) / rate;
    const a1 = 2 * r * Math.cos(omega);
    const a2 = -(r * r);
    // A resonator's impulse response peaks at about 1/sin(ω), which would make
    // a 200Hz mode twenty times louder than a 4kHz one for the same table gain.
    // Scaled back so the table's gains mean what they say.
    const gain = level * mode.gain * Math.sin(omega);

    // Run until the mode has fallen 80dB below where the burst left it.
    const run = burstLen + Math.floor((decaySamples * 80 * Math.LN10) / 20);
    const end = Math.min(start + run, out.length);

    let y1 = 0;
    let y2 = 0;
    for (let i = start; i < end; i++) {
      const x = burst[i - start] ?? 0;
      const y = x + a1 * y1 + a2 * y2;
      y2 = y1;
      y1 = y;
      out[i] = (out[i] ?? 0) + gain * y;
    }
  }
}

/**
 * Adds a played tone that bends from `hz` to `toHz` as it fades.
 *
 * A resonator cannot do this. Its two poles are fixed the moment `a1` and `a2`
 * are computed, and walking them while it rings modulates the level — the
 * `sin(ω)` scaling above moves with the pitch — as well as risking a pole
 * outside the unit circle. A phase accumulator has neither problem: the
 * frequency is whatever the ramp says on that sample, and the amplitude is the
 * envelope and nothing else.
 *
 * The attack is the contact time, which is the one thing this shares with an
 * impact: a sinusoid that starts at full amplitude on sample zero is a step, and
 * the step is an audible tick in front of the sound it was supposed to be.
 *
 * The bend runs over the mode's T60, linear in frequency: by the time a mode is
 * inaudible it has finished bending, so the figure in the table is the pitch a
 * listener actually arrives at.
 */
function bend(
  out: Float32Array,
  start: number,
  level: number,
  mode: Mode,
  decaySamples: number,
  attackSamples: number,
  rate: number,
): void {
  const run = Math.floor((decaySamples * 80 * Math.LN10) / 20);
  const end = Math.min(start + run, out.length);
  const span = (mode.t60Ms * rate) / 1_000;
  // A zero-length attack would divide by zero and a sub-sample one cannot be
  // heard anyway.
  const attack = Math.max(attackSamples, 1);
  const from = mode.hz;
  const sweep = mode.toHz - mode.hz;
  const gain = level * mode.gain;

  let phase = 0;
  for (let i = start; i < end; i++) {
    const n = i - start;
    const envelope = Math.exp(-n / decaySamples) * (1 - Math.exp(-n / attack));
    out[i] = (out[i] ?? 0) + gain * envelope * Math.sin(phase);
    phase += (2 * Math.PI * (from + sweep * Math.min(n / span, 1))) / rate;
  }
}

/**
 * Ends a held tone: everything past `holdMs` after the press fades with the
 * gate's time constant. A resonator with a three-second T60 is flat over 80ms,
 * which is the sustain; this is what stops it.
 */
function releaseGate(out: Float32Array, onset: number, gate: Gate, rate: number): void {
  const hold = onset + Math.floor((gate.holdMs * rate) / 1_000);
  const tau = (gate.releaseMs * rate) / 1_000;
  for (let n = hold; n < out.length; n++) {
    out[n] = (out[n] ?? 0) * Math.exp(-(n - hold) / tau);
  }
}

function normalise(out: Float32Array): void {
  let peak = 0;
  for (const sample of out) peak = Math.max(peak, Math.abs(sample));
  if (peak <= 0) return;
  const scale = TARGET_PEAK / peak;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) * scale;
}

/**
 * Cuts the silent tail, but never into the onset.
 *
 * `slice`, not `subarray`: a view would keep the whole 300ms buffer alive
 * behind every voice, and a bank holds sixty of them. Most voices are a third
 * of the cap, so the copy is what makes the bank the size the comment on
 * `Bank` claims.
 */
function cutTail(out: Float32Array, onset: number): Float32Array {
  let last = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    if (Math.abs(out[i] ?? 0) >= TRIM_FLOOR) {
      last = i;
      break;
    }
  }
  return out.slice(0, Math.max(last, onset) + 1);
}
