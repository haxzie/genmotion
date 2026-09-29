import fs from "node:fs/promises";
import path from "node:path";

/**
 * Undo for the timeline's manual edits.
 *
 * Every manual edit — a reorder, a trim, a mute, a slice, a delete — is a
 * small write to a handful of text files: `project.json` for a React project,
 * `index.html` for a HyperFrames one, plus the scene file a slice copies or a
 * delete takes away. So a step back is just those files as they were, and
 * nothing here has to know how to invert an edit: the bytes carry it.
 *
 * Only the loopback timeline routes record, which is what makes this "undo my
 * edits" rather than "undo the video" — the agent writes the same files
 * through its own tools and its work is never on this stack. When it does
 * touch a file an entry covers, the entry is stale and the stack is dropped
 * rather than being allowed to overwrite the agent's answer.
 */

/** How many manual edits one project remembers. */
const MAX_DEPTH = 50;

interface FileState {
  /** Project-relative. */
  path: string;
  /** null when the file didn't exist at the time. */
  content: string | null;
}

interface Entry {
  label: string;
  before: FileState[];
  after: FileState[];
}

export class TimelineHistory {
  private stack: Entry[] = [];

  constructor(private readonly dir: string) {}

  /** What Undo would take back, for the dock's button; null when nothing would. */
  get label(): string | null {
    return this.stack.at(-1)?.label ?? null;
  }

  /**
   * Run one manual edit, remembering the named files as they were first.
   *
   * The files are every one the edit can touch — listing a file it turns out
   * not to write costs a read and nothing else, while missing one leaves an
   * undo that only half works.
   */
  async record<T>(label: string, files: string[], apply: () => Promise<T>): Promise<T> {
    const before = await this.snapshot(files);
    const result = await apply();
    this.stack.push({ label, before, after: await this.snapshot(files) });
    if (this.stack.length > MAX_DEPTH) this.stack.shift();
    return result;
  }

  /** Put the last manual edit back, returning its label — or null if there was none. */
  async undo(): Promise<string | null> {
    const entry = this.stack.pop();
    if (!entry) return null;
    const current = await this.snapshot(entry.after.map((f) => f.path));
    if (entry.after.some((file, i) => current[i]?.content !== file.content)) {
      // Something other than the timeline has written one of these files since
      // — the agent, an open editor, a branch switch. That work outranks an
      // undo that would silently throw it away, and every older entry is
      // staler still, so the whole stack goes.
      this.stack = [];
      return null;
    }
    for (const file of entry.before) await this.restore(file);
    return entry.label;
  }

  private async snapshot(files: string[]): Promise<FileState[]> {
    return Promise.all(
      files.map(async (file) => ({
        path: file,
        content: await fs.readFile(path.join(this.dir, file), "utf8").catch(() => null),
      })),
    );
  }

  private async restore(file: FileState): Promise<void> {
    const full = path.join(this.dir, file.path);
    // No content means the edit created the file (a slice's second half): the
    // way back is for it to be gone again.
    if (file.content === null) {
      await fs.rm(full, { force: true });
      return;
    }
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, file.content, "utf8");
  }
}
