import { tool } from "ai";
import { z } from "zod";
import { and, asc, eq, db, schema } from "@genmotion/db";
import { projectFileKey, putObject } from "@genmotion/storage";
import {
  resolveAudioTrack,
  clipsOverlap,
  MAX_AUDIO_TRACKS,
} from "@genmotion/shared";

const FETCH_TIMEOUT_MS = 30_000;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50MB

const EXT_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/flac": "flac",
};

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

export interface AudioClipToolsContext {
  projectId: string;
  userId: string;
  /** Project fps — converts asset seconds ↔ timeline frames. */
  fps: number;
  onMutation?: () => void;
}

async function loadPlacements(projectId: string, excludeId?: string) {
  const rows = await db
    .select({
      id: schema.audioClips.id,
      track: schema.audioClips.track,
      startFrame: schema.audioClips.startFrame,
      durationInFrames: schema.audioClips.durationInFrames,
    })
    .from(schema.audioClips)
    .where(eq(schema.audioClips.projectId, projectId));
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
}

/**
 * Tools for project-level audio on the timeline — background music, ambience,
 * and sound effects that span scenes — plus voiceover generated with
 * CreateVoiceOverAudio. The agent supplies an audio URL (from CreateVoiceOverAudio,
 * the workbench, an uploaded asset, or saveAudioToProject); a resolver assigns it
 * to a free lane (up to 4).
 */
export function createAudioClipTools({
  projectId,
  userId,
  fps,
  onMutation,
}: AudioClipToolsContext) {
  return {
    saveAudioToProject: tool({
      description:
        "Download an external audio file (royalty-free music, a sound effect, any audio URL) into THIS project's storage and register it as an asset, returning a stable project URL. Use before adding hosted audio to the timeline — don't hot-link external URLs, which can move, expire, or block the renderer. For audio you GENERATE or PROCESS yourself, use the workbench instead (it saves to assets automatically).",
      inputSchema: z.object({
        url: z.url().describe("The external audio URL to copy into the project"),
        filename: z
          .string()
          .max(120)
          .optional()
          .describe("Optional name for the saved file, e.g. 'ambient-loop.mp3'"),
      }),
      execute: async ({ url, filename }) => {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          });
          if (!res.ok) {
            return {
              ok: false as const,
              error: `Could not fetch audio (${res.status} ${res.statusText}).`,
            };
          }
          const contentType = (res.headers.get("content-type") ?? "")
            .split(";")[0]!
            .trim()
            .toLowerCase();
          if (contentType && !contentType.startsWith("audio/")) {
            return {
              ok: false as const,
              error: `URL is not audio (content-type: ${contentType}).`,
            };
          }
          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.byteLength === 0) {
            return { ok: false as const, error: "Fetched audio was empty." };
          }
          if (buffer.byteLength > MAX_AUDIO_BYTES) {
            return {
              ok: false as const,
              error: `Audio is too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB, max 50MB).`,
            };
          }
          const mime = contentType || "audio/mpeg";
          const ext = EXT_BY_MIME[mime] ?? "mp3";
          const base = filename
            ? safe(filename).replace(/\.[a-zA-Z0-9]+$/, "")
            : `audio-${crypto.randomUUID().slice(0, 8)}`;
          const name = `${base}.${ext}`;
          const key = projectFileKey(projectId, name);
          const savedUrl = await putObject(key, buffer, mime);

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
              kind: "audio",
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
            error: `Failed to save audio: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      },
    }),

    addAudio: tool({
      description:
        "Place an audio file on the project timeline (background music, ambience, sound effects) as a movable clip. The system auto-assigns it to a free audio lane (up to " +
        `${MAX_AUDIO_TRACKS}` +
        "); it does NOT need to belong to any scene. Use it for background music, ambience, sound effects, AND voiceover narration — place the audio URL from CreateVoiceOverAudio here (with a startFrame to time it), or from the workbench, an uploaded asset, or saveAudioToProject. Omit durationInFrames to use the asset's full length.",
      inputSchema: z.object({
        url: z
          .string()
          .describe("Project audio URL (from workbench/saveAudioToProject/asset)"),
        name: z
          .string()
          .max(200)
          .optional()
          .describe("Label shown on the timeline clip, e.g. 'Background music'"),
        startFrame: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Global frame where the clip starts (default 0 — video start)"),
        durationInFrames: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("How long the clip plays; omit to use the source's full length"),
        startFrom: z
          .number()
          .min(0)
          .optional()
          .describe("Seconds into the source to begin from (trim the head)"),
        volume: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("0–1 gain. Use ~0.15–0.35 for music under narration."),
      }),
      execute: async ({ url, name, startFrame, durationInFrames, startFrom, volume }) => {
        try {
          const start = startFrame ?? 0;
          let duration = durationInFrames;
          if (!duration) {
            const [asset] = await db
              .select({ durationSeconds: schema.assets.durationSeconds })
              .from(schema.assets)
              .where(
                and(
                  eq(schema.assets.projectId, projectId),
                  eq(schema.assets.url, url),
                ),
              );
            if (asset?.durationSeconds) {
              duration = Math.max(1, Math.round(asset.durationSeconds * fps));
            }
          }
          duration = duration ?? fps * 8;

          const existing = await loadPlacements(projectId);
          const track = resolveAudioTrack(existing, start, duration);
          if (track === null) {
            return {
              ok: false as const,
              error: `All ${MAX_AUDIO_TRACKS} audio lanes already have a clip overlapping frames ${start}–${start + duration}. Move or shorten an existing clip, or choose a different startFrame.`,
            };
          }

          const [clip] = await db
            .insert(schema.audioClips)
            .values({
              projectId,
              url,
              name: name ?? "Audio",
              startFrame: start,
              durationInFrames: duration,
              startFrom: startFrom ?? 0,
              volume: volume ?? 1,
              track,
            })
            .returning({ id: schema.audioClips.id });

          onMutation?.();
          return {
            ok: true as const,
            clipId: clip!.id,
            track,
            startFrame: start,
            durationInFrames: duration,
          };
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    }),

    updateAudio: tool({
      description:
        "Move, trim, re-lane, rename, or set the volume of an existing timeline audio clip. Only the provided fields change. A new position/lane must not overlap another clip on that lane.",
      inputSchema: z.object({
        clipId: z.string().describe("The audio clip's id (from the project context)"),
        name: z.string().max(200).optional(),
        startFrame: z.number().int().min(0).optional(),
        durationInFrames: z.number().int().min(1).optional(),
        startFrom: z.number().min(0).optional(),
        volume: z.number().min(0).max(1).optional(),
        track: z
          .number()
          .int()
          .min(0)
          .max(MAX_AUDIO_TRACKS - 1)
          .optional(),
      }),
      execute: async ({ clipId, ...patch }) => {
        try {
          const [current] = await db
            .select()
            .from(schema.audioClips)
            .where(
              and(
                eq(schema.audioClips.id, clipId),
                eq(schema.audioClips.projectId, projectId),
              ),
            );
          if (!current) {
            return { ok: false as const, error: "Audio clip not found." };
          }
          const nextTrack = patch.track ?? current.track;
          const nextStart = patch.startFrame ?? current.startFrame;
          const nextDuration = patch.durationInFrames ?? current.durationInFrames;
          const others = await loadPlacements(projectId, clipId);
          const collides = others.some(
            (o) =>
              o.track === nextTrack &&
              clipsOverlap(o, {
                track: nextTrack,
                startFrame: nextStart,
                durationInFrames: nextDuration,
              }),
          );
          if (collides) {
            return {
              ok: false as const,
              error: `That position overlaps another clip on lane ${nextTrack}. Pick a different startFrame or lane.`,
            };
          }
          await db
            .update(schema.audioClips)
            .set({ ...patch, updatedAt: new Date() })
            .where(eq(schema.audioClips.id, clipId));
          onMutation?.();
          return { ok: true as const, clipId };
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    }),

    removeAudio: tool({
      description: "Remove an audio clip from the project timeline.",
      inputSchema: z.object({
        clipId: z.string().describe("The audio clip's id (from the project context)"),
      }),
      execute: async ({ clipId }) => {
        const deleted = await db
          .delete(schema.audioClips)
          .where(
            and(
              eq(schema.audioClips.id, clipId),
              eq(schema.audioClips.projectId, projectId),
            ),
          )
          .returning({ id: schema.audioClips.id });
        if (deleted.length === 0) {
          return { ok: false as const, error: "Audio clip not found." };
        }
        onMutation?.();
        return { ok: true as const, clipId };
      },
    }),
  };
}

/** Load a project's audio clips for the agent's project context. */
export async function loadAudioClipsForContext(projectId: string) {
  return db
    .select({
      id: schema.audioClips.id,
      name: schema.audioClips.name,
      track: schema.audioClips.track,
      startFrame: schema.audioClips.startFrame,
      durationInFrames: schema.audioClips.durationInFrames,
      volume: schema.audioClips.volume,
    })
    .from(schema.audioClips)
    .where(eq(schema.audioClips.projectId, projectId))
    .orderBy(asc(schema.audioClips.track), asc(schema.audioClips.startFrame));
}
