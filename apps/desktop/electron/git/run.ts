import { spawn } from "node:child_process";
import { agentEnv, resolveExecutable } from "../agent/detect";

/**
 * Running `git` and `gh`.
 *
 * Both come off the user's machine — the app bundles neither. `gh` in
 * particular is the whole authentication story: it is already signed in, it
 * already knows whether the user prefers SSH or HTTPS, and it already handles
 * their SSO and their enterprise host. Shipping a token flow of our own would
 * mean storing a credential that `gh` is holding two directories away.
 *
 * `agentEnv()` is not an optimisation here. A macOS app launched from Finder
 * inherits no login shell, so `process.env.PATH` is `/usr/bin:/bin:/usr/sbin:
 * /sbin` — `git` is found and `gh`, which Homebrew puts in `/opt/homebrew/bin`,
 * is not. The same PATH the agent CLIs are spawned with is the one that finds
 * it.
 */

/** How much of a failed command's stderr is worth keeping. */
const STDERR_CAP = 8000;

export class GitCommandError extends Error {
  constructor(
    message: string,
    readonly command: string,
    readonly exitCode: number | null,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "GitCommandError";
  }
}

export interface RunResult {
  stdout: string;
  stderr: string;
}

interface RunOptions {
  cwd: string;
  signal?: AbortSignal;
  /**
   * Don't throw on a non-zero exit — return the result and let the caller read
   * the code. For the commands where failing is an answer rather than a fault:
   * `git rev-parse` in a folder that isn't a repo, `gh auth status` when the
   * user is logged out.
   */
  tolerant?: boolean;
}

async function run(
  bin: "git" | "gh",
  args: string[],
  options: RunOptions,
): Promise<RunResult & { code: number | null }> {
  const executable = await resolveExecutable(bin);
  if (!executable) throw new MissingCliError(bin);

  return new Promise((resolve, reject) => {
    const proc = spawn(executable, args, {
      cwd: options.cwd,
      env: {
        ...agentEnv(),
        // Every prompt this could hit — a password, a passphrase, a host key —
        // would hang a process nobody can see. Fail instead, with a message the
        // dialog can show.
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "",
        SSH_ASKPASS: "",
        // `gh` pages its output through `less` when it thinks it has a terminal.
        GH_PAGER: "cat",
        GH_PROMPT_DISABLED: "1",
        NO_COLOR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > STDERR_CAP) stderr = stderr.slice(-STDERR_CAP / 2);
    });

    const onAbort = () => proc.kill();
    options.signal?.addEventListener("abort", onAbort, { once: true });

    proc.on("error", (err) => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(err);
    });
    proc.on("close", (code) => {
      options.signal?.removeEventListener("abort", onAbort);
      if (code === 0 || options.tolerant) {
        resolve({ stdout, stderr, code });
        return;
      }
      const command = `${bin} ${args.join(" ")}`;
      reject(new GitCommandError(explain(stderr, stdout, command), command, code, stderr));
    });
  });
}

/** `gh` or `git` isn't on this machine. The dialog turns this into instructions. */
export class MissingCliError extends Error {
  constructor(readonly cli: "git" | "gh") {
    super(cli === "gh" ? "The GitHub CLI (gh) isn't installed." : "git isn't installed.");
    this.name = "MissingCliError";
  }
}

export async function runGit(
  args: string[],
  cwd: string,
  options: { signal?: AbortSignal } = {},
): Promise<RunResult> {
  return run("git", args, { cwd, signal: options.signal });
}

export async function runGh(
  args: string[],
  cwd: string,
  options: { signal?: AbortSignal } = {},
): Promise<RunResult> {
  return run("gh", args, { cwd, signal: options.signal });
}

/** The same, but a non-zero exit is data rather than a throw. */
export async function tryGit(
  args: string[],
  cwd: string,
): Promise<RunResult & { code: number | null }> {
  return run("git", args, { cwd, tolerant: true });
}

export async function tryGh(
  args: string[],
  cwd: string,
): Promise<RunResult & { code: number | null }> {
  return run("gh", args, { cwd, tolerant: true });
}

/**
 * A sentence a person can act on, out of a CLI's last words.
 *
 * git and gh both write their real complaint on the last non-empty line and
 * everything before it is context; showing the whole stderr in a dialog puts
 * the useful part off the bottom. A few failures are common enough — and
 * cryptic enough — to be worth naming outright.
 */
function explain(stderr: string, stdout: string, command: string): string {
  const text = `${stderr}\n${stdout}`;
  if (/could not read Username|terminal prompts disabled|Authentication failed/i.test(text)) {
    return "GitHub refused the credentials. Run `gh auth login` in a terminal and try again.";
  }
  if (/Permission denied \(publickey\)/i.test(text)) {
    return "GitHub refused this machine's SSH key. Run `gh auth login` in a terminal and try again.";
  }
  if (/name already exists on this account/i.test(text)) {
    return "You already have a repository with that name. Pick another.";
  }
  if (/HTTP 403|Resource not accessible/i.test(text)) {
    return "Your GitHub token is missing a permission. Run `gh auth refresh -s repo` and try again.";
  }
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const last = lines.at(-1);
  return last ? last.replace(/^(error|fatal):\s*/i, "") : `\`${command}\` failed.`;
}
