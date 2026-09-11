import path from "node:path";
import fs from "node:fs/promises";
import { app } from "electron";
import type { DesktopExportJob } from "../shared";

/**
 * Every export that has ever finished, across every project.
 *
 * The queue in `service.ts` only knows about this run of the app; the Exports
 * panel and page want to show what was rendered last week too. So a finished
 * job is written here — identity, where the file went, and the numbers the
 * card shows — and read back merged with whatever is live.
 *
 * Kept in userData rather than the project folder because the list spans
 * projects, and a project that has since been deleted still had its exports.
 * The file itself is checked for on read (`fileMissing`), never trusted.
 */

/** Enough for a heavy user's year; the page pages nothing, so it stays bounded. */
const HISTORY_LIMIT = 500;

export interface ExportRecord {
  id: string;
  projectDir: string;
  projectName: string;
  format: DesktopExportJob["format"];
  outputPath: string;
  sizeBytes: number;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  createdAt: number;
  finishedAt: number;
}

function historyFile(): string {
  return path.join(app.getPath("userData"), "export-history.json");
}

async function readAll(): Promise<ExportRecord[]> {
  const raw = await fs.readFile(historyFile(), "utf8").catch(() => "[]");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ExportRecord[]).filter(
      (entry) => typeof entry?.id === "string" && typeof entry?.outputPath === "string",
    );
  } catch {
    return [];
  }
}

/** Serialises writes: two exports finishing close together must not lose one. */
let queue: Promise<unknown> = Promise.resolve();

export function recordExport(record: ExportRecord): Promise<void> {
  const next = queue.then(async () => {
    const all = await readAll();
    const merged = [record, ...all.filter((entry) => entry.id !== record.id)].slice(0, HISTORY_LIMIT);
    const file = historyFile();
    const tmp = `${file}.tmp`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(tmp, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    await fs.rename(tmp, file);
  });
  queue = next.catch(() => {});
  return next;
}

/** Newest first. */
export async function listExportHistory(): Promise<ExportRecord[]> {
  const all = await readAll();
  return all.sort((a, b) => b.finishedAt - a.finishedAt);
}

export async function findExportRecord(id: string): Promise<ExportRecord | null> {
  return (await readAll()).find((entry) => entry.id === id) ?? null;
}

/** Whether the file an export produced is still where it was put. */
export async function outputExists(record: { outputPath: string }): Promise<boolean> {
  return fs
    .access(record.outputPath)
    .then(() => true)
    .catch(() => false);
}
