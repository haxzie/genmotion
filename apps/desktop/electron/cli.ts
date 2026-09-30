import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { app } from "electron";
import type { CliStatus } from "./shared";
import { addSessionRoot } from "./agent/read-roots";

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
 * The shim is a tiny shell script rather than a symlink into the bundle. A
 * symlink would leave `open` to guess at arguments, and a script is also what
 * lets `genmotion .` resolve the shell's own working directory — which the app
 * itself has no way to see.
 */

const run = promisify(execFile);

/** How a launch tells the app which folder it came from. */
const FLAG = "--gm-cwd=";

/** How `genmotion clone <repo>` tells the app what to clone. */
const CLONE_FLAG = "--gm-clone=";

/** Where the command goes. On PATH by default on macOS, unlike ~/.local/bin. */
const BIN_DIR = "/usr/local/bin";
const BIN_PATH = path.join(BIN_DIR, "genmotion");

/** Marks a script as ours, and says which app it points at. */
const MARKER = "# gm-app:";

/**
 * What the shim can do, bumped whenever it learns a new subcommand.
 *
 * Without this an installed shim from the same app bundle reports itself
 * current — the app path hasn't changed — and the user never finds out that
 * `genmotion clone` exists on their machine but not in their `/usr/local/bin`.
 */
const CONTRACT = 3;
const CONTRACT_MARKER = "# gm-cli:";

/**
 * Where `genmotion upgrade` goes.
 *
 * Hardcoded rather than taken from the build's own web URL: a development
 * build points at localhost, and upgrading from there would install whatever
 * happens to be on this machine. The script it fetches is `scripts/install.sh`
 * in the repo — which writes the same shim this file generates, so a change to
 * one belongs in the other.
 */
const INSTALL_URL = "https://genmotion.dev/install.sh";

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

/** The app bundle a shim should open, or null when this build has none. */
function bundlePath(): string | null {
  if (!app.isPackaged) return null;
  // …/GenMotion.app/Contents/MacOS/GenMotion → …/GenMotion.app
  const exe = app.getPath("exe");
  const marker = `${path.sep}Contents${path.sep}MacOS${path.sep}`;
  const at = exe.indexOf(marker);
  return at === -1 ? null : exe.slice(0, at);
}

/** Single-quote a path for the shell, the only quoting a script here needs. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * The script itself.
 *
 * Packaged, it hands the folder to `open`, which is what starts the app or
 * reaches the copy already running. Unpackaged — a development build — there
 * is no bundle to open, so it runs the Electron binary against the source
 * tree; the same command then works while the app is being worked on.
 */
function script(): string {
  const bundle = bundlePath();
  const target = bundle ?? app.getPath("exe");
  const launch = bundle
    ? {
        withDir: `exec open -n -a ${shellQuote(bundle)} --args "${FLAG}$DIR"`,
        withClone: `exec open -n -a ${shellQuote(bundle)} --args "${CLONE_FLAG}$2"`,
        bare: `exec open -a ${shellQuote(bundle)}`,
      }
    : {
        withDir: `exec ${shellQuote(app.getPath("exe"))} ${shellQuote(app.getAppPath())} "${FLAG}$DIR"`,
        withClone: `exec ${shellQuote(app.getPath("exe"))} ${shellQuote(app.getAppPath())} "${CLONE_FLAG}$2"`,
        bare: `exec ${shellQuote(app.getPath("exe"))} ${shellQuote(app.getAppPath())}`,
      };

  return `#!/bin/sh
# GenMotion ${app.getVersion()} — command line launcher.
# Written by the app. Reinstall it from the account menu if it stops working.
${MARKER} ${target}
${CONTRACT_MARKER} ${CONTRACT}

case "$1" in
  upgrade)
    exec /bin/sh -c 'curl -fsSL ${INSTALL_URL} | /bin/sh'
    ;;
  clone)
    if [ -z "$2" ]; then
      echo "usage: genmotion clone <owner/name | github url>" >&2
      exit 1
    fi
    ${launch.withClone}
    ;;
  init|create|new|dev|studio|preview|render|still|snapshot|check|lint|validate|info|compositions|scene|templates|mcp|skills|browser|doctor)
    # The terminal workflow lives in the npm CLI; hand it the whole command.
    # npx prefers the project's own node_modules copy when there is one.
    exec npx -y genmotion "$@"
    ;;
  -h|--help)
    echo "usage: genmotion [folder]"
    echo
    echo "  genmotion             open GenMotion"
    echo "  genmotion .           open GenMotion and share this folder with the agent"
    echo "  genmotion <path>      the same, for another folder"
    echo "  genmotion clone <repo>  clone a GitHub repository and open it"
    echo "  genmotion upgrade     install the latest version"
    echo
    echo "  genmotion init|dev|render|check|still|mcp …   the terminal workflow (npx genmotion --help)"
    exit 0
    ;;
  -v|--version)
    echo "${app.getVersion()}"
    exit 0
    ;;
esac

# -P so the path is the physical one, which is the shape the app stores a
# shared folder as: /tmp and /private/tmp have to end up as the same folder.
if [ -n "$1" ]; then
  DIR=$(cd -- "$1" 2>/dev/null && pwd -P) || {
    echo "genmotion: no such folder: $1" >&2
    exit 1
  }
  # The app refuses these too — a grant is meant to name a folder, and the
  # whole disk or home directory names every credential in it. Saying so here
  # is the difference between a rule and a command that quietly did nothing.
  if [ "$DIR" = "/" ] || [ "$DIR" = "$HOME" ]; then
    echo "genmotion: not sharing your whole home folder or disk — opening without it." >&2
    ${launch.bare}
  fi
  ${launch.withDir}
fi

${launch.bare}
`;
}

export async function cliStatus(): Promise<CliStatus> {
  const base = { supported: process.platform === "darwin", path: BIN_PATH };
  if (!base.supported) return { ...base, installed: false, current: false };

  const existing = await fs.readFile(BIN_PATH, "utf8").catch(() => null);
  if (existing === null) return { ...base, installed: false, current: false };

  const target = bundlePath() ?? app.getPath("exe");
  return {
    ...base,
    installed: true,
    // An app moved to a different folder, or a shim from a build that is no
    // longer there, leaves a command that opens nothing. Say so rather than
    // reporting it installed — and likewise for a shim that predates a
    // subcommand this version of the app answers.
    current:
      existing.includes(`${MARKER} ${target}\n`) &&
      existing.includes(`${CONTRACT_MARKER} ${CONTRACT}\n`),
  };
}

/**
 * Write the command, asking for an administrator password only if it turns out
 * to be needed.
 *
 * `/usr/local/bin` is writable without a prompt on plenty of Macs — anywhere
 * Homebrew has been near — so trying first and escalating on refusal is one
 * fewer password dialog than assuming the worst.
 */
export async function installCli(): Promise<CliStatus> {
  if (process.platform !== "darwin") {
    return {
      supported: false,
      installed: false,
      current: false,
      path: BIN_PATH,
      error: "The genmotion command is macOS-only for now.",
    };
  }

  const body = script();
  try {
    await fs.mkdir(BIN_DIR, { recursive: true });
    await fs.writeFile(BIN_PATH, body, { mode: 0o755 });
  } catch {
    try {
      await installWithAdmin(body);
    } catch (err) {
      return {
        supported: true,
        installed: false,
        current: false,
        path: BIN_PATH,
        error: cancelled(err)
          ? "Installation needs an administrator password."
          : err instanceof Error
            ? err.message
            : String(err),
      };
    }
  }
  return cliStatus();
}

/** Did the user dismiss the password dialog, rather than something failing? */
function cancelled(err: unknown): boolean {
  return String((err as { message?: string })?.message ?? err).includes("-128");
}

/**
 * The privileged path: stage the script somewhere writable, then move it in.
 *
 * The whole shell string is one `do shell script`, so the password is asked
 * for once rather than once per command.
 */
async function installWithAdmin(body: string): Promise<void> {
  const staged = path.join(os.tmpdir(), `genmotion-cli-${Date.now()}`);
  await fs.writeFile(staged, body, { mode: 0o755 });
  const command = [
    `mkdir -p ${shellQuote(BIN_DIR)}`,
    `cp ${shellQuote(staged)} ${shellQuote(BIN_PATH)}`,
    `chmod 755 ${shellQuote(BIN_PATH)}`,
  ].join(" && ");
  // AppleScript string, so quotes and backslashes are escaped for *it*, not
  // for the shell — the shell quoting already happened above.
  const applescript = `do shell script "${command.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}" with administrator privileges`;
  try {
    await run("osascript", ["-e", applescript]);
  } finally {
    await fs.rm(staged, { force: true }).catch(() => null);
  }
}
