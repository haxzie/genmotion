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

  return { bytes, mime: "audio/mpeg" };
}
