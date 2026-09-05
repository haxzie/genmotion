// Must be first: it configures where esbuild finds its executable, and the
// project package pulls esbuild in as soon as it is imported.
import "./esbuild-binary";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { BrowserWindow, app, dialog, ipcMain, protocol, shell } from "electron";
import { createProject } from "@genmotion/project";
import { DESKTOP_PROTOCOL, type DesktopAuthProvider } from "@genmotion/shared";
import { desktopAuth, WEB_URL } from "./auth";
import { flushAnalytics, startAnalytics, track } from "./analytics";
import { ProjectSession } from "./project-session";
import { captureThumbnail, refreshThumbnail } from "./export/thumbnail";
import { forgetProject, listRecents, rememberProject } from "./recents";
import { mimeForAsset, startLocalServer, type LocalServer } from "./local-server";
import {
  checkForUpdate,
  downloadUpdate,
  installUpdate,
  onUpdateChange,
  updateState,
} from "./updater";
import {
  IPC,
  type CreateProjectInput,
  type DesktopProject,
  type LaunchContext,
  type RecentProjectRange,
  type RemixTemplateInput,
} from "./shared";
import { cliStatus, getLaunchDir, installCli, launchDirFromArgv, setLaunchDir } from "./cli";
import { fetchRemixBundle, writeRemix } from "./remix";
import { projectDefaults } from "./preferences";
import { applySessionRoots } from "./agent/read-roots";

const DEV_SERVER = process.env.GM_DEV_SERVER_URL;
// Electron's main process is bundled to CJS, so `__dirname` is the file's own
// directory in both the dev build and the packaged asar.
const dirname = __dirname;

let window: BrowserWindow | null = null;
let session: ProjectSession | null = null;
let unsubscribe: (() => void) | null = null;
let localServer: LocalServer | null = null;

/**
 * Assets live on disk inside the project, and scene bundles reference them as
 * `gm-asset://<key>/<relative path>`. Registering the scheme as standard and
 * streaming keeps `<video>`/`<audio>` range requests working, which plain
 * `file://` under a custom origin would not.
 *
 * `corsEnabled` matters as much as the rest: the UI is served from the loopback
 * origin, so every asset request is cross-origin. Without it Chromium refuses
 * the scheme outright ("Cross origin requests are only supported for protocol
 * schemes: ... http, https"), which silently kills exactly the two things that
 * ask for CORS — `<audio crossOrigin="anonymous">` (media never loads) and the
 * `fetch()` the timeline decodes waveforms with.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: "gm-asset",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

async function exists(file: string): Promise<boolean> {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false);
}

async function closeSession(): Promise<void> {
  unsubscribe?.();
  unsubscribe = null;
  if (thumbnailTimer) {
    clearTimeout(thumbnailTimer);
    thumbnailTimer = null;
    // Leaving the editor is exactly when the card is about to be looked at, so
    // spend the capture now rather than dropping the pending one.
    if (session) await captureThumbnail(session).catch(() => null);
  }
  await session?.dispose();
  session = null;
  // A subprocess spawned in anticipation of a turn that never came.
  void import("./agent/claude-code").then((m) => m.disposeWarmClaudeCode());
}

async function openSession(dir: string): Promise<DesktopProject> {
  await closeSession();
  const opened = await ProjectSession.open(dir, randomUUID());
  session = opened;
  // Folders picked before this project existed — the launch folder, and
  // anything added from the start screen — become grants against it. Awaited
  // rather than fired off, so the subprocess warmed a line below starts with
  // them already in place.
  await applySessionRoots(opened.dir);
  // Opening a project is the strongest signal that a turn is coming. Load the
  // agent SDK and resolve the CLI now, so the first message does not pay for
  // them — not awaited, because none of it gates the editor appearing.
  void import("./agent/claude-code").then((m) => m.warmClaudeCode(opened));
  unsubscribe = opened.onChange((project) => {
    if (!window || window.isDestroyed()) return;
    window.webContents.send(IPC.projectChanged, project);
    scheduleThumbnail(opened);
  });
  const payload = await session.load();
  await rememberProject(dir, payload.name);
  // Bring the card up to date with whatever happened to the folder while the
  // app wasn't watching it. Deliberately not awaited — a stale picture is not
  // worth delaying the editor for.
  void refreshThumbnail(opened).catch(() => {});
  return payload;
}

/**
 * Copy a template into a new project and open it.
 *
 * Shared by the IPC handler (the in-app Remix button) and the `genmotion://`
 * deep link (the web site's "Open in the app" button) — same steps either
 * way. Every network step happens before a folder exists, so a download that
 * fails leaves nothing behind. Once the directory is allocated the rest is
 * wrapped: on any error it is removed, because `allocateProjectDir` had just
 * confirmed the path was free and `createProject` refuses a folder that
 * already holds a manifest — so this can only ever delete what we just made.
 * (`rm` rather than the Trash: a failed scaffold is not the user's work.)
 */
async function remixTemplateAndOpen(templateId: string, name?: string): Promise<DesktopProject> {
  const bundle = await fetchRemixBundle(templateId);
  const resolvedName = name?.trim() || bundle.manifest.name;
  const dir = await allocateProjectDir(resolvedName);
  try {
    await writeRemix(dir, resolvedName, bundle);
  } catch (err) {
    await fs.rm(dir, { recursive: true, force: true });
    throw err;
  }
  track("template_remixed", { templateId, revision: bundle.revision });
  return openSession(dir);
}

/**
 * Re-capture the project's card image once its edits settle.
 *
 * Long after the change, and only when nothing else has landed since: an agent
 * turn writes a scene several times over, and each write would otherwise open a
 * composition-sized window to photograph a half-finished frame.
 */
const THUMBNAIL_SETTLE_MS = 4000;
let thumbnailTimer: NodeJS.Timeout | null = null;

function scheduleThumbnail(target: ProjectSession): void {
  if (thumbnailTimer) clearTimeout(thumbnailTimer);
  thumbnailTimer = setTimeout(() => {
    thumbnailTimer = null;
    // The project may have been closed during the wait.
    if (session !== target) return;
    void captureThumbnail(target).catch(() => {});
  }, THUMBNAIL_SETTLE_MS);
}

/**
 * Where projects live. The app owns this folder so creating a video never
 * involves a save dialog — you type what you want and it exists.
 */
function projectsRoot(): string {
  return path.join(app.getPath("home"), ".genmotion", "projects");
}

/** A filesystem-safe folder for `name`, suffixed if it's taken. */
async function allocateProjectDir(name: string): Promise<string> {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "untitled";
  const root = projectsRoot();
  await fs.mkdir(root, { recursive: true });
  for (let n = 0; n < 500; n++) {
    const dir = path.join(root, n === 0 ? slug : `${slug}-${n + 1}`);
    if (!(await exists(dir))) return dir;
  }
  return path.join(root, `${slug}-${Date.now()}`);
}

/** Replace the pre-spawned agent process, which fixed its roots when it started. */
function rewarmAgent(): void {
  if (!session) return;
  const opened = session;
  void import("./agent/claude-code").then((m) => m.warmClaudeCode(opened));
}

/** The launch folder, and whether it is a project the app could just open. */
async function launchContext(): Promise<LaunchContext> {
  const dir = getLaunchDir();
  if (!dir) return { dir: null, isProject: false };
  return { dir, isProject: await exists(path.join(dir, "project.json")) };
}

/**
 * Whether this is the first time this install has ever been run.
 *
 * A marker file rather than a preference: it must survive nothing else, and
 * its absence is exactly the question being asked.
 */
async function isFirstLaunch(): Promise<boolean> {
  const marker = path.join(app.getPath("userData"), "installed-at");
  if (await exists(marker)) return false;
  await fs.writeFile(marker, new Date().toISOString(), "utf8").catch(() => {});
  return true;
}

function registerIpc(): void {
  ipcMain.handle(IPC.createProject, async (_event, input: CreateProjectInput) => {
    const name = input.name?.trim() || "Untitled";
    const dir = await allocateProjectDir(name);
    // The composer sends dimensions with every create, but fps is a setting
    // rather than something the start screen asks about — so it comes from the
    // stored defaults, along with either dimension the caller omitted.
    const defaults = await projectDefaults();
    const width = input.width ?? defaults.width;
    const height = input.height ?? defaults.height;
    await createProject({ dir, name, width, height, fps: defaults.fps });
    track("project_created", { width, height });
    return openSession(dir);
  });

  ipcMain.handle(IPC.remixTemplate, async (_event, input: RemixTemplateInput) =>
    remixTemplateAndOpen(input.templateId, input.name),
  );

  ipcMain.handle(IPC.openProject, async (_event, dir: string) => openSession(dir));
  ipcMain.handle(IPC.closeProject, async () => closeSession());
  ipcMain.handle(IPC.recentProjects, async (_event, range: RecentProjectRange | undefined) =>
    listRecents(range ?? {}),
  );
  ipcMain.handle(IPC.revealProject, async (_event, dir: string) => {
    shell.openPath(dir);
  });

  ipcMain.handle(IPC.paths, async () => ({ projectsRoot: projectsRoot() }));

  /**
   * Show a folder the app owns.
   *
   * Scoped to the projects root rather than opening whatever it is handed: the
   * renderer runs agent-authored code, and `shell.openPath` on an arbitrary
   * path is a way to launch things.
   */
  ipcMain.handle(IPC.revealPath, async (_event, target: string) => {
    const root = projectsRoot();
    const resolved = path.resolve(target);
    const inside = path.relative(root, resolved);
    if (resolved !== root && (inside.startsWith("..") || path.isAbsolute(inside))) return;
    await fs.mkdir(root, { recursive: true });
    shell.openPath(resolved);
  });

  /**
   * Delete a project, folder and all.
   *
   * The confirmation is raised here rather than in the renderer on purpose:
   * this is the one action that destroys the user's work, and the renderer
   * evaluates agent-authored scene code. A native dialog the main process owns
   * cannot be skipped, styled into something misleading, or clicked by anything
   * the page is running.
   *
   * `shell.trashItem` rather than `rm -rf`: the Trash is the difference between
   * a mistake and a loss, and the OS already has the undo story.
   */
  ipcMain.handle(IPC.deleteProject, async (_event, dir: string) => {
    const name = path.basename(dir);
    const { response } = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Move to Trash", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      message: `Delete “${name}”?`,
      detail:
        "The project folder — scenes, assets and exports — is moved to the Trash. " +
        "You can put it back from there.",
    });
    if (response !== 0) return { deleted: false };

    // Releasing the session first: it holds a bundler and a filesystem watcher
    // on this folder, and a watcher firing on a directory that just went to the
    // Trash is a stream of errors for a project nobody is looking at.
    if (session?.dir === dir) await closeSession();

    await shell.trashItem(dir);
    await forgetProject(dir);
    // Grants belong to a project. Leaving them behind would silently hand them
    // to whatever project is later created at the same path.
    await import("./agent/read-roots").then((m) => m.clearReadRoots(dir));
    return { deleted: true };
  });

  ipcMain.handle(IPC.launchContext, async () => launchContext());
  ipcMain.handle(IPC.cliStatus, async () => cliStatus());
  ipcMain.handle(IPC.cliInstall, async () => installCli());

  ipcMain.handle(IPC.updateState, async () => updateState());
  ipcMain.handle(IPC.updateCheck, async () => checkForUpdate());
  ipcMain.handle(IPC.updateDownload, async () => downloadUpdate());
  ipcMain.handle(IPC.updateInstall, async () => installUpdate());

  ipcMain.handle(IPC.openWeb, async (_event, target: string) => {
    // Pinned to our own origin. `new URL(target, base)` alone would not do it:
    // an absolute URL ignores the base, which would turn this channel into an
    // "open anything" primitive for a renderer that runs agent-authored code.
    const url = new URL(target, `${WEB_URL}/`);
    if (url.origin !== new URL(WEB_URL).origin) return;
    await shell.openExternal(url.toString());
  });

  // `on`, not `handle`: the renderer sends and forgets.
  ipcMain.on(IPC.track, (_event, name: string, properties?: Record<string, unknown>) => {
    if (typeof name === "string" && name) track(name, properties);
  });

  ipcMain.handle(IPC.authState, () => desktopAuth.current());
  ipcMain.handle(
    IPC.authStart,
    async (_event, provider: DesktopAuthProvider, email?: string) =>
      desktopAuth.start(provider, email),
  );
  ipcMain.handle(IPC.authOpenBrowser, async () => desktopAuth.openBrowser());
  ipcMain.handle(IPC.authCancel, () => desktopAuth.cancel());
  ipcMain.handle(IPC.authSignOut, async () => desktopAuth.signOut());
}

/** Absolute path for a `gm-asset://<key>/<path>` URL, or null if it isn't ours. */
function assetPathFromUrl(raw: string): string | null {
  if (!session) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "gm-asset:" || url.hostname !== session.assetKey) return null;
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const target = path.resolve(session.dir, relative);
  return path.relative(session.dir, target).startsWith("..") ? null : target;
}

/** `Range: bytes=a-b` → an inclusive [start, end] inside a file of `size`. */
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? "");
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  // `bytes=-500` is the LAST 500 bytes, not the first 500.
  const start = rawStart ? Number(rawStart) : Math.max(0, size - Number(rawEnd || 0));
  const end = rawStart ? (rawEnd ? Math.min(Number(rawEnd), size - 1) : size - 1) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null;
  }
  return { start, end };
}

/**
 * Serve one project file, with byte ranges.
 *
 * The ranges are the whole point. This used to hand the request to
 * `net.fetch(file://…)` on the strength of that honouring `Range` — it does
 * not. It answers **200** with no `Content-Range`, no `Content-Length` and no
 * `Accept-Ranges`, while quietly returning only the requested bytes. Chromium's
 * media loader reads that as a stream it cannot seek, so `video.seekable` stays
 * empty and every `currentTime =` is dropped on the floor: measured on the real
 * export path, a <Video> reported `currentTime` 0.000 for all 60 frames of a
 * scene and decoded exactly one distinct frame — the clip frozen on the first
 * frame it ever loaded, which is the "the video doesn't play in my export"
 * report. Every render frame is a seek, so this is not a detail.
 */
async function serveAssetFile(target: string, request: Request): Promise<Response> {
  let size: number;
  try {
    size = (await fs.stat(target)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "content-type": mimeForAsset(target),
    "accept-ranges": "bytes",
    "cache-control": "no-cache",
  };
  const range = parseRange(request.headers.get("range"), size);
  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  headers["content-length"] = String(end - start + 1);
  if (range) headers["content-range"] = `bytes ${start}-${end}/${size}`;

  // HEAD and a zero-length file both want the headers and nothing else.
  if (request.method === "HEAD" || size === 0) {
    return new Response(null, { status: range ? 206 : 200, headers });
  }
  const stream = createReadStream(target, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: range ? 206 : 200,
    headers,
  });
}

function registerAssetProtocol(): void {
  protocol.handle("gm-asset", async (request) => {
    if (!session) return new Response("No project open", { status: 404 });
    const url = new URL(request.url);
    // `gm-asset://<key>/<path>` — the key namespaces the open project.
    if (url.hostname !== session.assetKey) {
      return new Response("Unknown project", { status: 404 });
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const target = path.resolve(session.dir, relative);
    if (path.relative(session.dir, target).startsWith("..")) {
      return new Response("Forbidden", { status: 403 });
    }
    return serveAssetFile(target, request);
  });
}

/**
 * `genmotion://…` links the app answers to. Two shapes today:
 *
 * - `genmotion://auth/done` — the browser's way of saying "approval is done,
 *   come to the front". Nothing actually depends on the link itself: the app
 *   is polling for the token either way, so an unregistered scheme — every
 *   dev run, and any unsigned build — only costs the rest of the poll
 *   interval.
 * - `genmotion://templates/<id>/remix` — the web site's "Open in the app"
 *   button. Runs the exact same remix the in-app button does.
 *
 * Either way the window comes to the front first, so a slow remix is at
 * least visibly the foreground app rather than a background surprise.
 */
function handleDeepLink(url: string): void {
  if (!url.startsWith(`${DESKTOP_PROTOCOL}://`)) return;
  if (window) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }

  const parsed = new URL(url);
  const [, templateId, action] = parsed.pathname.split("/");
  if (parsed.hostname === "templates" && templateId && action === "remix") {
    remixTemplateAndOpen(templateId).catch((err: unknown) => {
      dialog.showErrorBox(
        "Couldn’t open that template",
        err instanceof Error ? err.message : "Something went wrong.",
      );
    });
    return;
  }

  desktopAuth.pollNow();
}

/** On Windows and Linux the URL arrives as a launch argument, not an event. */
function deepLinkFromArgv(argv: string[]): string | undefined {
  return argv.find((arg) => arg.startsWith(`${DESKTOP_PROTOCOL}://`));
}

function registerProtocolClient(): void {
  if (DEV_SERVER && process.argv[1]) {
    // In dev the executable is Electron itself, so the OS has to be told which
    // script to hand the URL back to.
    app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
    return;
  }
  app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL);
}

function createWindow(): void {
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#08080b",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // The loopback API's base URL (with its per-launch secret) reaches the
      // renderer through the preload rather than a bundled constant — the port
      // is only known once the server is listening.
      additionalArguments: [`--gm-api-url=${localServer?.url ?? ""}`],
      // The preview drives a real-time clock; throttling a backgrounded window
      // would make playback stutter rather than simply pause.
      backgroundThrottling: false,
    },
  });

  if (DEV_SERVER) {
    void window.loadURL(DEV_SERVER);
    window.webContents.openDevTools({ mode: "detach" });
  } else if (localServer) {
    // Served over the loopback origin rather than file://, so the web app's
    // root-absolute asset paths (/logo.svg) resolve.
    void window.loadURL(`${localServer.origin}/index.html`);
  }

  // The export button "downloads" the finished file by clicking a link at it.
  // On the web that saves a copy; here the file is already on disk inside the
  // project, so reveal it instead — and never let the link navigate the editor
  // away from itself.
  window.webContents.on("will-navigate", (event, url) => {
    const target = assetPathFromUrl(url);
    if (!url.startsWith("gm-asset:")) return;
    event.preventDefault();
    if (target) shell.showItemInFolder(target);
  });

  window.on("closed", () => {
    window = null;
  });
}

// A second launch is how Windows and Linux deliver a deep link; without the
// lock it would start a whole second app instead of reaching this one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = deepLinkFromArgv(argv);
    if (url) {
      handleDeepLink(url);
      return;
    }
    // `genmotion <path>` while the app is already up. The new process exists
    // only to carry this argument here before it quits.
    const dir = launchDirFromArgv(argv);
    if (dir) {
      setLaunchDir(dir);
      // A project open right now gets the folder too — the user ran the
      // command from somewhere, and waiting until they open the next project
      // to act on that would read as the command having done nothing.
      if (session) void applySessionRoots(session.dir).then(rewarmAgent);
      void launchContext().then((context) => {
        window?.webContents.send(IPC.launchContextChanged, context);
      });
    }
    if (window) {
      window.show();
      window.focus();
    }
  });
}

// macOS delivers it as an event, and can do so before the app is ready — hence
// registering the listener at module scope rather than inside whenReady.
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

void app.whenReady().then(async () => {
  // Before anything else reads it: a project opened during startup shares it.
  setLaunchDir(launchDirFromArgv(process.argv));
  registerProtocolClient();
  registerIpc();
  registerAssetProtocol();
  // Must be listening before the window exists: its URL is handed to the
  // renderer as a launch argument.
  localServer = await startLocalServer(() => session, path.join(dirname, "../renderer"));
  createWindow();

  // Delivery for anything recorded from here on, plus whatever last run left
  // queued. The sender is handed over rather than imported by the analytics
  // module so that module never has to know about auth.
  startAnalytics((events) =>
    desktopAuth.request("/api/events", { json: { events } }),
  );

  // Push every change to the renderer, so the login gate needs no polling.
  desktopAuth.onChange((state) => {
    window?.webContents.send(IPC.authChanged, state);
    // A token just landed: everything queued while signed out can go now,
    // carrying the timestamps it was recorded with.
    if (state.status === "signed-in") flushAnalytics();
  });
  onUpdateChange((state) => window?.webContents.send(IPC.updateChanged, state));
  void isFirstLaunch().then((first) =>
    track("app_launched", {
      version: app.getVersion(),
      platform: process.platform,
      os_version: os.release(),
      arch: process.arch,
      first_launch: first,
    }),
  );

  // Not awaited: the window should paint its loading state rather than wait on
  // a network round-trip to the API.
  void desktopAuth.restore();
  // Same idea for the model list: asking the harnesses costs a subprocess, and
  // paying for it now means the picker opens instantly later.
  void import("./agent/models").then((m) => m.warmModels());
  // Same reasoning — asking GitHub whether a newer build exists is not
  // something the first frame should wait behind.
  void checkForUpdate();

  const launchUrl = deepLinkFromArgv(process.argv);
  if (launchUrl) handleDeepLink(launchUrl);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  void closeSession();
  void localServer?.close();
});
