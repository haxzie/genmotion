import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdirSync } from "node:fs";
import path from "node:path";
import { bundledBinDir } from "../bundled-bin";
import type { AgentAvailability } from "./types";

const run = promisify(execFile);

/**
 * Where a Node version manager puts the global bins it installs.
 *
 * A GUI app sees none of this: the shell init that puts the active version on
 * PATH never runs. Enumerating the versions is the only way to find a CLI
 * installed with `npm i -g` under nvm or fnm, and a CLI we can't find is a
 * harness whose model list we can't read — which the picker then has to admit
 * to instead of naming models.
 *
 * Newest last is not something we can know from the directory name alone, so
 * all of them go on the path in reverse lexical order: `v22.x` before `v20.x`
 * is right far more often than not, and any of them can answer "which claude".
 */
function versionManagerBins(home: string): string[] {
  const roots = [
    path.join(home, ".nvm/versions/node"),
    path.join(home, "Library/Application Support/fnm/node-versions"),
    path.join(home, ".local/share/fnm/node-versions"),
  ];
  return roots.flatMap((root) => {
    try {
      return readdirSync(root)
        .sort()
        .reverse()
        .map((version) => path.join(root, version, "bin"));
    } catch {
      return [];
    }
  });
}

/** Scanned once: the version manager's directories don't move while we run. */
let cachedPath: string | null = null;

/**
 * Folders learned at runtime rather than guessed — today, the bin folder of
 * whichever npm installed a harness for us.
 *
 * A machine whose npm prefix is somewhere the list below never guesses would
 * otherwise install a CLI successfully and still be told it isn't there.
 */
const learned = new Set<string>();

/** Put a folder on the search path for every probe and child process after this. */
export function addSearchDir(dir: string): void {
  if (!dir || learned.has(dir)) return;
  learned.add(dir);
  cachedPath = null;
}

/**
 * GUI apps on macOS don't inherit a login shell's PATH, so a CLI installed by
 * a version manager or into ~/.local/bin is invisible unless we look there.
 *
 * `bundledBinDir()` is what puts this app's own ffmpeg on the agent's shell —
 * both harnesses now have Bash, and without this a scene-processing request
 * only works on a machine where the user happens to have ffmpeg installed
 * themselves. Prepended, not appended: the shipped copy should win over a
 * stray system one so the model always gets the version this app was built
 * against.
 */
function searchPath(): string {
  if (cachedPath) return cachedPath;
  const home = process.env.HOME ?? "";
  const extra = [
    `${home}/.local/bin`,
    // Claude Code's older native install location, still what a machine that
    // installed it before the move to ~/.local/bin has.
    `${home}/.claude/local`,
    `${home}/.bun/bin`,
    `${home}/.volta/bin`,
    `${home}/.asdf/shims`,
    `${home}/.npm-global/bin`,
    ...versionManagerBins(home),
    ...learned,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
  ];
  cachedPath = [...new Set([bundledBinDir(), ...(process.env.PATH ?? "").split(":"), ...extra])]
    .filter(Boolean)
    .join(":");
  return cachedPath;
}

async function probe(command: string): Promise<{ version: string | null }> {
  try {
    const { stdout } = await run(command, ["--version"], {
      env: { ...process.env, PATH: searchPath() },
      timeout: 8000,
    });
    return { version: stdout.trim().split("\n")[0] ?? null };
  } catch {
    return { version: null };
  }
}

/** What the user could pick during onboarding, and why anything is unavailable. */
export async function detectAgents(): Promise<AgentAvailability[]> {
  const [claude, codex] = await Promise.all([probe("claude"), probe("codex")]);
  return [
    {
      id: "claude-code",
      label: "Claude Code",
      installed: claude.version !== null,
      version: claude.version,
      detail: claude.version ? null : "Not found on PATH. Install Claude Code, then sign in with /login.",
    },
    {
      id: "codex",
      label: "Codex",
      installed: codex.version !== null,
      version: codex.version,
      detail: codex.version ? null : "Not found on PATH. Install the Codex CLI, then run codex login.",
    },
  ];
}

/** Make the detected CLIs reachable from the app's own child processes. */
export function agentEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: searchPath() };
}

/**
 * Absolute path to a CLI on the user's machine.
 *
 * The Agent SDK ships its own copy of the Claude Code binary, but we bundle the
 * SDK's JavaScript into the main process, which severs the relative path it
 * uses to find that copy. Pointing it at the user's own installation is both
 * the fix and the intent: their binary is the one that is signed in.
 */
export async function resolveExecutable(command: string): Promise<string | null> {
  try {
    const { stdout } = await run("which", [command], {
      env: { ...process.env, PATH: searchPath() },
      timeout: 5000,
    });
    const resolved = stdout.trim().split("\n")[0];
    return resolved || null;
  } catch {
    return null;
  }
}
