import { tool } from "ai";
import { z } from "zod";
import { eq, db, schema } from "@genmotion/db";
import { projectFileKey, putObject } from "@genmotion/storage";

/**
 * Google "Nano Banana" image generation via the Gemini API. Model id is
 * overridable with GEMINI_IMAGE_MODEL; auth reads GEMINI_API_KEY. The generated
 * image (returned inline as base64) is saved into the project's own storage,
 * exactly like saveImageToProject, so scenes reference a stable project URL.
 */
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25MB
const TIMEOUT_MS = 60_000;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  promptFeedback?: { blockReason?: string };
}

export interface ImageToolsContext {
  projectId: string;
  userId: string;
  /** Called after the asset is saved so the UI/asset list can refresh. */
  onMutation?: () => void;
}

export function createImageTools({
  projectId,
  userId,
  onMutation,
}: ImageToolsContext) {
  return {
    generateImage: tool({
      description:
        "Generate a bespoke image from a text prompt using Google's Nano Banana model and save it into THIS project's assets, returning a stable project `url` you can use in <Img> and in scene briefs. Great for illustrations, backgrounds, textures, patterns, product shots, or icons a scene needs. Write a precise prompt: subject, art style, composition, color palette, lighting, and background (specify a solid color or a transparent/plain background when the image will be composited into a scene). One image per call.",
      inputSchema: z.object({
        prompt: z
          .string()
          .min(3)
          .max(2000)
          .describe("Detailed description of the image to generate"),
        filename: z
          .string()
          .max(120)
          .optional()
          .describe("Optional name for the saved file, e.g. 'hero-bg.png'"),
      }),
      execute: async ({ prompt, filename }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return {
            ok: false as const,
            error:
              "Image generation isn't configured (GEMINI_API_KEY is not set).",
          };
        }

        try {
          const res = await fetch(
            `${GEMINI_ENDPOINT}/${GEMINI_IMAGE_MODEL}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
              }),
              signal: AbortSignal.timeout(TIMEOUT_MS),
            },
          );

          if (!res.ok) {
            const detail = await res.text().catch(() => "");
            return {
              ok: false as const,
              error: `Image API error (${res.status}): ${detail.slice(0, 300)}`,
            };
          }

          const data = (await res.json()) as GeminiResponse;
          const parts = data.candidates?.[0]?.content?.parts ?? [];
          const image = parts.find((p) => p.inlineData?.data)?.inlineData;
          if (!image?.data) {
            const reason =
              data.promptFeedback?.blockReason ??
              parts.find((p) => p.text)?.text?.slice(0, 200);
            return {
              ok: false as const,
              error: `No image was returned${reason ? `: ${reason}` : "."}`,
            };
          }

          const mime = (image.mimeType ?? "image/png").toLowerCase();
          const buffer = Buffer.from(image.data, "base64");
          if (buffer.byteLength === 0) {
            return { ok: false as const, error: "Generated image was empty." };
          }
          if (buffer.byteLength > MAX_IMAGE_BYTES) {
            return {
              ok: false as const,
              error: `Generated image is too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB).`,
            };
          }

          const ext = EXT_BY_MIME[mime] ?? "png";
          const base = filename
            ? safe(filename).replace(/\.[a-zA-Z0-9]+$/, "")
            : `generated-${crypto.randomUUID().slice(0, 8)}`;
          const name = `${base}.${ext}`;
          const key = projectFileKey(projectId, name);
          const savedUrl = await putObject(key, buffer, mime);

          // Register (or refresh) the asset row so it shows in the picker and
          // scenes can reference it. Dedupe by storage key.
          const [existing] = await db
            .select({ id: schema.assets.id })
            .from(schema.assets)
            .where(eq(schema.assets.storageKey, key));
          if (existing) {
            await db
              .update(schema.assets)
              .set({ url: savedUrl, sizeBytes: buffer.byteLength, status: "ready" })
              .where(eq(schema.assets.id, existing.id));
          } else {
            await db.insert(schema.assets).values({
              userId,
              projectId,
              storageKey: key,
              url: savedUrl,
              kind: "image",
              filename: name,
              mimeType: mime,
              sizeBytes: buffer.byteLength,
              status: "ready",
            });
          }

          onMutation?.();
          return { ok: true as const, url: savedUrl, filename: name };
        } catch (err) {
          return {
            ok: false as const,
            error: `Failed to generate image: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      },
    }),
  };
}
