import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CliStatus } from "./shared";
import { addSessionRoot } from "./agent/read-roots";
import { agentEnv } from "./agent/detect";
import { installNpmCli, readCliState, type CliDeps } from "./cli-install";

/**
 * The `genmotion` shell command, and the folder a launch came from.
 *
 * Two halves of one feature. A user working in a folder — a brief, a brand
 * kit, a repo they want a video about — types `genmotion .` there, and the app
 * comes up already knowing where they are: the folder is shared with the agent
 * and named in its prompt as the place the session started. Without the
 * command the same thing takes a launch, a project, and a trip through a
 * folder picker.
 *
 * The command comes from npm's `@genmotion/cli` (see cli-install.ts for why there is no
 * longer a script of the app's own). It resolves the shell's working
 * directory, which the app itself has no way to see, and launches the app
 * with the flags below.
 */

const run = promisify(execFile);

/** How a launch tells the app which folder it came from. */
const FLAG = "--gm-cwd=";

/** How `genmotion clone <repo>` tells the app what to clone. */
const CLONE_FLAG = "--gm-clone=";

/**
 * The folder this launch came from, for as long as the app runs.
 *
 * Session state, deliberately: "the user started here" is true of a launch,
 * not of a project, and persisting it would have a project claiming next week
 * that it was opened from a folder nobody has touched since.
 */
let launchDir: string | null = null;

/** `--gm-cwd=…` out of a process's arguments, if it carried one. */
export function launchDirFromArgv(argv: string[]): string | null {
  const found = argv.find((arg) => arg.startsWith(FLAG));
  if (!found) return null;
  const dir = found.slice(FLAG.length).trim();
  return dir ? path.resolve(dir) : null;
}

/** `--gm-clone=…` out of a process's arguments, if it carried one. */
export function cloneSourceFromArgv(argv: string[]): string | null {
  const found = argv.find((arg) => arg.startsWith(CLONE_FLAG));
  if (!found) return null;
  return found.slice(CLONE_FLAG.length).trim() || null;
}

export function setLaunchDir(dir: string | null): void {
  launchDir = dir;
  // Launching from a folder *is* sharing it: it goes in the same list the
  // Folders control shows, so it is visible and revocable from the moment the
  // window opens, and applied to whichever project is opened next.
  if (dir) void addSessionRoot(dir).catch(() => null);
}

export function getLaunchDir(): string | null {
  return launchDir;
}

const deps: CliDeps = {
  exec: async (command, args, options) => {
    try {
      return await run(command, args, { env: agentEnv(), timeout: options?.timeout, maxBuffer: 8 * 1024 * 1024 });
    } catch (err) {
      // Keep stderr: it is what says why npm failed.
      throw Object.assign(new Error(String((err as Error).message)), { stderr: (err as { stderr?: string }).stderr ?? "" });
    }
  },
  readFile: (file) => fs.readFile(file, "utf8").catch(() => null),
  realpath: (file) => fs.realpath(file),
  rename: (from, to) => fs.rename(from, to),
  remove: (file) => fs.rm(file, { force: true }),
  admin: async (command) => {
    if (process.platform !== "darwin") throw new Error("Needs administrator rights.");
    // AppleScript string, so quotes and backslashes are escaped for *it*, not
    // for the shell; the shell quoting already happened in cli-install.ts.
    const applescript = `do shell script "${command.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}" with administrator privileges`;
    await run("osascript", ["-e", applescript]);
  },
};

export async function cliStatus(): Promise<CliStatus> {
  const state = await readCliState(deps);
  const first = state.commands[0];
  const legacy = state.commands.some((c) => c.kind === "legacy");
  return {
    // Found with `which`, which Windows doesn't have; the app ships for macOS.
    supported: process.platform !== "win32",
    installed: state.commands.some((c) => c.kind === "npm" || c.kind === "legacy"),
    // Ready means a shell gets npm's command: an old script ahead of it on
    // PATH would still answer, and is what "Update" clears away.
    current: first?.kind === "npm",
    path: first?.path ?? "genmotion",
    version: state.version ?? undefined,
    needsNode: !state.npm,
    legacy,
  };
}

/** Install (or update) `@genmotion/cli`, replacing any script an older build wrote. */
export async function installCli(): Promise<CliStatus> {
  const result = await installNpmCli(deps);
  const status = await cliStatus();
  return result.ok ? status : { ...status, error: result.error };
}
