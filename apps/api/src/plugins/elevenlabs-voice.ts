import { getObjectBuffer, putObject } from "@genmotion/storage";
import { env } from "../env";
import { PluginProviderError, type GeneratedMedia } from "./gemini-image";

/**
 * ElevenLabs text-to-speech.
 *
 * The endpoint answers with the audio itself rather than JSON, so there is no
 * envelope to unwrap — only an error body to read when the status is not 2xx.
 * mp3 at 44.1kHz/128kbps is the format the timeline and the ffmpeg mux already
 * expect from every other audio asset.
 */

const ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";
const OUTPUT_FORMAT = "mp3_44100_128";
const TIMEOUT_MS = 120_000;

/** Matches the desktop asset cap; a 2,000-character script lands far below it. */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export function elevenLabsConfigured(): boolean {
  return Boolean(env.ELEVENLABS_API_KEY);
}

export async function generateVoiceover(
  text: string,
  voiceId?: string,
): Promise<GeneratedMedia> {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new PluginProviderError("Voiceover is not configured on this server.", 503);
  }

  const voice = voiceId?.trim() || env.ELEVENLABS_VOICE_ID;
  const res = await fetch(`${ENDPOINT}/${encodeURIComponent(voice)}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // An unknown voice id is the caller's mistake, not an outage — the agent
    // can correct it on the next call if it is told which kind of failure it was.
    const status = res.status === 404 || res.status === 422 ? 400 : 502;
    throw new PluginProviderError(
      `ElevenLabs returned ${res.status}: ${detail.slice(0, 300)}`,
      status,
    );
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength === 0) throw new PluginProviderError("The generated audio was empty.");
  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    throw new PluginProviderError(
      `The generated audio is ${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB, over the 25MB limit.`,
    );
  }

  return { bytes, mime: "audio/mpeg", usage: { units: characterCost(res, text.length), unit: "characters" } };
}

/**
 * What ElevenLabs charged, in its own units. It says so on the response
 * (`character-cost`); when it does not, the script's length is the rate
 * card's answer for text-to-speech.
 */
export function characterCost(res: Response, fallback: number): number {
  const reported = Number(res.headers.get("character-cost"));
  return Number.isFinite(reported) && reported > 0 ? Math.round(reported) : fallback;
}

/** A voice as the picker shows it. */
export interface VoiceOption {
  id: string;
  name: string;
  /** ElevenLabs' own tags: accent, gender, age, use case — the words a user picks by. */
  labels: Record<string, string>;
  /** "premade" for the stock library; anything else the account added itself. */
  category: string;
  /** Where ElevenLabs hosts a few seconds of the voice. Public, unauthenticated. */
  previewUrl: string | null;
}

/**
 * The voices the key can use. The stock library is the same for everyone and
 * changes rarely, so one fetch an hour serves every picker.
 */
const VOICES_TTL_MS = 60 * 60 * 1000;
let voicesCache: { at: number; voices: VoiceOption[] } | null = null;

/** `fetched` says whether this call actually went to ElevenLabs, for the usage log. */
export async function listVoices(): Promise<{ voices: VoiceOption[]; fetched: boolean }> {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new PluginProviderError("Voiceover is not configured on this server.", 503);
  if (voicesCache && Date.now() - voicesCache.at < VOICES_TTL_MS) {
    return { voices: voicesCache.voices, fetched: false };
  }

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // A key scoped without "Voices: Read" can speak but not list — the fix
    // is on the ElevenLabs side, so say exactly that.
    if (res.status === 401 && /missing_permissions|voices_read/.test(detail)) {
      throw new PluginProviderError(
        "The ElevenLabs API key can't list voices — it needs the voices_read permission.",
        503,
      );
    }
    throw new PluginProviderError(`ElevenLabs returned ${res.status} listing voices.`, 502);
  }
  const body = (await res.json()) as {
    voices: { voice_id: string; name: string; category?: string; labels?: Record<string, string>; preview_url?: string }[];
  };
  const voices = body.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    labels: v.labels ?? {},
    category: v.category ?? "premade",
    previewUrl: v.preview_url ?? null,
  }));
  voicesCache = { at: Date.now(), voices };
  return { voices, fetched: true };
}

/** Previews being fetched right now, so a card that lists forty voices does not fetch one forty times. */
const previewInflight = new Map<string, Promise<Buffer>>();

/**
 * The preview clip for one voice.
 *
 * Fetched from wherever ElevenLabs keeps it once, then kept in our bucket
 * under the voice id: the stock voices' samples never change, and every
 * picker on every desktop plays the same forty clips.
 */
export async function voicePreview(voiceId: string): Promise<GeneratedMedia> {
  const usage = { units: 0, unit: "characters" as const }; // a public file, not a metered call
  const key = `voices/${voiceId}/preview.mp3`;
  const cached = await getObjectBuffer(key).catch(() => null);
  if (cached) return { bytes: cached, mime: "audio/mpeg", usage };

  const voice = (await listVoices()).voices.find((v) => v.id === voiceId);
  if (!voice?.previewUrl) throw new PluginProviderError("No preview for that voice.", 404);

  let task = previewInflight.get(key);
  if (!task) {
    task = fetch(voice.previewUrl, { signal: AbortSignal.timeout(20_000) })
      .then(async (res) => {
        if (!res.ok) throw new PluginProviderError(`The preview answered ${res.status}.`, 502);
        const bytes = Buffer.from(await res.arrayBuffer());
        // Best effort: a bucket that is down costs a refetch, not the clip.
        await putObject(key, bytes, "audio/mpeg").catch(() => {});
        return bytes;
      })
      .finally(() => previewInflight.delete(key));
    previewInflight.set(key, task);
  }
  return { bytes: await task, mime: "audio/mpeg", usage };
}
