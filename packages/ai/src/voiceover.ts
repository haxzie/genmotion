import { experimental_generateSpeech as generateSpeech, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { parseBuffer } from "music-metadata";
import { z } from "zod";
import { and, eq, db, schema } from "@genmotion/db";
import { putObject } from "@genmotion/storage";

const TTS_MODEL = "gpt-4o-mini-tts";

export interface NarrationBeat {
  sentence: string;
  startSeconds: number;
  startFrame: number;
}

/**
 * Estimate when each sentence of the script is spoken by allocating the
 * measured audio duration proportionally to word counts. Not word-perfect,
 * but accurate enough to anchor <Sequence> phases to narration beats.
 */
export function estimateBeats(
  script: string,
  durationSeconds: number,
  fps: number,
): NarrationBeat[] {
  const sentences = script
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [];

  const wordCounts = sentences.map(
    (s) => s.split(/\s+/).filter(Boolean).length,
  );
  const totalWords = wordCounts.reduce((a, b) => a + b, 0) || 1;

  const beats: NarrationBeat[] = [];
  let elapsedWords = 0;
  for (let i = 0; i < sentences.length; i++) {
    const startSeconds = (elapsedWords / totalWords) * durationSeconds;
    beats.push({
      sentence: sentences[i]!,
      startSeconds: Number(startSeconds.toFixed(2)),
      startFrame: Math.round(startSeconds * fps),
    });
    elapsedWords += wordCounts[i]!;
  }
  return beats;
}

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

export interface VoiceoverToolContext {
  projectId: string;
  userId: string;
  fps: number;
  onMutation?: () => void;
}

/** Generate a TTS voiceover for a scene, store it, and attach it to the scene. */
export function createVoiceoverTool({
  projectId,
  userId,
  fps,
  onMutation,
}: VoiceoverToolContext) {
  return tool({
    description:
      "Generate a spoken voiceover (TTS) for a scene and attach it; it plays from the scene's first frame in preview and export. Returns the audio duration — the scene is auto-extended if it's shorter than the narration. Use the SAME voice for every scene of a project.",
    inputSchema: z.object({
      sceneId: z.string(),
      script: z
        .string()
        .min(3)
        .max(2000)
        .describe(
          "The narration text. Speech runs ~2.5 words/second — size it to the scene duration.",
        ),
      voice: z.enum(VOICES).optional().describe("Voice (default: nova)"),
      instructions: z
        .string()
        .max(300)
        .optional()
        .describe(
          'Plain-language delivery direction, e.g. "warm, confident product narrator, measured pace"',
        ),
      volume: z.number().min(0).max(1).optional(),
    }),
    execute: async ({ sceneId, script, voice = "nova", instructions, volume }) => {
      if (!process.env.OPENAI_API_KEY) {
        return {
          ok: false as const,
          error:
            "Voiceover is not configured (OPENAI_API_KEY is missing). Tell the user to add it to .env to enable narration, and continue without audio.",
        };
      }

      const [scene] = await db
        .select({
          id: schema.scenes.id,
          name: schema.scenes.name,
          durationInFrames: schema.scenes.durationInFrames,
          projectId: schema.scenes.projectId,
        })
        .from(schema.scenes)
        .where(
          and(eq(schema.scenes.id, sceneId), eq(schema.scenes.projectId, projectId)),
        );
      if (!scene) return { ok: false as const, error: `Scene ${sceneId} not found.` };

      try {
        const { audio } = await generateSpeech({
          model: openai.speech(TTS_MODEL),
          text: script,
          voice,
          outputFormat: "mp3",
          ...(instructions && {
            providerOptions: { openai: { instructions } },
          }),
        });

        const buffer = Buffer.from(audio.uint8Array);
        const metadata = await parseBuffer(buffer, "audio/mpeg").catch(() => null);
        const durationSeconds = metadata?.format.duration ?? null;

        const storageKey = `projects/${projectId}/voiceovers/${sceneId}/${crypto.randomUUID()}.mp3`;
        const url = await putObject(storageKey, buffer, "audio/mpeg");

        // Keep the scene at least as long as the narration (plus a beat to settle).
        const audioFrames = durationSeconds
          ? Math.ceil((durationSeconds + 0.4) * fps)
          : null;
        const extended = audioFrames !== null && audioFrames > scene.durationInFrames;

        await db
          .update(schema.scenes)
          .set({
            audioUrl: url,
            ...(volume !== undefined && { audioVolume: volume }),
            ...(extended && { durationInFrames: audioFrames }),
            updatedAt: new Date(),
          })
          .where(eq(schema.scenes.id, sceneId));

        await db.insert(schema.assets).values({
          userId,
          projectId,
          storageKey,
          url,
          kind: "audio",
          filename: `${scene.name.replace(/[^a-zA-Z0-9._-]/g, "_")}-voiceover.mp3`,
          mimeType: "audio/mpeg",
          sizeBytes: buffer.byteLength,
          durationSeconds,
          status: "ready",
        });

        onMutation?.();
        return {
          ok: true as const,
          sceneId,
          audioUrl: url,
          durationSeconds,
          // Estimated narration beats — use these startFrame values to anchor
          // the scene's animation phases (<Sequence from={...}>) to the voice.
          beats: durationSeconds
            ? estimateBeats(script, durationSeconds, fps)
            : [],
          ...(extended && {
            note: `Scene was extended to ${audioFrames} frames to fit the narration. Re-choreograph the scene so its animation spans the full duration using the beats above.`,
          }),
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
