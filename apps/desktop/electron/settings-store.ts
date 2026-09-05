import path from "node:path";
import fs from "node:fs/promises";
import { app } from "electron";

/**
 * `<userData>/settings.json`, with one writer.
 *
 * Two things now live in this file — which harness drives the chat, and the
 * defaults a new project starts from — and they are set from different screens.
 * A read-modify-write in each of them would race: the loser's keys disappear
 * the next time the winner saves. Everything goes through `update` instead,
 * which serialises writes onto one promise chain.
 */

export interface Settings {
  harness?: unknown;
  models?: Record<string, string>;
  /** What the composer opens with on a fresh project. */
  defaults?: { width?: number; height?: number; fps?: number };
}

function settingsFile(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export async function readSettings(): Promise<Settings> {
  const raw = await fs.readFile(settingsFile(), "utf8").catch(() => null);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Settings;
  } catch {
    // A file we cannot parse is a file we are about to overwrite. Losing a
    // preference is better than refusing to start.
    return {};
  }
}

/** Serialises writes so a second caller reads what the first one wrote. */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Apply `mutate` to the stored settings and persist the result.
 *
 * Written through a temp file and renamed over, so a crash mid-write cannot
 * leave a half-file that the next read discards along with every preference
 * in it.
 */
export function update(mutate: (settings: Settings) => Settings): Promise<Settings> {
  const next = queue.then(async () => {
    const merged = mutate(await readSettings());
    const file = settingsFile();
    const tmp = `${file}.tmp`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(tmp, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    await fs.rename(tmp, file);
    return merged;
  });
  // The chain must survive a failed write, or every later save is rejected too.
  queue = next.catch(() => {});
  return next;
}
