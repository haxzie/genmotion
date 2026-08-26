import { app } from "electron";
import type { UpdateState } from "./shared";

/**
 * Keeping the app current.
 *
 * electron-updater does the work — read a manifest, compare versions, fetch
 * the zip, swap the bundle on quit — reading GitHub releases directly. The
 * repo is public, so that needs no credential, and the ~140MB comes off
 * GitHub's CDN rather than through our API. The feed is configured at build
 * time by electron-builder.yml; nothing here has to name it.
 *
 * Nothing downloads on its own. The check runs at launch and the result turns
 * into a badge; bytes only move once the user asks for them, because a 137MB
 * download nobody consented to is a surprise on a metered connection.
 */

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
 * A no-op in development: there is no packaged bundle to replace, and
 * electron-updater's own answer to that is to throw about a missing
 * `dev-app-update.yml`, which is noise rather than information.
 */
export async function checkForUpdate(): Promise<UpdateState> {
  if (!app.isPackaged) return state;
  try {
    set({ status: "checking" });
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
