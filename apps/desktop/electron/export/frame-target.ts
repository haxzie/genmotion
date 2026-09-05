import type { ProjectManifest, SceneEntry } from "@genmotion/project";
import {
  globalToLocal,
  localToGlobal,
  totalDurationInFrames,
  type SceneDuration,
} from "@genmotion/shared";

/**
 * Turning "which moment do you mean?" into a frame number.
 *
 * Kept apart from `capture.ts` so it can be tested as the plain arithmetic it
 * is — that file opens a `BrowserWindow`, which a unit test cannot.
 */

/**
 * How far in to sample when no moment is given.
 *
 * Intro animations have settled by 60% but outros generally haven't started,
 * so this lands on the scene's actual content — the same point the project
 * card and the hosted renderer pick, for the same reason.
 */
export const SAMPLE_AT = 0.6;

/** Seconds ("1.5s", "2 s") — the form a model reaches for first. */
const SECONDS = /^(\d+(?:\.\d+)?)\s*s$/i;

/** A bare frame index. */
const FRAMES = /^\d+$/;

export interface FrameTarget {
  /** Frame on the whole timeline — what `setFrame` takes. */
  frame: number;
  /** The scene that owns it. */
  scene: SceneEntry;
  /** Frame within that scene. */
  localFrame: number;
  /** The whole video, so the caller can say where in it this sits. */
  totalFrames: number;
}

export type FrameTargetResult =
  | { ok: true; target: FrameTarget }
  | { ok: false; error: string };

/**
 * Resolve `{ scene, at }` against the manifest.
 *
 * `scene` chooses the frame space: given one, `at` is measured from that
 * scene's first frame; without one, from the start of the video. Either way
 * the result carries the owning scene, because that is what makes the answer
 * legible when the caller only asked for a timecode.
 *
 * Errors are phrased for a model to act on rather than to report — an unknown
 * scene comes back with the list of real ones, so the next call is right.
 */
export function resolveFrameTarget(
  manifest: ProjectManifest,
  args: { scene?: string; at?: string },
): FrameTargetResult {
  const scenes = manifest.scenes;
  if (scenes.length === 0) {
    return { ok: false, error: "the project has no scenes yet, so there is nothing to render." };
  }

  const wanted = args.scene?.trim().replace(/^\.?\//, "");
  let index = -1;
  if (wanted) {
    index = scenes.findIndex((s) => s.file === wanted);
    if (index === -1) {
      return {
        ok: false,
        error: `project.json has no scene "${wanted}". It lists: ${scenes.map((s) => s.file).join(", ")}`,
      };
    }
  }

  // `SceneDuration` is keyed by id; a scene's file *is* its id.
  const spans: SceneDuration[] = scenes.map((s) => ({
    id: s.file,
    durationInFrames: s.durationInFrames,
  }));
  const totalFrames = totalDurationInFrames(spans);

  // The span `at` is measured against: one scene, or the whole timeline.
  const span = index === -1 ? totalFrames : scenes[index]!.durationInFrames;

  const parsed = parseAt(args.at, manifest.fps, span);
  if (!parsed.ok) return parsed;

  const within = Math.min(span - 1, Math.max(0, parsed.frame));
  const frame = index === -1 ? within : localToGlobal(spans, index, within);

  // Asked by timecode, the caller doesn't know which scene that lands in —
  // and it is the first thing they need to be told.
  const owner = globalToLocal(spans, frame)!;
  return {
    ok: true,
    target: {
      frame,
      scene: scenes[owner.sceneIndex]!,
      localFrame: owner.localFrame,
      totalFrames,
    },
  };
}

function parseAt(
  at: string | undefined,
  fps: number,
  span: number,
): { ok: true; frame: number } | { ok: false; error: string } {
  const value = at?.trim();
  if (!value) return { ok: true, frame: Math.round(span * SAMPLE_AT) };

  const seconds = SECONDS.exec(value);
  if (seconds) return { ok: true, frame: Math.round(Number(seconds[1]) * fps) };
  if (FRAMES.test(value)) return { ok: true, frame: Number(value) };

  return {
    ok: false,
    error: `could not read \`at\`: "${value}". Give seconds ("1.5s") or a frame number ("45").`,
  };
}
