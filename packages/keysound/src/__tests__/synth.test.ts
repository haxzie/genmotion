import { describe, expect, it } from "vitest";
import { SAMPLE_RATE, VARIANTS, clickBank, keyBank, voiceOf } from "../bank";
import { CLICKS, KEYBOARDS, KEY_KINDS, findClick, findKeyboard } from "../profiles";
import { MAX_MS, ONSET_MS, renderVoice, type Voice } from "../synth";
import { Rng } from "../rng";

const voice = (id: string, kind: Parameters<typeof renderVoice>[1] = "letter"): Voice => {
  const profile = findKeyboard(id) ?? findClick(id);
  if (!profile) throw new Error(`no profile ${id}`);
  return renderVoice(profile.table, kind, new Rng(`${id}/0/0`).nextU64(), SAMPLE_RATE);
};

/**
 * Spectral centroid, in Hz, of the 40ms from the onset — where the energy sits,
 * which is what "bright" and "dark" mean. A naive DFT on a 50Hz grid under a
 * Hann window: the window keeps a 150Hz mode from leaking its energy into bins
 * that would pull the centroid up.
 */
function brightness(v: Voice): number {
  const window = (SAMPLE_RATE * 40) / 1_000;
  const slice = v.samples.subarray(v.onset, Math.min(v.onset + window, v.samples.length));
  let weighted = 0;
  let total = 0;
  for (let bin = 1; bin <= 240; bin++) {
    const hz = bin * 50;
    const omega = (2 * Math.PI * hz) / SAMPLE_RATE;
    let real = 0;
    let imag = 0;
    for (let n = 0; n < slice.length; n++) {
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / slice.length);
      const sample = (slice[n] ?? 0) * hann;
      real += sample * Math.cos(omega * n);
      imag -= sample * Math.sin(omega * n);
    }
    const power = real * real + imag * imag;
    weighted += hz * power;
    total += power;
  }
  return total > 0 ? weighted / total : 0;
}

function peak(v: Voice): number {
  let max = 0;
  for (const sample of v.samples) max = Math.max(max, Math.abs(sample));
  return max;
}

describe("renderVoice", () => {
  it("is a pure function of its seed", () => {
    expect(voice("thock").samples).toEqual(voice("thock").samples);
    expect(voice("thock").samples).not.toEqual(voice("linear").samples);
  });

  it("puts the press where it says and never outlives the cap", () => {
    const cap = Math.round((SAMPLE_RATE * MAX_MS) / 1_000);
    for (const profile of [...KEYBOARDS, ...CLICKS]) {
      const v = voice(profile.id);
      expect(v.onset).toBe(Math.round((SAMPLE_RATE * ONSET_MS) / 1_000));
      expect(v.samples.length).toBeLessThanOrEqual(cap);
      expect(v.samples.length).toBeGreaterThan(v.onset);
    }
  });

  it("leaves headroom on every voice", () => {
    // -6dBFS, so the scheduler's +4.5dB on a long key still cannot clip.
    for (const profile of [...KEYBOARDS, ...CLICKS]) {
      expect(peak(voice(profile.id))).toBeLessThanOrEqual(0.52);
      expect(peak(voice(profile.id))).toBeGreaterThan(0.1);
    }
  });

  /** The orderings the tables exist to produce. Tuning may move numbers; not these. */
  it("keeps thock darker than linear and linear darker than clicky", () => {
    const thock = brightness(voice("thock"));
    const linear = brightness(voice("linear"));
    const clicky = brightness(voice("clicky"));
    expect(thock).toBeLessThan(linear);
    expect(linear).toBeLessThan(clicky);
  });

  it("keeps a space bar deeper than a letter", () => {
    for (const id of ["linear", "tactile", "clicky", "thock"]) {
      expect(brightness(voice(id, "space"))).toBeLessThan(brightness(voice(id, "letter")));
    }
  });

  it("spreads the clicks from a low knock to a steel tink", () => {
    const measured = CLICKS.map((p) => ({ id: p.id, hz: brightness(voice(p.id, "click")) }));
    const ordered = measured.map((m) => m.id).filter((id) => id !== "pop" && id !== "quack");
    ordered.sort((a, b) => (measured.find((m) => m.id === a)?.hz ?? 0) - (measured.find((m) => m.id === b)?.hz ?? 0));
    // Wood's 300Hz fundamental is the lowest body here and hush is next: those
    // two are the ones that stay out of a voice's way. Steel is the brightest.
    expect(ordered.slice(0, 2).sort()).toEqual(["hush", "walnut"]);
    expect(ordered[ordered.length - 1]).toBe("tink");
    // And the menu is a spread, not ten names for one sound.
    const low = measured.find((m) => m.id === "walnut")?.hz ?? 0;
    const high = measured.find((m) => m.id === "tink")?.hz ?? 0;
    expect(high / Math.max(low, 1)).toBeGreaterThan(4);
  });

  it("ends every voice quietly enough not to click", () => {
    for (const profile of [...KEYBOARDS, ...CLICKS]) {
      const v = voice(profile.id, profile.table.mechanism === "mouse" ? "click" : "letter");
      const tail = v.samples.subarray(v.samples.length - 1);
      expect(Math.abs(tail[0] ?? 0)).toBeLessThan(1e-3);
    }
  });
});

describe("bank", () => {
  it("holds every variant of every kind it claims", () => {
    const keys = keyBank("thock", KEYBOARDS[0]!.table);
    for (const kind of KEY_KINDS) {
      for (let variant = 0; variant < VARIANTS; variant++) {
        expect(voiceOf(keys, kind, variant)).toBeDefined();
      }
      expect(voiceOf(keys, kind, VARIANTS)).toBeUndefined();
    }
    expect(voiceOf(keys, "click", 0)).toBeUndefined();

    const clicks = clickBank("soft", CLICKS[0]!.table);
    expect(voiceOf(clicks, "click", 0)).toBeDefined();
    expect(voiceOf(clicks, "letter", 0)).toBeUndefined();
  });

  it("renders the same bank twice", () => {
    const a = keyBank("linear", findKeyboard("linear")!.table);
    const b = keyBank("linear", findKeyboard("linear")!.table);
    expect(a.voices.map((v) => Array.from(v))).toEqual(b.voices.map((v) => Array.from(v)));
  });
});
