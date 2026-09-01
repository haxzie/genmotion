import { env } from "../env";

/**
 * Google "Nano Banana" image generation, over the raw Gemini REST API.
 *
 * Lifted from the hosted editor's `generateImage` tool
 * (packages/ai/src/image-tools.ts) minus everything after the bytes come back:
 * that tool put the result in S3 and wrote an `assets` row, which is hosted
 * plumbing. Here the caller is the desktop app, where a project is a folder on
 * the user's disk, so it writes the file itself and this only has to produce
 * the bytes.
 *
 * No SDK: the response is one JSON object with the image inline as base64, and
 * pulling in a client for a single POST would not earn its dependency.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 60_000;

/** Ceiling on what we will hand back, matching the desktop asset cap. */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  promptFeedback?: { blockReason?: string };
}

export interface GeneratedMedia {
  bytes: Buffer;
  mime: string;
}

/**
 * Thrown for anything the caller should report rather than retry. `status` is
 * what the route answers with, so a refused prompt reads as a bad request and a
 * provider outage does not.
 */
export class PluginProviderError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
  ) {
    super(message);
    this.name = "PluginProviderError";
  }
}

export function geminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export async function generateImage(prompt: string): Promise<GeneratedMedia> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new PluginProviderError("Image generation is not configured on this server.", 503);
  }

  const res = await fetch(`${ENDPOINT}/${env.GEMINI_IMAGE_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new PluginProviderError(`Gemini returned ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const image = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!image?.data) {
    // A refusal comes back as a 200 with prose instead of an image, so the
    // reason has to be dug out of the response rather than the status. It is
    // the prompt that needs changing, which makes this a 400.
    const reason = data.promptFeedback?.blockReason ?? parts.find((p) => p.text)?.text?.slice(0, 200);
    throw new PluginProviderError(`No image was returned${reason ? `: ${reason}` : "."}`, 400);
  }

  const bytes = Buffer.from(image.data, "base64");
  if (bytes.byteLength === 0) throw new PluginProviderError("The generated image was empty.");
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new PluginProviderError(
      `The generated image is ${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB, over the 25MB limit.`,
    );
  }

  return { bytes, mime: (image.mimeType ?? "image/png").toLowerCase() };
}
