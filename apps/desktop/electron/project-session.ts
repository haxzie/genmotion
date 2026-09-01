import path from "node:path";
import fs from "node:fs/promises";
import chokidar, { type FSWatcher } from "chokidar";
import type { AudioClipData, SceneData } from "@genmotion/shared";
import {
  createSceneBundler,
  readManifest,
  sceneNameFromFile,
  validateSceneFile,
  type ProjectManifest,
  type SceneBundler,
} from "@genmotion/project";
import type { DesktopProject, SceneBundle } from "./shared";

export interface AgentContextUsage {
  usedTokens: number;
  maxTokens: number;
}

/** `.genmotion/session.json` — which harness owns the thread, and where it stands. */
interface StoredAgentSession {
  backend?: string;
  sessionId?: string | null;
  context?: Partial<AgentContextUsage> | null;
}

/** Debounce for filesystem events — editors and agents write in bursts. */
const SETTLE_MS = 80;

/**
 * Messages per transcript page.
 *
 * Enough to fill the panel and then some, so opening a project never shows a
 * gap that has to be filled before the conversation reads normally.
 */
export const TRANSCRIPT_PAGE = 30;

/**
 * How much of a tool payload the history keeps.
 *
 * Three quarters of a transcript's bytes are tool inputs and outputs — the
 * full text of every file written, every file read. The card that displays
 * them is collapsed by default and the current version of the file is on disk
 * anyway, so shipping all of it to the renderer buys a scroll-back nobody
 * reads. Live messages are never trimmed; this applies only to history.
 */
const MAX_PAYLOAD_CHARS = 2_000;

export interface TranscriptPage {
  messages: unknown[];
  /** True when older messages remain before this page. */
  hasMore: boolean;
  /** Oldest id in this page — pass as `before` to fetch the page before it. */
  cursor: string | null;
}

function parseLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined; // a torn line costs its own message, not the history
  }
}

function messageId(line: string): string | null {
  const parsed = parseLine(line) as { id?: unknown } | undefined;
  return typeof parsed?.id === "string" ? parsed.id : null;
}

/** Cut a long string down, saying so rather than silently ending mid-word. */
function clip(value: string): string {
  if (value.length <= MAX_PAYLOAD_CHARS) return value;
  const dropped = value.length - MAX_PAYLOAD_CHARS;
  return `${value.slice(0, MAX_PAYLOAD_CHARS)}\n\n… ${dropped.toLocaleString()} more characters, trimmed from history`;
}

/** Walk a tool part's input/output, clipping any oversized string in it. */
function clipDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return clip(value);
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((entry) => clipDeep(entry, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = clipDeep(entry, depth + 1);
  }
  return out;
}

/**
 * Trim a stored message for display.
 *
 * Only tool parts are touched: text is what the conversation actually reads
 * back as, and it is an eighth of the bytes.
 */
function trimForHistory(message: unknown): unknown {
  const msg = message as { parts?: unknown } | null;
  if (!msg || !Array.isArray(msg.parts)) return message;
  return {
    ...(message as object),
    parts: msg.parts.map((part) => {
      const p = part as { type?: unknown; input?: unknown; output?: unknown };
      if (typeof p?.type !== "string" || !p.type.startsWith("tool-")) return part;
      return {
        ...(part as object),
        ...(p.input !== undefined ? { input: clipDeep(p.input) } : {}),
        ...(p.output !== undefined ? { output: clipDeep(p.output) } : {}),
      };
    }),
  };
}

/**
 * One open project: the manifest, an incremental bundler, and a watcher that
 * rebuilds whatever a change touched. Everything the renderer needs arrives as
 * one whole project payload, so the UI never reasons about partial state.
 */
export class ProjectSession {
  readonly dir: string;
  /** Namespaces this project's asset URLs so two windows can't collide. */
  readonly assetKey: string;

  /** Shared with the agent's validate tool so both see one incremental build. */
  readonly bundler: SceneBundler;
  private watcher: FSWatcher | null = null;
  private timer: NodeJS.Timeout | null = null;
  private listeners = new Set<(project: DesktopProject) => void>();
  private disposed = false;

  private constructor(dir: string, assetKey: string) {
    this.assetKey = assetKey;
    this.bundler = createSceneBundler({
      projectDir: dir,
      assetUrlPrefix: `gm-asset://${assetKey}/`,
    });
    // Take the bundler's symlink-resolved root so watcher paths, asset
    // containment checks, and esbuild's reported inputs all agree.
    this.dir = this.bundler.projectDir;
  }

  static async open(dir: string, assetKey: string): Promise<ProjectSession> {
    const session = new ProjectSession(path.resolve(dir), assetKey);
    await session.startWatching();
    return session;
  }

  onChange(listener: (project: DesktopProject) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  assetUrl(file: string): string {
    return `gm-asset://${this.assetKey}/${file.split("/").map(encodeURIComponent).join("/")}`;
  }

  /** Raw lines of the transcript, newest last. Cheap: no JSON parsed. */
  private async transcriptLines(): Promise<string[]> {
    const file = path.join(this.dir, ".genmotion", "chat.jsonl");
    const raw = await fs.readFile(file, "utf8").catch(() => "");
    return raw.split("\n").filter((line) => line.trim());
  }

  /**
   * A page of the chat transcript, newest last.
   *
   * The transcript is JSONL beside the project so a conversation travels with
   * the folder — but it is not small. Measured on a real project: 50 messages,
   * 388KB, three quarters of it tool payloads, with a single assistant message
   * reaching 100KB across 75 parts. Handing all of that to the renderer on open
   * costs more every time the project is used again.
   *
   * So it is read backwards, a page at a time, and only the lines in the page
   * are parsed. The common case — opening a project, which wants the tail —
   * parses `limit` lines no matter how long the history is.
   *
   * Unparseable lines are skipped rather than taking the whole history down.
   */
  async readTranscript({
    before,
    limit = TRANSCRIPT_PAGE,
  }: { before?: string; limit?: number } = {}): Promise<TranscriptPage> {
    const lines = await this.transcriptLines();

    // Walk back to the cursor. Only the lines actually visited are parsed, so
    // a first page never touches the rest of the file.
    let end = lines.length;
    if (before) {
      end = 0;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (messageId(lines[i]!) === before) {
          end = i;
          break;
        }
      }
    }

    const start = Math.max(0, end - limit);
    const messages: unknown[] = [];
    for (let i = start; i < end; i++) {
      const parsed = parseLine(lines[i]!);
      if (parsed !== undefined) messages.push(trimForHistory(parsed));
    }

    return {
      messages,
      hasMore: start > 0,
      // The oldest id in this page is where the next one resumes from.
      cursor: messages.length > 0 ? messageId(lines[start]!) : null,
    };
  }

  /**
   * Append a message to the on-disk transcript, once.
   *
   * Idempotent by message id: a retried turn re-posts the *same* user message,
   * and appending it again would leave the user reading their own question
   * three times when they reopen the project.
   */
  async appendTranscript(message: unknown): Promise<void> {
    const id = (message as { id?: unknown } | null)?.id;
    if (typeof id === "string") {
      const seen = await this.transcriptIds();
      if (seen.has(id)) return;
      seen.add(id);
    }
    const dir = path.join(this.dir, ".genmotion");
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(path.join(dir, "chat.jsonl"), `${JSON.stringify(message)}\n`, "utf8");
  }

  private seenTranscriptIds: Set<string> | null = null;

  private async transcriptIds(): Promise<Set<string>> {
    if (!this.seenTranscriptIds) {
      // Every id, not a page: this is the dedupe set, and it is built once per
      // session on the first append.
      const lines = await this.transcriptLines();
      this.seenTranscriptIds = new Set(
        lines.map(messageId).filter((id): id is string => id !== null),
      );
    }
    return this.seenTranscriptIds;
  }

  /**
   * The harness session id for this project, so a turn can resume the last one.
   *
   * Scoped to the harness that produced it: a Claude Code session id means
   * nothing to Codex, and handing one over would fail the resume — or worse,
   * silently match some unrelated thread. Switching harness mid-project starts
   * a fresh session, which is the honest outcome; the transcript on screen is
   * unaffected, since that lives in the project folder rather than the harness.
   */
  async readAgentSession(backend: string): Promise<string | null> {
    const stored = await this.readSessionFile();
    if (!stored || stored.backend !== backend) return null;
    return typeof stored.sessionId === "string" ? stored.sessionId : null;
  }

  /**
   * How full the harness's context was at the end of the last turn.
   *
   * Persisted because the model's context outlives the app: the session is
   * resumed on the next launch with everything still in it, so the ring has a
   * true number to show from the first frame instead of waiting a whole turn
   * for one — which is what made it read empty, or worse, fall back to counting
   * our own transcript.
   */
  async readAgentContext(): Promise<AgentContextUsage | null> {
    const stored = await this.readSessionFile();
    const context = stored?.context;
    if (
      !context ||
      typeof context.usedTokens !== "number" ||
      typeof context.maxTokens !== "number"
    ) {
      return null;
    }
    return { usedTokens: context.usedTokens, maxTokens: context.maxTokens };
  }

  private async readSessionFile(): Promise<StoredAgentSession | null> {
    const file = path.join(this.dir, ".genmotion", "session.json");
    const raw = await fs.readFile(file, "utf8").catch(() => null);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredAgentSession;
    } catch {
      return null;
    }
  }

  async writeAgentSession(
    sessionId: string | null,
    backend: string,
    /** Omitted when the turn never reported one — the stored reading stands. */
    context?: AgentContextUsage | null,
  ): Promise<void> {
    const dir = path.join(this.dir, ".genmotion");
    await fs.mkdir(dir, { recursive: true });
    const previous = await this.readSessionFile();
    // A reading only carries forward within the same harness: a Codex number
    // says nothing about a Claude Code session, or the other way round.
    const kept = previous?.backend === backend ? (previous.context ?? null) : null;
    await fs.writeFile(
      path.join(dir, "session.json"),
      `${JSON.stringify({ backend, sessionId, context: context ?? kept }, null, 2)}\n`,
      "utf8",
    );
  }

  /** Build the full payload: manifest + every scene bundled and validated. */
  async load(): Promise<DesktopProject> {
    let manifest: ProjectManifest;
    try {
      manifest = await readManifest(this.dir);
    } catch (err) {
      // Tell "the folder went away" apart from "the manifest is malformed":
      // one is a broken edit worth reporting, the other means there is nothing
      // left to show and the app should let go of the project.
      const gone = !(await fs
        .access(this.dir)
        .then(() => true)
        .catch(() => false));
      return this.blank(
        gone ? "This project folder no longer exists." : err instanceof Error ? err.message : String(err),
        gone,
      );
    }

    const missing: string[] = [];
    const scenes: SceneData[] = [];
    const bundles: Record<string, SceneBundle> = {};

    for (const entry of manifest.scenes) {
      const source = await fs
        .readFile(path.resolve(this.dir, entry.file), "utf8")
        .catch(() => null);
      if (source === null) {
        missing.push(entry.file);
        continue;
      }

      const validation = await validateSceneFile({
        bundler: this.bundler,
        sceneFile: entry.file,
        config: {
          fps: manifest.fps,
          width: manifest.width,
          height: manifest.height,
          durationInFrames: entry.durationInFrames,
        },
      });
      // Validation already built it; this call returns the cached rebuild.
      const built = validation.error ? null : await this.bundler.bundle(entry.file);

      scenes.push({
        id: entry.file,
        name: entry.name ?? sceneNameFromFile(entry.file),
        code: source,
        durationInFrames: entry.durationInFrames,
        order: scenes.length,
        audioUrl: entry.audio ? this.assetUrl(entry.audio) : null,
        audioVolume: entry.audioVolume ?? 1,
      });
      bundles[entry.file] = {
        code: built?.ok ? built.code : null,
        error: validation.error,
        warnings: validation.warnings,
      };
    }

    const audioClips: AudioClipData[] = manifest.audio.map((clip) => ({
      id: clip.id,
      track: clip.track,
      url: this.assetUrl(clip.file),
      name: clip.name ?? clip.file.split("/").pop() ?? clip.file,
      startFrame: clip.startFrame,
      durationInFrames: clip.durationInFrames,
      startFrom: clip.startFrom,
      volume: clip.volume,
      fadeInFrames: clip.fadeInFrames,
      fadeOutFrames: clip.fadeOutFrames,
      muted: clip.muted,
    }));

    return {
      id: this.dir,
      dir: this.dir,
      name: manifest.name,
      fps: manifest.fps,
      width: manifest.width,
      height: manifest.height,
      scenes,
      audioClips,
      bundles,
      missing,
      manifestError: null,
      folderMissing: false,
    };
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.listeners.clear();
    await this.watcher?.close();
    await this.bundler.dispose();
  }

  private blank(manifestError: string | null, folderMissing = false): DesktopProject {
    return {
      id: this.dir,
      dir: this.dir,
      name: path.basename(this.dir),
      fps: 30,
      width: 1920,
      height: 1080,
      scenes: [],
      audioClips: [],
      bundles: {},
      missing: [],
      manifestError,
      folderMissing,
    };
  }

  private async startWatching(): Promise<void> {
    this.watcher = chokidar.watch(this.dir, {
      ignoreInitial: true,
      ignored: (candidate) => {
        const rel = path.relative(this.dir, candidate);
        if (!rel || rel.startsWith("..")) return false;
        const [head] = rel.split(path.sep);
        // Dependencies and app-owned state churn constantly and never change
        // the composition on their own — a real change re-enters through the
        // scene that imports it.
        return head === "node_modules" || head === ".genmotion" || head === ".git";
      },
    });

    const bump = () => {
      if (this.disposed) return;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = null;
        void this.emit();
      }, SETTLE_MS);
    };

    this.watcher.on("add", bump).on("change", bump).on("unlink", bump).on("unlinkDir", bump);
  }

  private async emit(): Promise<void> {
    // A watcher-triggered reload must never take the app down.
    const payload = await this.load().catch((err) =>
      this.blank(err instanceof Error ? err.message : String(err)),
    );
    if (this.disposed) return;
    for (const listener of this.listeners) listener(payload);
  }
}
