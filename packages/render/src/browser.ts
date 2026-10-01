import os from "node:os";
import path from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { chromium, type Browser } from "playwright-core";

export type GlMode = "swiftshader" | "gpu";

export interface LaunchOptions {
  /** Explicit browser binary. Otherwise `findChromium()` picks one. */
  executablePath?: string;
  /**
   * `swiftshader` (the default) renders WebGL on the CPU: slower, but the same
   * pixels on every machine, which is what makes a render reproducible and
   * lets it run on a CI box with no GPU at all. `gpu` uses the real one.
   */
  gl?: GlMode;
}

export class BrowserNotFoundError extends Error {
  readonly fix = "npx @genmotion/cli browser install";
  constructor(searched: string[]) {
    super(
      `No Chromium found. Run \`npx @genmotion/cli browser install\`, or point GENMOTION_CHROMIUM at a Chrome/Chromium binary.\nSearched:\n${searched.map((p) => `  ${p}`).join("\n")}`,
    );
  }
}

/** Where Playwright keeps downloaded browsers, honouring its own env var. */
export function playwrightCacheDir(): string {
  const fromEnv = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (fromEnv && fromEnv !== "0") return fromEnv;
  const home = os.homedir();
  if (process.platform === "darwin") return path.join(home, "Library", "Caches", "ms-playwright");
  if (process.platform === "win32") return path.join(process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local"), "ms-playwright");
  return path.join(process.env.XDG_CACHE_HOME ?? path.join(home, ".cache"), "ms-playwright");
}

/** Every binary inside one Playwright browser folder worth trying, in order. */
function playwrightBinaries(folder: string): string[] {
  const { platform, arch } = process;
  const mac = arch === "arm64" ? "mac-arm64" : "mac-x64";
  if (folder.startsWith("chromium_headless_shell")) {
    if (platform === "darwin") return [`chrome-headless-shell-${mac}/chrome-headless-shell`, "chrome-mac/headless_shell"];
    if (platform === "win32") return ["chrome-headless-shell-win64/chrome-headless-shell.exe", "chrome-win/headless_shell.exe"];
    return ["chrome-headless-shell-linux64/chrome-headless-shell", "chrome-linux/headless_shell"];
  }
  if (platform === "darwin") {
    return [
      `chrome-${mac}/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
      "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
    ];
  }
  if (platform === "win32") return ["chrome-win64/chrome.exe", "chrome-win/chrome.exe"];
  return ["chrome-linux64/chrome", "chrome-linux/chrome"];
}

const SYSTEM_BROWSERS: Record<string, string[]> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ],
};

/**
 * The browser a render launches, in order of preference:
 *
 * 1. `GENMOTION_CHROMIUM` (or `PUPPETEER_EXECUTABLE_PATH`)
 * 2. a Playwright download — headless shell first (faster, smaller), newest
 *    revision first
 * 3. an installed Chrome/Chromium/Edge
 */
export function findChromium(): { path: string | null; searched: string[] } {
  const searched: string[] = [];
  const check = (candidate: string | undefined): string | null => {
    if (!candidate) return null;
    searched.push(candidate);
    return existsSync(candidate) ? candidate : null;
  };

  for (const env of ["GENMOTION_CHROMIUM", "PUPPETEER_EXECUTABLE_PATH"]) {
    const found = check(process.env[env]);
    if (found) return { path: found, searched };
  }

  const cache = playwrightCacheDir();
  let folders: string[] = [];
  try {
    folders = readdirSync(cache);
  } catch {
    searched.push(`${cache} (missing)`);
  }
  const revision = (name: string) => Number(name.split("-").pop()) || 0;
  const ranked = [
    ...folders.filter((f) => f.startsWith("chromium_headless_shell-")).sort((a, b) => revision(b) - revision(a)),
    ...folders.filter((f) => /^chromium-\d+$/.test(f)).sort((a, b) => revision(b) - revision(a)),
  ];
  for (const folder of ranked) {
    for (const binary of playwrightBinaries(folder)) {
      const found = check(path.join(cache, folder, binary));
      if (found) return { path: found, searched };
    }
  }

  // The revision this playwright-core release expects, wherever it resolves
  // its cache to — covers layouts the scan above doesn't know.
  try {
    const found = check(chromium.executablePath());
    if (found) return { path: found, searched };
  } catch {
    // No registry entry for this platform.
  }

  for (const candidate of SYSTEM_BROWSERS[process.platform] ?? []) {
    const found = check(candidate);
    if (found) return { path: found, searched };
  }
  return { path: null, searched };
}

/**
 * Downloads Chromium's headless shell into Playwright's cache. Output goes to
 * stderr: stdout may be an MCP channel or a `--json` result.
 */
export async function installChromium(): Promise<string | null> {
  const require = createRequire(import.meta.url);
  const cli = path.join(path.dirname(require.resolve("playwright-core/package.json")), "cli.js");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "install", "chromium-headless-shell"], { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.pipe(process.stderr);
    child.stderr.pipe(process.stderr);
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Chromium download failed (exit ${code})`))));
  });
  return findChromium().path;
}

let installing: Promise<string | null> | null = null;

export async function launchBrowser(options: LaunchOptions = {}): Promise<Browser> {
  let executablePath = options.executablePath;
  if (!executablePath) {
    let found = findChromium();
    // First render on a new machine: fetch the browser rather than fail, as
    // long as nobody opted out (CI images that bring their own set this).
    if (!found.path && !process.env.GENMOTION_NO_DOWNLOAD) {
      process.stderr.write("No Chromium found — downloading the headless shell (first run only, ~100MB)…\n");
      installing ??= installChromium().finally(() => {
        installing = null;
      });
      const installed = await installing.catch(() => null);
      if (installed) found = { path: installed, searched: found.searched };
    }
    if (!found.path) throw new BrowserNotFoundError(found.searched);
    executablePath = found.path;
  }
  const gl = options.gl ?? "swiftshader";
  return chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--font-render-hinting=none",
      "--force-color-profile=srgb",
      ...(gl === "swiftshader"
        ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
        : ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=default"]),
    ],
  });
}
