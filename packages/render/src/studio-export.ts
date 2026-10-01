import path from "node:path";
import type { RenderProgress, RenderResult } from "./render";

/**
 * The studio's Export button: the same render `genmotion render` runs, started
 * from the page, written to `exports/`, then handed to the browser as a
 * download. One at a time per studio; a second press while one runs is told
 * so rather than queued, because two renders would each get half the machine.
 *
 * The render happens here, in Node, not in the page: it needs ffmpeg for the
 * encode and the audio mix, and a page can't capture itself frame-exactly at
 * a resolution larger than the window it's in.
 */
export interface ExportState {
  state: "idle" | "running" | "done" | "error";
  stage?: RenderProgress["stage"];
  rendered?: number;
  total?: number;
  /** Project-relative, once done. */
  file?: string;
  sizeBytes?: number;
  elapsedMs?: number;
  error?: string;
  startedAt?: string;
}

export interface StudioExport {
  status(): ExportState;
  start(): ExportState;
  cancel(): void;
  /** The finished file's absolute path, when there is one to download. */
  output(): string | null;
}

export function createStudioExport(projectDir: string): StudioExport {
  let current: ExportState = { state: "idle" };
  let controller: AbortController | null = null;
  let output: string | null = null;

  return {
    status: () => current,
    output: () => (current.state === "done" ? output : null),
    cancel() {
      controller?.abort();
    },
    start() {
      if (current.state === "running") return current;
      controller = new AbortController();
      const signal = controller.signal;
      current = { state: "running", stage: "capturing", rendered: 0, total: 0, startedAt: new Date().toISOString() };
      // Lazily: `render` serves its pages through this module's sibling
      // server, and importing it at the top would make the two a cycle.
      void import("./render")
        .then(({ renderProject }) =>
          renderProject({
            projectDir,
            signal,
            onProgress(progress) {
              if (current.state === "running") current = { ...current, ...progress, state: "running" };
            },
          }),
        )
        .then((result: RenderResult) => {
          output = result.output;
          current = {
            state: "done",
            stage: "done",
            rendered: result.frames,
            total: result.frames,
            file: path.relative(projectDir, result.output).split(path.sep).join("/"),
            sizeBytes: result.sizeBytes,
            elapsedMs: result.elapsedMs,
          };
        })
        .catch((err: unknown) => {
          current = signal.aborted
            ? { state: "idle" }
            : { state: "error", error: err instanceof Error ? err.message : String(err) };
        })
        .finally(() => {
          controller = null;
        });
      return current;
    },
  };
}
