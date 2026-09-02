import { app } from "electron";
import type { UpdateState } from "./shared";

/**
 * Keeping the app current.
 *
 * Split on purpose, because the two halves want different sources.
 *
 * The *check* reads `latest.json` off our own CDN — the same manifest the
 * download page reads, written by the mirror job. It is one small object on a
 * fast edge rather than a release feed, it means the app and the website can
 * never disagree about what the current version is, and unlike electron-updater
 * it answers in development too, where there is no packaged bundle.
 *
 * The *download and install* stay with electron-updater against GitHub. It
 * needs `latest-mac.yml`, the zip and the blockmaps to do a differential
 * update, and the mirror deliberately carries none of those — only the DMG a
 * human downloads. Pointing the updater at the mirror would mean it had
 * nothing to read.
 *
 * The ordering between the two is what makes the split safe: the mirror job
 * runs after the GitHub release is published, so `latest.json` can only ever
 * name a version GitHub already has. The check cannot promise a build the
 * downloader is then unable to fetch.
 *
 * Nothing downloads on its own. The check runs at launch and the result turns
 * into a badge; bytes only move once the user asks for them, because a 137MB
 * download nobody consented to is a surprise on a metered connection.
 */

/** Same default as the API and the web app, so one variable moves all three. */
const MIRROR_URL = (
  process.env.GM_RELEASE_MIRROR_URL ?? "https://assets.genmotion.dev/desktop"
).replace(/\/$/, "");

/**
 * Whether `candidate` is a later release than `current`.
 *
 * Numeric x.y.z only, which is every version this app has ever had. Any
 * pre-release suffix is dropped rather than ordered, so `0.1.0-beta.1` reads as
 * `0.1.0` and does not count as newer than the released `0.1.0` — the safe
 * direction to be wrong in, since the alternative offers people a build that
 * was never published.
 */
function isNewer(candidate: string, current: string): boolean {
  const parse = (v: string) =>
    v.split("-")[0]!.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(candidate);
  const b = parse(current);
  for (let i = 0; i < 3; i++) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left > right;
  }
  return false;
}

/** The version the mirror is advertising, or null if it cannot be read. */
async function mirroredVersion(): Promise<string | null> {
  const res = await fetch(`${MIRROR_URL}/latest.json`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { version?: unknown };
  return typeof body.version === "string" && body.version ? body.version : null;
}

type Listener = (state: UpdateState) => void;

const listeners = new Set<Listener>();
let state: UpdateState = { status: "idle" };

function set(next: UpdateState): void {
  state = next;
  for (const listener of listeners) listener(state);
}

export function updateState(): UpdateState {
  return state;
}

export function onUpdateChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The updater, loaded on first use.
 *
 * electron-updater reads `app.isPackaged` and app paths as it initialises, so
 * importing it at module scope would run that work — and log its complaints —
 * in dev, where there is nothing to update.
 */
async function loadUpdater() {
  const { autoUpdater } = await import("electron-updater");
  autoUpdater.autoDownload = false;
  // The swap happens on quit. Doing it under a running app means replacing the
  // bundle that is executing, which macOS tolerates far less well than it looks.
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  autoUpdater.on("update-available", (info) => {
    set({ status: "available", version: info.version });
  });
  autoUpdater.on("update-not-available", () => {
    set({ status: "idle" });
  });
  autoUpdater.on("download-progress", (progress) => {
    set({
      status: "downloading",
      version: state.status === "idle" ? "" : (state as { version?: string }).version ?? "",
      percent: Math.round(progress.percent),
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    set({ status: "ready", version: info.version });
  });
  autoUpdater.on("error", (err) => {
    set({ status: "error", message: err instanceof Error ? err.message : String(err) });
  });

  return autoUpdater;
}

let updater: Awaited<ReturnType<typeof loadUpdater>> | null = null;
async function getUpdater() {
  updater ??= await loadUpdater();
  return updater;
}

/**
 * Ask whether a newer build exists.
 *
 * The mirror answers first and answers in development too, which is the only
 * reason the update surfaces can be looked at without cutting a release.
 * electron-updater is the fallback for the case the mirror job failed and
 * `latest.json` is behind the release it describes — and it stays a no-op when
 * unpackaged, where its own answer is to throw about a missing
 * `dev-app-update.yml`, which is noise rather than information.
 */
export async function checkForUpdate(): Promise<UpdateState> {
  set({ status: "checking" });

  try {
    const version = await mirroredVersion();
    if (version) {
      set(
        isNewer(version, app.getVersion())
          ? { status: "available", version }
          : { status: "idle" },
      );
      return state;
    }
  } catch {
    // Offline, or the mirror is having a moment. GitHub gets a turn.
  }

  if (!app.isPackaged) {
    set({ status: "idle" });
    return state;
  }
  try {
    const autoUpdater = await getUpdater();
    await autoUpdater.checkForUpdates();
  } catch (err) {
    // A failed check is not worth a dialog. The app works; it is simply not
    // sure whether it is the newest one.
    set({ status: "error", message: err instanceof Error ? err.message : String(err) });
  }
  return state;
}

export async function downloadUpdate(): Promise<UpdateState> {
  if (!app.isPackaged) return state;
  try {
    const autoUpdater = await getUpdater();
    // The mirror check tells electron-updater nothing, so it has no manifest
    // and no idea what to fetch. Reading its own feed first is what makes the
    // download possible at all — without this it throws on a state that only
    // ever gets set from somewhere else.
    await autoUpdater.checkForUpdates();
    await autoUpdater.downloadUpdate();
  } catch (err) {
    set({ status: "error", message: err instanceof Error ? err.message : String(err) });
  }
  return state;
}

/**
 * Quit and come back on the new version.
 *
 * Only meaningful once a download has finished — calling it earlier quits the
 * app and installs nothing, which from the user's side is the app closing for
 * no reason.
 */
export async function installUpdate(): Promise<void> {
  if (state.status !== "ready") return;
  const autoUpdater = await getUpdater();
  setImmediate(() => autoUpdater.quitAndInstall());
}
