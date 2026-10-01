import path from "node:path";

/**
 * The `genmotion` command, installed from npm.
 *
 * The app used to write its own shell script to /usr/local/bin/genmotion. The
 * npm package `@genmotion/cli` installs a `genmotion` command that does
 * everything the script did (`genmotion .`, `clone`, a bare `genmotion` open
 * this app) plus the whole terminal workflow, and the two collided: `npm i -g
 * genmotion` failed on EEXIST wherever npm's prefix was /usr/local, and which
 * one answered depended on PATH order. So there is one command now, npm's, and
 * this module installs it and clears away the scripts older builds wrote.
 *
 * Electron-free, with every side effect behind `CliDeps`, so the sequence is
 * testable without a Mac, an npm or a password prompt.
 */

/** What every script an older build (or install.sh) wrote carries. */
export const LEGACY_MARKER = "# gm-app:";

export function isLegacyScript(contents: string | null): boolean {
  return contents !== null && contents.startsWith("#!/bin/sh") && contents.includes(LEGACY_MARKER);
}

/** A `genmotion` on PATH that resolves into the npm package is the npm CLI. */
export function isNpmCli(realPath: string): boolean {
  return realPath.split(path.sep).join("/").includes("/node_modules/@genmotion/cli/");
}

export interface CliDeps {
  /** Runs a program with the app's search PATH. Rejects with the process's stderr on failure. */
  exec(command: string, args: string[], options?: { timeout?: number }): Promise<{ stdout: string; stderr: string }>;
  readFile(file: string): Promise<string | null>;
  realpath(file: string): Promise<string>;
  rename(from: string, to: string): Promise<void>;
  remove(file: string): Promise<void>;
  /** One shell command run with administrator rights, for root-owned bin folders. */
  admin(command: string): Promise<void>;
}

export interface CommandOnPath {
  path: string;
  kind: "npm" | "legacy" | "other";
}

export interface CliState {
  npm: string | null;
  /** Every `genmotion` on PATH, first one first: that one is what a shell runs. */
  commands: CommandOnPath[];
  version: string | null;
}

async function which(deps: CliDeps, command: string, all = false): Promise<string[]> {
  try {
    const { stdout } = await deps.exec("which", all ? ["-a", command] : [command], { timeout: 5000 });
    return [...new Set(stdout.split("\n").map((l) => l.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

export async function readCliState(deps: CliDeps): Promise<CliState> {
  const [npm] = await which(deps, "npm");
  const commands: CommandOnPath[] = [];
  for (const file of await which(deps, "genmotion", true)) {
    const real = await deps.realpath(file).catch(() => file);
    const kind = isNpmCli(real) ? "npm" : isLegacyScript(await deps.readFile(file)) ? "legacy" : "other";
    commands.push({ path: file, kind });
  }
  const first = commands[0];
  let version: string | null = null;
  if (first?.kind === "npm") {
    version = await deps
      .exec(first.path, ["--version"], { timeout: 10_000 })
      .then(({ stdout }) => stdout.trim().split("\n")[0] || null)
      .catch(() => null);
  }
  return { npm: npm ?? null, commands, version };
}

export type InstallResult =
  | { ok: true }
  | { ok: false; error: string; needsNode?: boolean };

/** Move or delete inside a bin folder, asking for a password only when the plain call is refused. */
async function privileged(deps: CliDeps, plain: () => Promise<void>, shell: string): Promise<void> {
  try {
    await plain();
  } catch {
    await deps.admin(shell);
  }
}

const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

function npmError(stderr: string, prefix: string): string {
  if (/EACCES|permission denied/i.test(stderr)) {
    return `npm can't write to its global folder (${prefix}). Fix npm's permissions (docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally), then try again.`;
  }
  const line = stderr
    .split("\n")
    .map((l) => l.replace(/^npm (ERR!|error)\s*/, "").trim())
    .filter(Boolean)
    .at(-1);
  return line ? `npm install failed: ${line}` : "npm install failed.";
}

/**
 * `npm install -g @genmotion/cli@latest`, with the old script out of its way.
 *
 * When npm's bin folder is the one the script lives in (npm's prefix is
 * /usr/local), npm refuses to replace a file it didn't write, so the script is
 * moved aside first and put back if the install fails: the user never ends up
 * with no command at all. Once npm's command is in, every old script left on
 * PATH is deleted, or it could keep answering ahead of npm's.
 */
export async function installNpmCli(deps: CliDeps): Promise<InstallResult> {
  const before = await readCliState(deps);
  if (!before.npm) {
    return { ok: false, needsNode: true, error: "Needs Node 22 or newer. Install it from nodejs.org, then try again." };
  }

  let prefix: string;
  try {
    prefix = (await deps.exec(before.npm, ["prefix", "-g"], { timeout: 15_000 })).stdout.trim();
  } catch (err) {
    return { ok: false, error: npmError(String((err as { stderr?: string })?.stderr ?? err), "npm prefix") };
  }
  const target = path.join(prefix, "bin", "genmotion");
  const aside = `${target}.gm-legacy`;
  const blocking = isLegacyScript(await deps.readFile(target));

  if (blocking) {
    try {
      await privileged(deps, () => deps.rename(target, aside), `mv -f ${quote(target)} ${quote(aside)}`);
    } catch (err) {
      // -128 is the password dialog being dismissed, not something failing.
      return {
        ok: false,
        error: String(err).includes("-128")
          ? "Installation needs an administrator password."
          : `Couldn't move the old command at ${target} out of npm's way.`,
      };
    }
  }

  try {
    await deps.exec(before.npm, ["install", "-g", "@genmotion/cli@latest"], { timeout: 5 * 60_000 });
  } catch (err) {
    if (blocking) {
      await privileged(deps, () => deps.rename(aside, target), `mv -f ${quote(aside)} ${quote(target)}`).catch(() => null);
    }
    return { ok: false, error: npmError(String((err as { stderr?: string })?.stderr ?? err), prefix) };
  }

  const leftovers = [
    ...(blocking ? [aside] : []),
    ...before.commands.filter((c) => c.kind === "legacy" && c.path !== target).map((c) => c.path),
  ];
  for (const file of leftovers) {
    await privileged(deps, () => deps.remove(file), `rm -f ${quote(file)}`).catch(() => null);
  }
  return { ok: true };
}
