import { describe, expect, it } from "vitest";
import {
  CLICKS,
  KEYBOARDS,
  UnknownProfileError,
  listProfiles,
  renderClicks,
  renderDemo,
  renderTyping,
} from "../index";

/** Reads the samples back out of a WAV, so the test checks the file, not the mix. */
function decode(wav: Uint8Array): { sampleRate: number; frames: number; peak: number } {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  expect(String.fromCharCode(...wav.subarray(0, 4))).toBe("RIFF");
  expect(String.fromCharCode(...wav.subarray(8, 12))).toBe("WAVE");
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const dataBytes = view.getUint32(40, true);
  const frames = dataBytes / (channels * 2);
  let peak = 0;
  for (let i = 0; i < dataBytes / 2; i++) {
    peak = Math.max(peak, Math.abs(view.getInt16(44 + i * 2, true)) / 0x8000);
  }
  return { sampleRate, frames, peak };
}

describe("renderTyping", () => {
  it("writes a 48kHz stereo WAV as long as the plan says", () => {
    const render = renderTyping("hello world", { seed: "wav", typoRate: 0 });
    const { sampleRate, frames, peak } = decode(render.wav);
    expect(sampleRate).toBe(48_000);
    expect(frames).toBe(Math.round((render.durationMs / 1_000) * 48_000));
    // Loud enough to hear, and never at the ceiling.
    expect(peak).toBeGreaterThan(0.2);
    expect(peak).toBeLessThanOrEqual(0.9);
  });

  it("is byte-identical on a re-render", () => {
    const once = renderTyping("npm run build", { seed: "same", profile: "linear" });
    const twice = renderTyping("npm run build", { seed: "same", profile: "linear" });
    expect(Array.from(once.wav)).toEqual(Array.from(twice.wav));
  });

  it("makes a different file for every keyboard", () => {
    const made = KEYBOARDS.map((p) => renderTyping("abc def", { profile: p.id, seed: "k", typoRate: 0 }));
    // The plan is the same for every keyboard — a different board is a
    // different bank under the same cues — so the files are the same length and
    // must differ in their samples.
    const files = new Set(made.map((r) => r.wav.join(",")));
    expect(files.size).toBe(made.length);
    for (const render of made) expect(decode(render.wav).peak).toBeGreaterThan(0.2);
  });

  it("plans one cue per keystroke, in time order", () => {
    const render = renderTyping("The quick brown fox.", { seed: "cues", typoRate: 0 });
    expect(render.cues).toHaveLength(render.plan.keystrokes.length);
    for (let i = 1; i < render.cues.length; i++) {
      expect(render.cues[i]!.atMs).toBeGreaterThanOrEqual(render.cues[i - 1]!.atMs);
    }
    // No two consecutive cues of a kind share a variant, which is what stops a
    // run of letters sounding like a machine gun.
    const letters = render.cues.filter((c) => c.kind === "letter");
    for (let i = 1; i < letters.length; i++) {
      expect(letters[i]!.variant).not.toBe(letters[i - 1]!.variant);
    }
  });

  it("returns frame steps when asked for a frame rate", () => {
    const render = renderTyping("abc", { fps: 30, seed: "fps", typoRate: 0 });
    expect(render.steps?.at(-1)?.text).toBe("abc");
    expect(renderTyping("abc", { seed: "fps" }).steps).toBeUndefined();
  });

  it("says which keyboard it does not have", () => {
    expect(() => renderTyping("x", { profile: "ibm-model-m" })).toThrow(UnknownProfileError);
    expect(() => renderTyping("x", { profile: "ibm-model-m" })).toThrow(/Available: thock, linear/);
  });

  it("renders a sentence quickly enough to be a tool", () => {
    // Warm the bank first: the cost under test is the mix, not the synthesis,
    // and a tool call after the first pays only this.
    renderTyping("warm", { profile: "thock" });
    const started = performance.now();
    renderTyping("The quick brown fox jumps over the lazy dog.", { profile: "thock" });
    expect(performance.now() - started).toBeLessThan(250);
  });
});

describe("renderClicks", () => {
  it("places a click at each moment and rings out past the last", () => {
    const render = renderClicks([0, 500, 1_200], { seed: "clicks" });
    expect(render.cues).toHaveLength(3);
    expect(render.durationMs).toBeGreaterThan(1_200);
    const { frames, peak } = decode(render.wav);
    expect(frames).toBe(Math.round((render.durationMs / 1_000) * 48_000));
    expect(peak).toBeGreaterThan(0.2);
  });

  it("merges two clicks closer together than the ear can tell apart", () => {
    expect(renderClicks([0, 5]).cues).toHaveLength(1);
    expect(renderClicks([0, 40]).cues).toHaveLength(2);
  });

  it("renders every click profile", () => {
    for (const profile of CLICKS) {
      expect(decode(renderClicks([50], { profile: profile.id }).wav).peak).toBeGreaterThan(0.2);
    }
  });

  it("writes a valid empty file rather than failing on no clicks", () => {
    expect(decode(renderClicks([]).wav).frames).toBeGreaterThan(0);
  });
});

describe("renderDemo", () => {
  it("types a phrase for a keyboard and clicks once for a mouse", () => {
    for (const profile of KEYBOARDS) {
      const demo = renderDemo(profile.id);
      expect(demo.kind).toBe("keyboard");
      // Long enough to hear a rhythm, short enough that playing it again is
      // not a wait.
      expect(demo.durationMs).toBeGreaterThan(2_000);
      expect(demo.durationMs).toBeLessThan(9_000);
      expect(decode(demo.wav).peak).toBeGreaterThan(0.2);
    }
    for (const profile of CLICKS) {
      const demo = renderDemo(profile.id);
      expect(demo.kind).toBe("click");
      expect(demo.cues).toHaveLength(1);
      expect(decode(demo.wav).peak).toBeGreaterThan(0.2);
    }
  });

  it("carries every key class, so a picker demos the whole keyboard", () => {
    const kinds = new Set(renderDemo("thock").cues.map((cue) => cue.kind));
    // Including the backspace, which only a slip produces.
    expect([...kinds].sort()).toEqual(["backspace", "enter", "letter", "modifier", "space"]);
  });

  it("is the same demo every time", () => {
    expect(Array.from(renderDemo("clicky").wav)).toEqual(Array.from(renderDemo("clicky").wav));
  });
});

describe("listProfiles", () => {
  it("marks exactly one default per kind", () => {
    const { keyboards, clicks } = listProfiles();
    expect(keyboards.filter((p) => p.isDefault).map((p) => p.id)).toEqual(["thock"]);
    expect(clicks.filter((p) => p.isDefault).map((p) => p.id)).toEqual(["soft"]);
    // Every row says something a user could choose on.
    for (const profile of [...keyboards, ...clicks]) {
      expect(profile.blurb.length).toBeGreaterThan(20);
      expect(profile.label).toBeTruthy();
    }
  });
});
