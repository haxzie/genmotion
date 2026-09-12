import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { ProjectSession } from "./project-session";
import { captureThumbnail } from "./export/thumbnail";
import { abortTurn, isTurnRunning, turnSettled } from "./agent/turns";
import type { DesktopProject } from "./shared";

/**
 * Every project the app has open, one session each.
 *
 * Tabs are what this exists for: several projects live at once, each with its
 * own watcher, bundler and — in the renderer — its own editor, and an agent may
 * be mid-turn in any of them. The registry is the only thing allowed to
 * construct a `ProjectSession`, and it is idempotent by folder: a second
 * session on the same folder would run `recoverInterruptedTurn` against a live
 * turn's checkpoint, double-write the transcript, and put two watchers and two
 * esbuild contexts on the same files.
 */

interface Entry {
  session: ProjectSession;
  unsubscribe: () => void;
  thumbnailTimer: NodeJS.Timeout | null;
}

/**
 * Re-capture a project's card image once its edits settle.
 *
 * Long after the change, and only when nothing else has landed since: an agent
 * turn writes a scene several times over, and each write would otherwise open a
 * composition-sized window to photograph a half-finished frame.
 */
const THUMBNAIL_SETTLE_MS = 4000;

/** How long a forced close waits for the aborted turn to wind down. */
const FORCE_CLOSE_GRACE_MS = 3000;

/** Keyed by the resolved folder path — the same one `ProjectSession.dir` reports. */
const byDir = new Map<string, Entry>();
const byAssetKey = new Map<string, Entry>();
const listeners = new Set<(project: DesktopProject) => void>();

/** The project whose tab is frontmost, or null on the Home tab. */
let activeDir: string | null = null;

/**
 * The folder as the session will name it.
 *
 * Symlinks are the trap: `/tmp/p` and `/private/tmp/p` are one folder, and the
 * bundler resolves to the real one. Matching that here is what keeps the map
 * from holding the same project twice. A folder that does not exist yet falls
 * back to the literal path, as the bundler does.
 */
export async function resolveDir(dir: string): Promise<string> {
  const absolute = path.resolve(dir);
  return fs.realpath(absolute).catch(() => absolute);
}

export type CloseResult = { closed: true } | { closed: false; reason: "turn-running" };

export interface OpenResult {
  session: ProjectSession;
  project: DesktopProject;
  /** True when no new session was made — the folder was already open. */
  alreadyOpen: boolean;
}

/** Fires with the fresh payload whenever any open project's folder changes. */
export function onProjectChanged(listener: (project: DesktopProject) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Open a folder, or hand back the session that already has it.
 *
 * Opening an open project is how a tab gets focused, so the second case is
 * ordinary rather than an error — and it deliberately does none of the
 * open-time work (recovery, watcher, warm-up) a fresh session does.
 */
export async function openSession(dir: string): Promise<OpenResult> {
  const resolved = await resolveDir(dir);
  const existing = byDir.get(resolved);
  if (existing) {
    return { session: existing.session, project: await existing.session.load(), alreadyOpen: true };
  }

  const session = await ProjectSession.open(resolved, randomUUID());
  // Two opens racing on the same folder: the second to finish must not win.
  const raced = byDir.get(session.dir);
  if (raced) {
    await session.dispose();
    return { session: raced.session, project: await raced.session.load(), alreadyOpen: true };
  }

  const entry: Entry = { session, unsubscribe: () => {}, thumbnailTimer: null };
  entry.unsubscribe = session.onChange((project) => {
    for (const listener of listeners) listener(project);
    scheduleThumbnail(entry);
  });
  byDir.set(session.dir, entry);
  byAssetKey.set(session.assetKey, entry);

  return { session, project: await session.load(), alreadyOpen: false };
}

function scheduleThumbnail(entry: Entry): void {
  if (entry.thumbnailTimer) clearTimeout(entry.thumbnailTimer);
  entry.thumbnailTimer = setTimeout(() => {
    entry.thumbnailTimer = null;
    // The project may have been closed during the wait.
    if (byDir.get(entry.session.dir) !== entry) return;
    void captureThumbnail(entry.session).catch(() => {});
  }, THUMBNAIL_SETTLE_MS);
}

/**
 * Close a project.
 *
 * Refuses while its agent is mid-turn unless forced: the session holds the
 * bundler that turn's tools compile against, and disposing it underneath them
 * fails every later `validate_scene` with an esbuild "service is no longer
 * running". Forcing aborts the turn first and gives it a bounded moment to
 * wind down — awaiting it outright could hang a close button for minutes.
 */
export async function closeSession(
  dir: string,
  { force = false }: { force?: boolean } = {},
): Promise<CloseResult> {
  const resolved = await resolveDir(dir);
  const entry = byDir.get(resolved);
  if (!entry) return { closed: true };

  if (isTurnRunning(resolved)) {
    if (!force) return { closed: false, reason: "turn-running" };
    abortTurn(resolved);
    await Promise.race([
      turnSettled(resolved),
      new Promise<void>((resolve) => setTimeout(resolve, FORCE_CLOSE_GRACE_MS)),
    ]);
  }

  // Re-check: the turn's finish may have closed it, or another caller beat us.
  if (byDir.get(resolved) !== entry) return { closed: true };
  byDir.delete(resolved);
  byAssetKey.delete(entry.session.assetKey);
  if (activeDir === resolved) activeDir = null;

  entry.unsubscribe();
  if (entry.thumbnailTimer) {
    clearTimeout(entry.thumbnailTimer);
    entry.thumbnailTimer = null;
    // Leaving the editor is exactly when the card is about to be looked at, so
    // spend the capture now rather than dropping the pending one.
    await captureThumbnail(entry.session).catch(() => null);
  }
  await entry.session.dispose();
  // A subprocess spawned in anticipation of a turn that never came. Scoped to
  // this folder: closing a background tab must not take the active tab's
  // warm process with it.
  const { disposeWarmClaudeCodeFor } = await import("./agent/claude-code");
  await disposeWarmClaudeCodeFor(resolved);
  const { cancelExportsForProject } = await import("./export/service");
  cancelExportsForProject(resolved);
  const { cancelScaffoldInstall } = await import("./hyperframes/scaffold");
  cancelScaffoldInstall(resolved);
  return { closed: true };
}

/** Quit path: every project, forced. */
export async function closeAllSessions(): Promise<void> {
  await Promise.all([...byDir.keys()].map((dir) => closeSession(dir, { force: true })));
}

export function getSession(dir: string): ProjectSession | null {
  return byDir.get(path.resolve(dir))?.session ?? null;
}

/** Resolve through symlinks, for callers holding a path the user typed. */
export async function findSession(dir: string): Promise<ProjectSession | null> {
  return byDir.get(await resolveDir(dir))?.session ?? null;
}

/** The session a `gm-asset://<key>/…` URL belongs to. */
export function sessionByAssetKey(key: string): ProjectSession | null {
  return byAssetKey.get(key)?.session ?? null;
}

export function listSessions(): ProjectSession[] {
  return [...byDir.values()].map((entry) => entry.session);
}

export function isSessionOpen(dir: string): boolean {
  return byDir.has(path.resolve(dir));
}

/** Record which project's tab is frontmost. Null means the Home tab. */
export function setActiveSession(dir: string | null): void {
  activeDir = dir ? path.resolve(dir) : null;
}

export function activeSession(): ProjectSession | null {
  return activeDir ? (byDir.get(activeDir)?.session ?? null) : null;
}
