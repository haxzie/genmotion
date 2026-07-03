import { experimental_generateSpeech as generateSpeech, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { parseBuffer } from "music-metadata";
import { z } from "zod";
import { eq, db, schema } from "@genmotion/db";
import { projectFileKey, putObject } from "@genmotion/storage";

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

const TTS_MODEL = "gpt-4o-mini-tts";

export const VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
] as const;

export interface VoiceOverAudioToolContext {
  projectId: string;
  userId: string;
  onMutation?: () => void;
}

/**
 * Generate spoken narration (TTS) from a script and save it into the project's
 * assets as a reusable audio file. It's not tied to any scene — the agent places
 * it on the timeline with addAudio, layers/processes it in the workbench, or
 * reuses it wherever narration is needed.
 */
export function createVoiceOverAudioTool({
  projectId,
  userId,
  onMutation,
}: VoiceOverAudioToolContext) {
  return tool({
    description:
      "Generate a spoken voiceover (TTS) from a script and save it into the project's ASSETS, returning a stable project audio URL + duration. This is how you create narration/voice audio: pick a voice, write the script, and get back an audio asset you then place on the timeline with addAudio (or mix in the workbench). Not tied to a scene — position it in time with addAudio's startFrame. Use the SAME voice across a project. Speech runs ~2.5 words/second, so size the script to the time you need to cover.",
    inputSchema: z.object({
      text: z
        .string()
        .min(3)
        .max(2000)
        .describe(
          "The voiceover script to speak. Speech runs ~2.5 words/second — size it to how long you need the audio.",
        ),
      voice: z.enum(VOICES).optional().describe("Voice (default: nova)"),
      instructions: z
        .string()
        .max(300)
        .optional()
        .describe(
          'Plain-language delivery direction, e.g. "warm, confident product narrator, measured pace"',
        ),
      filename: z
        .string()
        .max(120)
        .optional()
        .describe("Optional name for the saved asset, e.g. 'intro-narration.mp3'"),
    }),
    execute: async ({ text, voice = "nova", instructions, filename }) => {
      if (!process.env.OPENAI_API_KEY) {
        return {
          ok: false as const,
          error:
            "Voiceover is not configured (OPENAI_API_KEY is missing). Tell the user to add it to .env to enable narration, and continue without audio.",
        };
      }

      try {
        const { audio } = await generateSpeech({
          model: openai.speech(TTS_MODEL),
          text,
          voice,
          outputFormat: "mp3",
          ...(instructions && {
            providerOptions: { openai: { instructions } },
          }),
        });

        const buffer = Buffer.from(audio.uint8Array);
        const metadata = await parseBuffer(buffer, "audio/mpeg").catch(() => null);
        const durationSeconds = metadata?.format.duration ?? null;

        const base = filename
          ? safe(filename).replace(/\.[a-zA-Z0-9]+$/, "")
          : `narration-${crypto.randomUUID().slice(0, 8)}`;
        const name = `${base}.mp3`;
        const key = projectFileKey(projectId, name);
        const url = await putObject(key, buffer, "audio/mpeg");

        // Dedupe on the storage key so re-running with the same filename updates
        // the asset in place rather than orphaning the old row.
        const [existing] = await db
          .select({ id: schema.assets.id })
          .from(schema.assets)
          .where(eq(schema.assets.storageKey, key));
        if (existing) {
          await db
            .update(schema.assets)
            .set({
              url,
              sizeBytes: buffer.byteLength,
              durationSeconds,
              status: "ready",
            })
            .where(eq(schema.assets.id, existing.id));
        } else {
          await db.insert(schema.assets).values({
            userId,
            projectId,
            storageKey: key,
            url,
            kind: "audio",
            filename: name,
            mimeType: "audio/mpeg",
            sizeBytes: buffer.byteLength,
            durationSeconds,
            status: "ready",
          });
        }

        onMutation?.();
        return {
          ok: true as const,
          url,
          filename: name,
          durationSeconds,
          voice,
        };
      } catch (err) {
        return {
          ok: false as const,
          error: `Voiceover generation failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  });
}
