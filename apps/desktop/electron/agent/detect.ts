import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AgentAvailability } from "./types";

const run = promisify(execFile);

/**
 * GUI apps on macOS don't inherit a login shell's PATH, so a CLI installed by
 * a version manager or into ~/.local/bin is invisible unless we look there.
 */
function searchPath(): string {
  const extra = [
    `${process.env.HOME}/.local/bin`,
    `${process.env.HOME}/.bun/bin`,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
  ];
  return [...new Set([...(process.env.PATH ?? "").split(":"), ...extra])].filter(Boolean).join(":");
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
