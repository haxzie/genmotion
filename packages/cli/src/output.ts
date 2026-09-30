/**
 * How every command talks back. Two audiences, one code path:
 *
 * - People get short, readable lines on stderr while work happens, and a
 *   summary at the end.
 * - Agents pass `--json` and get exactly one JSON object on stdout —
 *   `{ ok: true, ... }` or `{ ok: false, error: { message, fix? } }` — and
 *   nothing else there, ever. Progress still goes to stderr, where it can't
 *   corrupt the parse.
 */
export class CliError extends Error {
  constructor(
    message: string,
    readonly options: { fix?: string; code?: string; exitCode?: number } = {},
  ) {
    super(message);
  }
}

export interface Output {
  json: boolean;
  /** Progress and notes, for people. Silent under `--json`. */
  info(message: string): void;
  /** Always shown (stderr), even under `--json`. */
  warn(message: string): void;
  /** The command's result. */
  result(data: Record<string, unknown>, human?: string): void;
  progress(label: string, done: number, total: number): void;
  endProgress(): void;
}

const tty = process.stderr.isTTY === true;
const color = tty && !process.env.NO_COLOR;
const paint = (code: string) => (text: string) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
export const bold = paint("1");
export const dim = paint("2");
export const green = paint("32");
export const red = paint("31");
export const yellow = paint("33");
export const cyan = paint("36");

export function createOutput(json: boolean): Output {
  let progressShown = false;
  return {
    json,
    info(message) {
      if (!json) process.stderr.write(`${message}\n`);
    },
    warn(message) {
      process.stderr.write(`${yellow("warning")} ${message}\n`);
    },
    result(data, human) {
      if (json) {
        process.stdout.write(`${JSON.stringify({ ok: true, ...data }, null, 2)}\n`);
      } else if (human) {
        process.stdout.write(`${human}\n`);
      }
    },
    progress(label, done, total) {
      if (json || !tty) return;
      const width = 28;
      const filled = total > 0 ? Math.round((done / total) * width) : 0;
      const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
      process.stderr.write(`\r${label} ${bar} ${done}/${total}`);
      progressShown = true;
    },
    endProgress() {
      if (progressShown) process.stderr.write("\n");
      progressShown = false;
    },
  };
}

export function reportError(err: unknown, json: boolean): number {
  const message = err instanceof Error ? err.message : String(err);
  const fix =
    err instanceof CliError ? err.options.fix : (err as { fix?: unknown } | null)?.fix;
  const exitCode = err instanceof CliError ? err.options.exitCode ?? 1 : 1;
  if (json) {
    process.stdout.write(
      `${JSON.stringify({ ok: false, error: { message, ...(typeof fix === "string" ? { fix } : {}) } }, null, 2)}\n`,
    );
  } else {
    process.stderr.write(`${red("error")} ${message}\n`);
    if (typeof fix === "string") process.stderr.write(`${dim("fix:")}   ${fix}\n`);
    if (process.env.GENMOTION_DEBUG && err instanceof Error && err.stack) process.stderr.write(`${dim(err.stack)}\n`);
  }
  return exitCode;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
