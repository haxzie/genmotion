import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { addSearchDir, agentEnv, resolveExecutable } from "./detect";
import { installableHarness } from "./harness-catalog";

const run = promisify(execFile);

/**
 * Install a coding agent from npm, from the onboarding screen.
 *
 * Both harnesses we drive ship as a global npm package, and `npm install -g`
 * is exactly what their own install pages tell a user to type — so the button
 * runs that rather than sending someone to a docs page to copy a line back
 * into a terminal. Only the catalog's own packages are ever installed: the id
 * comes from the renderer, and `installableHarness` is what decides whether it
 * names anything at all.
 *
 * Deliberately not privileged. `installNpmCli` asks for an administrator
 * password because it has to move a file an older build of ours wrote; there
 * is no such legacy here, so a global folder the user can't write is reported
 * (with npm's own fix) rather than worked around with a root shell.
 */
export type HarnessInstallResult = { ok: true } | { ok: false; error: string };

/** Five minutes: `@openai/codex` pulls a platform binary down behind its install. */
const INSTALL_TIMEOUT_MS = 5 * 60_000;

function npmError(stderr: string): string {
  if (/EACCES|permission denied/i.test(stderr)) {
    return "npm can't write to its global folder. Fix npm's permissions (docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally), then try again.";
  }
  const line = stderr
    .split("\n")
    .map((l) => l.replace(/^npm (ERR!|error)\s*/, "").trim())
    .filter(Boolean)
    .at(-1);
  return line ? `npm install failed: ${line}` : "npm install failed.";
}

export async function installHarness(id: string): Promise<HarnessInstallResult> {
  const entry = installableHarness(id);
  if (!entry?.npmPackage) return { ok: false, error: `${id} can't be installed from here.` };

  const npm = await resolveExecutable("npm");
  if (!npm) {
    return { ok: false, error: "Needs Node 22 or newer. Install it from nodejs.org, then try again." };
  }

  try {
    await run(npm, ["install", "-g", `${entry.npmPackage}@latest`], {
      env: agentEnv(),
      timeout: INSTALL_TIMEOUT_MS,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (err) {
    return { ok: false, error: npmError(String((err as { stderr?: string })?.stderr ?? err)) };
  }

  // Where it just landed, which is not always somewhere `searchPath()` would
  // have guessed — without this the install succeeds and the row still says
  // the CLI isn't installed.
  const prefix = await run(npm, ["prefix", "-g"], { env: agentEnv(), timeout: 15_000 })
    .then(({ stdout }) => stdout.trim())
    .catch(() => null);
  if (prefix) addSearchDir(path.join(prefix, "bin"));

  return { ok: true };
}
