import path from "node:path";
import os from "node:os";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { spawn } from "node:child_process";
import { CliError } from "./output";

/**
 * `genmotion .`, `genmotion <folder>`, `genmotion clone <repo>` and a bare
 * `genmotion` open the desktop app. This package is the app's `genmotion`
 * command: the app and its installer install it from npm rather than writing
 * a script of their own (`apps/desktop/electron/cli-install.ts`), so the
 * contract the old script had lives here. The flags are the ones the app
 * reads: `--gm-cwd=` and `--gm-clone=`.
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
    // The physical path, as the old script's `pwd -P` gave: the app stores a
    // shared folder that way, so /tmp and /private/tmp are one folder.
    const dir = realpathSync(path.resolve(args.dir));
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

/** The installed app's version, from its bundle, when there is one to read. */
export function desktopAppVersion(app: string | null = findDesktopApp()): string | null {
  if (!app || process.platform !== "darwin") return null;
  try {
    const plist = readFileSync(path.join(app, "Contents", "Info.plist"), "utf8");
    return /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** What the app and older installers wrote to /usr/local/bin before this package was the command. */
export function isLegacyLauncher(file: string): boolean {
  try {
    const text = readFileSync(file, "utf8");
    return text.startsWith("#!/bin/sh") && text.includes("# gm-app:");
  } catch {
    return false;
  }
}
