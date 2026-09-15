import { env } from "../env";
import { PluginProviderError, type GeneratedMedia } from "./gemini-image";
import { characterCost } from "./elevenlabs-voice";

/**
 * ElevenLabs sound generation: a description in, a sound effect out.
 *
 * Same shape as the voice endpoint — audio bytes rather than JSON, mp3 at
 * 44.1kHz/128kbps — so it lands on the timeline like any other clip. The
 * duration is optional: left out, the model picks one that fits the sound
 * (a click is short, rain can run), which is usually better than a guess.
 */
const ENDPOINT = "https://api.elevenlabs.io/v1/sound-generation";
const OUTPUT_FORMAT = "mp3_44100_128";
const TIMEOUT_MS = 120_000;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** What the API accepts, mirrored in the route's schema. */
export const SFX_MAX_TEXT = 450;
export const SFX_MIN_SECONDS = 0.5;
export const SFX_MAX_SECONDS = 30;

export interface SfxOptions {
  /** Seconds, 0.5–30. Omitted lets the model choose. */
  durationSeconds?: number;
  /** 0–1: how literally to follow the text. Default 0.3. */
  promptInfluence?: number;
  /** Ask for a seamless loop — ambience, a drone. */
  loop?: boolean;
}

export async function generateSfx(text: string, options: SfxOptions = {}): Promise<GeneratedMedia> {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new PluginProviderError("Sound effects are not configured on this server.", 503);
  }

  const res = await fetch(`${ENDPOINT}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({
      text,
      ...(options.durationSeconds !== undefined ? { duration_seconds: options.durationSeconds } : {}),
      ...(options.promptInfluence !== undefined ? { prompt_influence: options.promptInfluence } : {}),
      ...(options.loop ? { loop: true } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // A rejected prompt is the caller's to fix; anything else is the provider's.
    const status = res.status === 400 || res.status === 422 ? 400 : 502;
    throw new PluginProviderError(`ElevenLabs returned ${res.status}: ${detail.slice(0, 300)}`, status);
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength === 0) throw new PluginProviderError("The generated audio was empty.");
  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    throw new PluginProviderError(
      `The generated audio is ${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB, over the 25MB limit.`,
    );
  }

  // The rate card: a generation with the length left to the model is 100
  // characters; a fixed length is 40 a second. Used only when the response
  // does not say.
  const estimate = options.durationSeconds !== undefined ? Math.ceil(options.durationSeconds * 40) : 100;
  return { bytes, mime: "audio/mpeg", usage: { units: characterCost(res, estimate), unit: "characters" } };
}
