import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envStub = vi.hoisted(() => ({
  ELEVENLABS_API_KEY: "test-key",
  ELEVENLABS_VOICE_ID: "default-voice",
  ELEVENLABS_MODEL: "eleven_v4",
}));
vi.mock("../env", () => ({ env: envStub }));

import {
  generateVoiceover,
  isDialogueModel,
  splitForDialogue,
} from "../plugins/elevenlabs-voice";

/**
 * Model routing and script splitting for ElevenLabs.
 *
 * No network and no database: what is under test is the two decisions made
 * before a request is built. Getting the endpoint wrong is a 422 on every
 * voiceover, and getting the split wrong is audio that stops mid-sentence —
 * which the dialogue endpoint does quietly, by returning a short file rather
 * than an error.
 */

describe("isDialogueModel", () => {
  it("routes the v4 family to the dialogue endpoint", () => {
    expect(isDialogueModel("eleven_v4")).toBe(true);
    expect(isDialogueModel("eleven_v4_turbo")).toBe(true);
  });

  it("leaves every other model on text-to-speech", () => {
    for (const model of ["eleven_multilingual_v2", "eleven_v3", "eleven_flash_v2_5"]) {
      expect(isDialogueModel(model)).toBe(false);
    }
  });
});

describe("splitForDialogue", () => {
  it("leaves a script that already fits as one piece", () => {
    const text = "A short line of narration.";
    expect(splitForDialogue(text)).toEqual([text]);
  });

  it("never exceeds the limit", () => {
    const text = "This is a sentence of about forty characters. ".repeat(120);
    for (const chunk of splitForDialogue(text)) {
      expect(chunk.length).toBeLessThanOrEqual(2000);
    }
  });

  it("keeps every character of the script, in order", () => {
    const text = "One. Two! Three? Four… Five. ".repeat(100);
    const rejoined = splitForDialogue(text).join(" ").replace(/\s+/g, " ").trim();
    expect(rejoined).toBe(text.replace(/\s+/g, " ").trim());
  });

  it("breaks at sentence ends, so a seam lands on a pause", () => {
    const sentence = `${"word ".repeat(80)}end. `;
    const chunks = splitForDialogue(sentence.repeat(10));
    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk but the last should finish a sentence.
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.endsWith("end.")).toBe(true);
    }
  });

  it("still splits a single sentence longer than one whole request", () => {
    // No sentence boundary to use at all — it must fall back to words.
    const chunks = splitForDialogue("word ".repeat(1000));
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(2000);
      expect(chunk).not.toMatch(/\bwor$|\bwo$/); // not cut mid-word
    }
  });

  it("handles a single unbroken token longer than the limit", () => {
    // Pathological, but it must terminate rather than loop or overflow.
    const chunks = splitForDialogue("x".repeat(5000));
    expect(chunks.length).toBe(3);
    expect(chunks.every((c) => c.length <= 2000)).toBe(true);
    expect(chunks.join("")).toBe("x".repeat(5000));
  });
});

describe("generateVoiceover request shape", () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];

  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "request-id": `req-${calls.length}`, "character-cost": "10" },
      });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    envStub.ELEVENLABS_MODEL = "eleven_v4";
  });

  it("sends v4 to text-to-dialogue, with the voice in the body not the path", async () => {
    await generateVoiceover("Hello there.", "voice-abc");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain("/v1/text-to-dialogue/convert");
    expect(calls[0]!.url).toContain("output_format=mp3_44100_128");
    expect(calls[0]!.body).toMatchObject({
      inputs: [{ text: "Hello there.", voice_id: "voice-abc" }],
      model_id: "eleven_v4",
    });
  });

  it("sends every other model to text-to-speech, unchanged", async () => {
    envStub.ELEVENLABS_MODEL = "eleven_multilingual_v2";
    await generateVoiceover("Hello there.", "voice-abc");
    expect(calls[0]!.url).toContain("/v1/text-to-speech/voice-abc");
    expect(calls[0]!.body).toEqual({
      text: "Hello there.",
      model_id: "eleven_multilingual_v2",
    });
  });

  it("splits a long script and carries continuity between the pieces", async () => {
    const script = `${"word ".repeat(80)}end. `.repeat(10);
    const result = await generateVoiceover(script, "voice-abc");

    expect(calls.length).toBeGreaterThan(1);
    // The first has nothing before it; the rest are told what came before.
    expect(calls[0]!.body.previous_request_ids).toBeUndefined();
    expect(calls[1]!.body.previous_request_ids).toEqual(["req-1"]);
    expect(calls[1]!.body.previous_text).toBeTruthy();
    // At most three, nearest last.
    for (const call of calls) {
      const ids = call.body.previous_request_ids as string[] | undefined;
      if (ids) expect(ids.length).toBeLessThanOrEqual(3);
    }
    // One file out, and the cost is the sum of what each piece was charged.
    expect(result.bytes.byteLength).toBe(3 * calls.length);
    expect(result.usage).toEqual({ units: 10 * calls.length, unit: "characters" });
  });

  it("does not split for a model served by text-to-speech", async () => {
    envStub.ELEVENLABS_MODEL = "eleven_multilingual_v2";
    await generateVoiceover(`${"word ".repeat(80)}end. `.repeat(10), "voice-abc");
    expect(calls).toHaveLength(1);
  });
});
