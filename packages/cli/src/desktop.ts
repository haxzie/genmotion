import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { CliError } from "./output";

/**
 * `genmotion .`, `genmotion <folder>`, `genmotion clone <repo>` and a bare
 * `genmotion` open the desktop app — the contract of the shell shim the app
 * installs (`apps/desktop/electron/cli.ts`), kept so that installing the npm
 * CLI over it changes nothing for someone who already uses it. The flags are
 * the ones the app reads: `--gm-cwd=` and `--gm-clone=`.
 */
const APP_PATHS: Record<string, string[]> = {
  darwin: ["/Applications/GenMotion.app", path.join(os.homedir(), "Applications", "GenMotion.app")],
  win32: [path.join(process.env.LOCALAPPDATA ?? "", "Programs", "GenMotion", "GenMotion.exe")],
  linux: ["/opt/GenMotion/genmotion", "/usr/bin/genmotion-desktop"],
};

export function findDesktopApp(): string | null {
  return (APP_PATHS[process.platform] ?? []).find((p) => p && existsSync(p)) ?? null;
}

export async function openDesktop(args: { dir?: string; clone?: string }): Promise<void> {
  const app = findDesktopApp();
  if (!app) {
    throw new CliError("The GenMotion desktop app isn't installed.", {
      fix: "Install it from https://genmotion.dev/download — or stay in the terminal: npx genmotion init my-video",
    });
  }
  const flags: string[] = [];
  if (args.dir) {
    const dir = path.resolve(args.dir);
    if (dir === "/" || dir === os.homedir()) {
      throw new CliError(`Refusing to share ${dir} with the agent — pick a project folder`);
    }
    flags.push(`--gm-cwd=${dir}`);
  }
  if (args.clone) flags.push(`--gm-clone=${args.clone}`);

  const [cmd, argv] =
    process.platform === "darwin"
      ? ["open", flags.length ? ["-n", "-a", app, "--args", ...flags] : ["-a", app]]
      : [app, flags];
  spawn(cmd as string, argv as string[], { stdio: "ignore", detached: true }).unref();
}
