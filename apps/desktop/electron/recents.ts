import path from "node:path";
import fs from "node:fs/promises";
import { app } from "electron";
import { readManifest } from "@genmotion/project";
import { readThumbnail } from "./export/thumbnail";
import type { RecentProject, RecentProjectPage, RecentProjectRange } from "./shared";

/**
 * The list of projects behind the start screen.
 *
 * Kept apart from the window and session plumbing in `main.ts` because the
 * interesting part is paging: the index holds only identity, and the cost of a
 * card — opening a manifest, inlining a rendered frame — is paid one page at a
 * time rather than for every project the app has ever seen.
 */

function recentsFile(): string {
  return path.join(app.getPath("userData"), "recent-projects.json");
}

/**
 * How many projects the index remembers.
 *
 * Comfortably more than fits on screen, which is the point: the start screen
 * pages through them rather than building the whole list at once.
 */
export const RECENTS_LIMIT = 60;

/**
 * The index as stored: identity only.
 *
 * Everything a card shows is read back from the folder when the list is built,
 * so nothing here can go stale — and the inlined thumbnail, easily the heaviest
 * field, has no way to end up written back into a file meant to stay small.
 */
interface StoredRecent {
  dir: string;
  name: string;
  openedAt: number;
}

async function readIndex(): Promise<StoredRecent[]> {
  const raw = await fs.readFile(recentsFile(), "utf8").catch(() => "[]");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as StoredRecent[]).filter(
      (entry): entry is StoredRecent => typeof entry?.dir === "string",
    );
  } catch {
    return [];
  }
}

/**
 * One page of recent projects.
 *
 * Only the requested slice is opened. Every other entry costs a single stat to
 * confirm its folder is still there — reading a manifest and inlining a
 * thumbnail is what actually costs, and doing that sixty times to draw six
 * cards is the thing this exists to avoid.
 */
export async function listRecents(range: RecentProjectRange): Promise<RecentProjectPage> {
  const index = await readIndex();
  // Folders that have since been moved or deleted drop out of the count too,
  // or the list would keep offering more that never arrives.
  const alive = (
    await Promise.all(
      index.map(async (entry) =>
        (await exists(path.join(entry.dir, "project.json"))) ? entry : null,
      ),
    )
  ).filter((entry): entry is StoredRecent => entry !== null);

  const offset = Math.max(0, range.offset ?? 0);
  const limit = Math.max(0, range.limit ?? alive.length);
  const page = await Promise.all(
    alive.slice(offset, offset + limit).map(async (entry) => {
      try {
        const [manifest, created] = await Promise.all([
          readManifest(entry.dir),
          createdAt(entry.dir),
        ]);
        return {
          dir: entry.dir,
          openedAt: entry.openedAt ?? 0,
          createdAt: created,
          name: manifest.name,
          sceneCount: manifest.scenes.length,
          totalFrames: manifest.scenes.reduce((n, s) => n + s.durationInFrames, 0),
          fps: manifest.fps,
          width: manifest.width,
          height: manifest.height,
          // Every entry shows its picture, rows included. Inlining a page of
          // them is affordable precisely because it is a page — this is the
          // cost the paging above exists to bound.
          thumbnail: await readThumbnail(entry.dir),
        } satisfies RecentProject;
      } catch {
        return null; // unreadable manifest — leave it out rather than crash the list
      }
    }),
  );

  return {
    items: page.filter((entry): entry is RecentProject => entry !== null),
    total: alive.length,
  };
}

export async function rememberProject(dir: string, name: string): Promise<void> {
  const index = await readIndex();
  const next: StoredRecent[] = [
    { dir, name, openedAt: Date.now() },
    ...index.filter((entry) => entry.dir !== dir),
  ].slice(0, RECENTS_LIMIT);
  await fs.writeFile(recentsFile(), JSON.stringify(next, null, 2), "utf8");
}

/** Drop a project from the index. The folder itself is not this module's to touch. */
export async function forgetProject(dir: string): Promise<void> {
  const index = await readIndex();
  const next = index.filter((entry) => entry.dir !== dir);
  if (next.length === index.length) return;
  await fs.writeFile(recentsFile(), JSON.stringify(next, null, 2), "utf8");
}

/**
 * When the project was made.
 *
 * The folder's birth time, because `project.json` doesn't have a stable one:
 * saving the timeline writes a temp file and renames it into place, so the
 * manifest is born again on every edit. Filesystems that don't record a birth
 * time report zero, hence the fall back to the folder's own mtime.
 */
async function createdAt(dir: string): Promise<number> {
  const stat = await fs.stat(dir).catch(() => null);
  if (!stat) return 0;
  return stat.birthtimeMs || stat.mtimeMs;
}

async function exists(file: string): Promise<boolean> {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false);
}
