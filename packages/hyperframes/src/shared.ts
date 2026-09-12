/**
 * The part of this package a browser can import: the shapes the main process
 * hands the editor, and the one formatter both sides use. Nothing here touches
 * Node — the compiler, the linter and the installer live behind the package
 * root, which the desktop renderer must never pull in.
 */

export type ClipKind = "video" | "audio" | "image" | "element" | "composition";

/** One timed element of the compiled composition, in root time. */
export interface TimelineClip {
  /** The element's `id`, or a generated handle when it has none. */
  id: string;
  label: string;
  kind: ClipKind;
  /** Seconds from the start of the video. */
  start: number;
  /** Seconds; null when nothing declares or infers one. */
  duration: number | null;
  /** `data-track-index` — a display lane, not a timing constraint. */
  track: number;
  /** Project-relative source for media, as the compiler rewrote it. */
  src: string | null;
  /** The sub-composition file a host slot mounts, project-relative. */
  compositionFile: string | null;
  /** Nesting depth below the root, for indenting lanes. */
  depth: number;
}

/** A sub-composition slot: what the editor shows as a scene chip. */
export interface TimelineScene {
  id: string;
  label: string;
  file: string;
  start: number;
  duration: number | null;
}

/** An `<audio>` element the export has to mix. */
export interface TimelineAudio {
  id: string;
  src: string;
  start: number;
  duration: number | null;
  /** Seconds into the source file playback begins. */
  mediaStart: number;
  /** Linear gain, from `data-volume`. */
  volume: number;
}

export interface CompositionTimeline {
  durationSeconds: number;
  clips: TimelineClip[];
  scenes: TimelineScene[];
  audio: TimelineAudio[];
}

export type LintSeverity = "error" | "warning" | "info";

export interface LintFinding {
  /** Project-relative file the finding is in. */
  file: string;
  code: string;
  severity: LintSeverity;
  message: string;
  /** How to fix it, when the rule knows. */
  fixHint?: string;
  selector?: string;
  elementId?: string;
}

export interface LintReport {
  ok: boolean;
  errorCount: number;
  warningCount: number;
  findings: LintFinding[];
}

/** A finding as one line an agent — or a banner — can act on. */
export function formatFinding(f: LintFinding): string {
  const where = f.elementId ? `#${f.elementId}` : f.selector ? f.selector : "";
  return `${f.severity.toUpperCase()} ${f.file}${where ? ` (${where})` : ""}: ${f.message} [${f.code}]${
    f.fixHint ? `\n  fix: ${f.fixHint}` : ""
  }`;
}

/** Where a project's install stands. `version` is known from `installing` on. */
export type InstallStep =
  | { step: "resolving" }
  | { step: "installing"; version: string }
  | { step: "done"; version: string; /** Null when the install ran. */ note: string | null }
  | { step: "failed"; version: string; error: string };
