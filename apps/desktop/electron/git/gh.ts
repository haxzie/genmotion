import os from "node:os";
import { resolveExecutable } from "../agent/detect";
import { tryGh } from "./run";
import type { GitCliStatus } from "../shared";

/**
 * Whether this machine can talk to GitHub at all.
 *
 * Three answers, and the dialog says something different for each: the CLI
 * isn't installed, it's installed but signed out, or it's ready. Finding out
 * costs two subprocesses, so the result is cached — but only briefly, because
 * the fix for the first two answers happens in a terminal while the app is
 * still open, and a Retry button that reports a stale "still missing" is worse
 * than no Retry button.
 */

/** Long enough that a button rendering twice doesn't spawn twice. */
const TTL_MS = 5000;

let cached: { at: number; value: GitCliStatus } | null = null;

export function forgetCliStatus(): void {
  cached = null;
}

export async function ghStatus({ fresh = false } = {}): Promise<GitCliStatus> {
  if (fresh) cached = null;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const value = await probe();
  cached = { at: Date.now(), value };
  return value;
}

async function probe(): Promise<GitCliStatus> {
  const [git, gh] = await Promise.all([resolveExecutable("git"), resolveExecutable("gh")]);
  if (!git) return { git: false, gh: "missing" };
  if (!gh) return { git: true, gh: "missing" };

  // `gh` needs a working directory that exists; nothing about auth is
  // project-scoped, so the home directory is as good as anywhere.
  const home = os.homedir();
  const auth = await tryGh(["auth", "status", "--hostname", "github.com"], home).catch(() => null);
  if (!auth || auth.code !== 0) return { git: true, gh: "logged-out" };

  const user = await tryGh(["api", "user", "--jq", ".login"], home).catch(() => null);
  const login = user?.code === 0 ? user.stdout.trim() : undefined;
  return { git: true, gh: "ready", ...(login ? { login } : {}) };
}

/**
 * What to tell the user, and the command that fixes it.
 *
 * Kept next to the probe rather than in the dialog so that the instructions
 * can't drift from what was actually tested for.
 */
export function cliGuidance(status: GitCliStatus): { title: string; steps: string[] } | null {
  if (!status.git) {
    return {
      title: "git isn't installed",
      steps: ["xcode-select --install"],
    };
  }
  if (status.gh === "missing") {
    return {
      title: "GenMotion publishes through the GitHub CLI",
      steps: ["brew install gh", "gh auth login"],
    };
  }
  if (status.gh === "logged-out") {
    return {
      title: "The GitHub CLI isn't signed in",
      steps: ["gh auth login"],
    };
  }
  return null;
}
