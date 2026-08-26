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

/** Debounce for filesystem events — editors and agents write in bursts. */
const SETTLE_MS = 80;

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

  /**
   * The chat transcript, stored as JSONL beside the project so a conversation
   * travels with the folder. Unparseable lines are skipped rather than taking
   * the whole history down.
   */
  async readTranscript(): Promise<unknown[]> {
    const file = path.join(this.dir, ".genmotion", "chat.jsonl");
    const raw = await fs.readFile(file, "utf8").catch(() => "");
    const messages: unknown[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        messages.push(JSON.parse(line));
      } catch {
        /* skip a torn line */
      }
    }
    return messages;
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
      const messages = await this.readTranscript();
      this.seenTranscriptIds = new Set(
        messages
          .map((m) => (m as { id?: unknown }).id)
          .filter((id): id is string => typeof id === "string"),
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
    const file = path.join(this.dir, ".genmotion", "session.json");
    const raw = await fs.readFile(file, "utf8").catch(() => null);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { sessionId?: unknown; backend?: unknown };
      if (parsed.backend !== backend) return null;
      return typeof parsed.sessionId === "string" ? parsed.sessionId : null;
    } catch {
      return null;
    }
  }

  async writeAgentSession(sessionId: string | null, backend: string): Promise<void> {
    const dir = path.join(this.dir, ".genmotion");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "session.json"),
      `${JSON.stringify({ backend, sessionId }, null, 2)}\n`,
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
