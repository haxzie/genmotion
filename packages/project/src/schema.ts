import { z } from "zod";
import { MAX_AUDIO_TRACKS } from "@genmotion/shared";

/** 10 minutes at 30fps — the same ceiling the hosted editor enforces. */
export const MAX_DURATION_IN_FRAMES = 30 * 60 * 10;

/**
 * A path recorded in the manifest. Relative, forward-slashed, and inside the
 * project — the manifest is agent-written, so containment is a schema concern
 * rather than something every reader has to remember.
 */
const projectRelativePath = z
  .string()
  .min(1)
  .refine((p) => !p.startsWith("/") && !/^[A-Za-z]:/.test(p), {
    message: "must be relative to the project folder",
  })
  .refine((p) => !p.split("/").includes(".."), {
    message: "must not escape the project folder",
  })
  .refine((p) => !p.split("/")[0]?.startsWith("."), {
    message: "must not point inside a dot-directory",
  });

export const sceneEntrySchema = z.object({
  /** e.g. "scenes/01-intro.tsx" — also the scene's stable id. */
  file: projectRelativePath,
  durationInFrames: z.number().int().positive().max(MAX_DURATION_IN_FRAMES),
  /** Defaults to a title derived from the filename. */
  name: z.string().min(1).optional(),
  /** Scene-level voiceover, played from the scene's first frame. */
  audio: projectRelativePath.optional(),
  audioVolume: z.number().min(0).max(2).optional(),
});

export const audioEntrySchema = z.object({
  /**
   * Stable handle for the clip. Generated on insert — the timeline addresses
   * clips by id across moves, so it cannot be derived from position.
   */
  id: z.string().min(1),
  file: projectRelativePath,
  track: z.number().int().min(0).max(MAX_AUDIO_TRACKS - 1),
  startFrame: z.number().int().min(0),
  durationInFrames: z.number().int().positive().max(MAX_DURATION_IN_FRAMES),
  /** Seconds into the source file where playback begins. */
  startFrom: z.number().min(0).default(0),
  volume: z.number().min(0).max(2).default(1),
  name: z.string().min(1).optional(),
});

export const projectManifestSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1),
  fps: z.number().int().positive().max(120).default(30),
  width: z.number().int().positive().max(7680).default(1920),
  height: z.number().int().positive().max(4320).default(1080),
  /** Timeline order is array order. */
  scenes: z.array(sceneEntrySchema).default([]),
  audio: z.array(audioEntrySchema).default([]),
});

export type SceneEntry = z.infer<typeof sceneEntrySchema>;
export type AudioEntry = z.infer<typeof audioEntrySchema>;
export type ProjectManifest = z.infer<typeof projectManifestSchema>;

/** Manifest as written to disk — defaults omitted are filled in on read. */
export type ProjectManifestInput = z.input<typeof projectManifestSchema>;

/**
 * Human-readable title for a scene with no explicit `name`:
 * "scenes/01-intro.tsx" → "Intro". Leading order digits are stripped because
 * they're a filesystem sorting device, not part of the name.
 */
export function sceneNameFromFile(file: string): string {
  const base = file.split("/").pop() ?? file;
  const stem = base.replace(/\.[jt]sx?$/, "").replace(/^\d+[-_]/, "");
  return stem
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || stem;
}

/** Format a zod failure as something an agent can act on. */
export function formatManifestError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}
