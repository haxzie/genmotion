import { describe, expect, it } from "vitest";
import { planTyping, textAtFrame, toFrameSteps } from "../typing";
import { keyFor, neighbours } from "../layout";

const SENTENCE = "The quick brown fox jumps over the lazy dog.";

/** The gaps between consecutive keystrokes. */
function gaps(text: string, options = {}): number[] {
  const plan = planTyping(text, { typoRate: 0, ...options });
  const out: number[] = [];
  for (let i = 1; i < plan.keystrokes.length; i++) {
    out.push((plan.keystrokes[i]?.atMs ?? 0) - (plan.keystrokes[i - 1]?.atMs ?? 0));
  }
  return out;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);

/** The mean gap before each occurrence of `digraph`'s second character. */
function digraphGap(text: string, digraph: string): number {
  const plan = planTyping(text, { typoRate: 0, seed: "digraph", variation: 0.001, hesitation: 0 });
  const found: number[] = [];
  for (let i = 1; i < plan.keystrokes.length; i++) {
    const before = plan.keystrokes[i - 1];
    const now = plan.keystrokes[i];
    if (!before || !now || !before.char || !now.char) continue;
    if (before.char + now.char === digraph) found.push(now.atMs - before.atMs);
  }
  if (found.length === 0) throw new Error(`"${digraph}" never occurs in the plan`);
  return mean(found);
}

describe("planTyping", () => {
  it("leaves the asked-for text on screen, however it got there", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const plan = planTyping(SENTENCE, { seed, typoRate: 0.25 });
      expect(plan.keystrokes[plan.keystrokes.length - 1]?.text).toBe(SENTENCE);
      expect(plan.mistakes).toBeGreaterThan(0);
      // A correction's intermediate text is not a prefix of the final text,
      // which is what makes the slip visible.
      expect(plan.keystrokes.some((k) => !SENTENCE.startsWith(k.text))).toBe(true);
    }
  });

  it("is the same plan every time, and a different one per seed", () => {
    expect(planTyping(SENTENCE, { seed: "x" })).toEqual(planTyping(SENTENCE, { seed: "x" }));
    expect(planTyping(SENTENCE, { seed: "x" }).keystrokes).not.toEqual(
      planTyping(SENTENCE, { seed: "y" }).keystrokes,
    );
  });

  it("never goes backwards and never types two keys at once", () => {
    const plan = planTyping("Hello, World!\nSecond line here.", { typoRate: 0.2, seed: "order" });
    for (let i = 1; i < plan.keystrokes.length; i++) {
      expect(plan.keystrokes[i]!.atMs).toBeGreaterThanOrEqual(plan.keystrokes[i - 1]!.atMs);
    }
  });

  it("lands on the asked-for words per minute, for prose", () => {
    const PROSE =
      "Every open project has its own session in the registry, and every route names the project it belongs to. ";
    for (const wpm of [40, 62, 90]) {
      const plan = planTyping(PROSE.repeat(3), { wpm, typoRate: 0, seed: "wpm" });
      // The clamps bite a little at the fast end, so this is a tolerance rather
      // than an identity — but a tight one, or the number means nothing.
      expect(plan.effectiveWpm).toBeGreaterThan(wpm * 0.9);
      expect(plan.effectiveWpm).toBeLessThan(wpm * 1.1);
    }
  });

  /**
   * And the calibration is deliberately one constant, not a per-text
   * normalisation: a shell command really is slower to type than a sentence,
   * and an agent sizing a scene for one needs to be told so.
   */
  it("types code and shell commands slower than prose", () => {
    const rate = (text: string) =>
      planTyping(text.repeat(4), { wpm: 62, typoRate: 0, seed: "code" }).effectiveWpm;
    const prose = rate("the system writes every change to the log before it answers. ");
    expect(rate("const total = items.reduce((sum, item) => sum + item.price, 0); ")).toBeLessThan(prose);
    expect(rate("npm install && npm run dev -- --port 4100 ")).toBeLessThan(prose);
  });

  /**
   * The orderings that make it typing rather than jitter. These are the
   * well-established ones from keystroke dynamics, and the ones a listener
   * notices immediately when they are wrong.
   */
  it("costs a digraph by the hands and fingers that type it", () => {
    const sameKey = digraphGap("llll oooo", "ll");
    const alternate = digraphGap("the then them", "th");
    const sameHand = digraphGap("were wert wer", "we");
    const sameFinger = digraphGap("brbr brbr brb", "br");

    // A doubled letter is the fastest digraph there is: one finger, already in
    // place, tapping twice.
    expect(sameKey).toBeLessThan(alternate);
    // Hands alternating beats one hand doing both.
    expect(alternate).toBeLessThan(sameHand);
    // And one finger moving to a different key is the slowest by a wide margin.
    expect(sameHand).toBeLessThan(sameFinger);
    expect(sameFinger / alternate).toBeGreaterThan(1.5);
  });

  it("pauses longer after a full stop than after a comma", () => {
    const after = (text: string, char: string) => {
      const plan = planTyping(text, { typoRate: 0, variation: 0.001, seed: "pause", hesitation: 1 });
      const found: number[] = [];
      for (let i = 1; i < plan.keystrokes.length; i++) {
        if (plan.keystrokes[i - 1]?.char === char) {
          found.push(plan.keystrokes[i]!.atMs - plan.keystrokes[i - 1]!.atMs);
        }
      }
      return mean(found);
    };
    const comma = after("one, two, three, four, five, six, ok", ",");
    const stop = after("one. two. three. four. five. six. ok", ".");
    const plain = after("onx two xthree xfour xfive xsix", "x");
    expect(plain).toBeLessThan(comma);
    expect(comma).toBeLessThan(stop);
  });

  it("holds Shift across a run of capitals instead of tapping it per letter", () => {
    const plan = planTyping("ABCDEFGH", { typoRate: 0, seed: "shift" });
    const shifts = plan.keystrokes.filter((k) => k.kind === "modifier");
    expect(shifts).toHaveLength(1);
    // And it goes down before the letter it modifies.
    const letter = plan.keystrokes.find((k) => k.char === "A");
    expect(shifts[0]!.atMs).toBeLessThan(letter!.atMs);
  });

  it("presses Shift once per capital in mixed case", () => {
    const plan = planTyping("Aa Bb Cc", { typoRate: 0, seed: "shift" });
    expect(plan.keystrokes.filter((k) => k.kind === "modifier")).toHaveLength(3);
  });

  it("classes a space and a newline as their own keys", () => {
    const plan = planTyping("a b\nc", { typoRate: 0, seed: "class" });
    expect(plan.keystrokes.map((k) => k.kind)).toEqual([
      "letter",
      "space",
      "letter",
      "enter",
      "letter",
    ]);
  });

  /**
   * The thing that separates this from "add some jitter": the tempo wanders, so
   * fast keys cluster with fast keys. Independent noise would leave consecutive
   * gaps uncorrelated, and the result sounds shuffled rather than human.
   */
  it("drifts its tempo rather than drawing each gap independently", () => {
    // Every digraph here is the same one ("aj", left pinky to right index), so
    // the deterministic cost is constant and what is left is the tempo and the
    // noise. A model that drew each gap independently would score about zero.
    const sample = gaps("aj".repeat(400), { hesitation: 0, seed: "drift" });
    const average = mean(sample);
    const deviations = sample.map((gap) => gap - average);
    let covariance = 0;
    for (let i = 1; i < deviations.length; i++) covariance += deviations[i]! * deviations[i - 1]!;
    const variance = deviations.reduce((a, b) => a + b * b, 0);
    expect(covariance / variance).toBeGreaterThan(0.1);
  });

  it("spreads its gaps the way real typing does, not uniformly", () => {
    const sample = gaps(SENTENCE.repeat(6), { seed: "spread" });
    const average = mean(sample);
    const sorted = [...sample].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    // Right-skewed: the long tail is on the slow side only, so the mean sits
    // above the median.
    expect(average).toBeGreaterThan(median);
    expect(Math.max(...sample) / Math.min(...sample)).toBeGreaterThan(3);
  });

  it("types straight through when asked to", () => {
    const plan = planTyping(SENTENCE, { typoRate: 0, hesitation: 0, variation: 0, seed: "flat" });
    expect(plan.mistakes).toBe(0);
    const sample: number[] = [];
    for (let i = 1; i < plan.keystrokes.length; i++) {
      sample.push(plan.keystrokes[i]!.atMs - plan.keystrokes[i - 1]!.atMs);
    }
    // With no noise left, the only variation is the digraph cost — which is
    // still there, because the keyboard has not changed shape.
    expect(new Set(sample).size).toBeGreaterThan(5);
  });

  it("corrects a slip with a notice, backspaces and a retype", () => {
    const plan = planTyping(SENTENCE, { typoRate: 1, seed: "slip" });
    const backspaces = plan.keystrokes.filter((k) => k.kind === "backspace");
    expect(backspaces.length).toBeGreaterThan(0);
    // The pause before the first backspace is longer than an ordinary gap: the
    // eye has to catch up before the hand reacts.
    const first = plan.keystrokes.findIndex((k) => k.kind === "backspace");
    const notice = plan.keystrokes[first]!.atMs - plan.keystrokes[first - 1]!.atMs;
    expect(notice).toBeGreaterThan(150);
    // And the backspaces of one correction run fast and evenly after it.
    const run = plan.keystrokes.slice(first);
    const contiguous = run.slice(0, run.findIndex((k) => k.kind !== "backspace"));
    if (contiguous.length > 1) {
      expect(contiguous[1]!.atMs - contiguous[0]!.atMs).toBeLessThan(notice);
    }
  });

  it("fits a fixed length while keeping the rhythm's shape", () => {
    const free = planTyping(SENTENCE, { typoRate: 0, seed: "fit" });
    const fitted = planTyping(SENTENCE, { typoRate: 0, seed: "fit", fitMs: 6_000 });
    expect(fitted.durationMs).toBe(6_000);
    // One linear scale: every gap moved by the same factor.
    const ratio =
      (fitted.keystrokes[5]!.atMs || 1) / (free.keystrokes[5]!.atMs || 1);
    const later = (fitted.keystrokes[20]!.atMs || 1) / (free.keystrokes[20]!.atMs || 1);
    expect(Math.abs(ratio - later)).toBeLessThan(0.05);
  });

  it("refuses to stretch or squeeze a plan past what reads as typing", () => {
    // 30 seconds for nine characters would be a key every three seconds.
    const slow = planTyping("short one", { typoRate: 0, seed: "fit", fitMs: 30_000 });
    expect(slow.durationMs).toBeLessThan(30_000);
    // And 300ms for a whole sentence would be 1,700 words a minute.
    const fast = planTyping(SENTENCE, { typoRate: 0, seed: "fit", fitMs: 300 });
    expect(fast.durationMs).toBeGreaterThan(300);
  });

  it("handles a string with nothing on the keyboard in it", () => {
    const plan = planTyping("héllo — ok", { typoRate: 0, seed: "unicode" });
    expect(plan.keystrokes[plan.keystrokes.length - 1]?.text).toBe("héllo — ok");
    expect(plan.durationMs).toBeGreaterThan(0);
  });

  it("plans nothing for an empty string", () => {
    const plan = planTyping("", {});
    expect(plan.keystrokes).toEqual([]);
    expect(plan.events).toEqual([]);
  });
});

describe("toFrameSteps", () => {
  it("collapses keystrokes that share a frame and reads back by frame", () => {
    const plan = planTyping(SENTENCE, { typoRate: 0, seed: "frames", wpm: 120 });
    const steps = toFrameSteps(plan, 30);
    expect(steps.length).toBeLessThanOrEqual(plan.keystrokes.length);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.frame).toBeGreaterThan(steps[i - 1]!.frame);
    }
    expect(textAtFrame(steps, -1)).toBe("");
    expect(textAtFrame(steps, 100_000)).toBe(SENTENCE);
    // A frame between two steps still reads the earlier one.
    const second = steps[1]!;
    expect(textAtFrame(steps, second.frame)).toBe(second.text);
  });

  it("leaves Shift out, which draws nothing", () => {
    const steps = toFrameSteps(planTyping("ABC", { typoRate: 0, seed: "f" }), 60);
    expect(steps.map((s) => s.text)).toEqual(["A", "AB", "ABC"]);
  });
});

describe("layout", () => {
  it("knows which hand and finger a key belongs to", () => {
    expect(keyFor("f")).toMatchObject({ hand: "left", finger: 0, row: 2 });
    expect(keyFor("j")).toMatchObject({ hand: "right", finger: 0, row: 2 });
    expect(keyFor("A")).toMatchObject({ hand: "left", finger: 3, shifted: true });
    expect(keyFor(" ")).toMatchObject({ finger: 4 });
    expect(keyFor("é")).toBeUndefined();
  });

  it("offers only nearby keys as a slip", () => {
    const slips = neighbours("f");
    expect(slips).toContain("g");
    expect(slips).toContain("d");
    expect(slips).toContain("r");
    expect(slips).not.toContain("p");
    expect(slips).not.toContain("F");
    expect(neighbours(" ")).toEqual([]);
  });
});
