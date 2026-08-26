// Must be first: it configures where esbuild finds its executable, and the
// project package pulls esbuild in as soon as it is imported.
import "./esbuild-binary";
import path from "node:path";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { BrowserWindow, app, dialog, ipcMain, net, protocol, shell } from "electron";
import { createProject } from "@genmotion/project";
import { DESKTOP_PROTOCOL, type DesktopAuthProvider } from "@genmotion/shared";
import { desktopAuth, WEB_URL } from "./auth";
import { ProjectSession } from "./project-session";
import { captureThumbnail, refreshThumbnail } from "./export/thumbnail";
import { listRecents, rememberProject } from "./recents";
import { startLocalServer, type LocalServer } from "./local-server";
import {
  IPC,
  type CreateProjectInput,
  type DesktopProject,
  type RecentProjectRange,
} from "./shared";

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
}

async function openSession(dir: string): Promise<DesktopProject> {
  await closeSession();
  const opened = await ProjectSession.open(dir, randomUUID());
  session = opened;
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

function registerIpc(): void {
  ipcMain.handle(IPC.pickProjectFolder, async () => {
    const result = await dialog.showOpenDialog({
      title: "Open GenMotion project",
      properties: ["openDirectory"],
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  ipcMain.handle(IPC.createProject, async (_event, input: CreateProjectInput) => {
    const name = input.name?.trim() || "Untitled";
    const dir = await allocateProjectDir(name);
    await createProject({ dir, name, width: input.width, height: input.height });
    return openSession(dir);
  });

  ipcMain.handle(IPC.openProject, async (_event, dir: string) => openSession(dir));
  ipcMain.handle(IPC.closeProject, async () => closeSession());
  ipcMain.handle(IPC.recentProjects, async (_event, range: RecentProjectRange | undefined) =>
    listRecents(range ?? {}),
  );
  ipcMain.handle(IPC.revealProject, async (_event, dir: string) => {
    shell.openPath(dir);
  });

  ipcMain.handle(IPC.openWeb, async (_event, target: string) => {
    // Pinned to our own origin. `new URL(target, base)` alone would not do it:
    // an absolute URL ignores the base, which would turn this channel into an
    // "open anything" primitive for a renderer that runs agent-authored code.
    const url = new URL(target, `${WEB_URL}/`);
    if (url.origin !== new URL(WEB_URL).origin) return;
    await shell.openExternal(url.toString());
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
    // net.fetch on a file URL honours Range, which media elements need to seek.
    return net.fetch(pathToFileURL(target).toString(), {
      headers: request.headers,
      bypassCustomProtocolHandlers: true,
    });
  });
}

/**
 * The browser's way of saying "approval is done, come to the front".
 *
 * Nothing depends on it: the app is polling for the token either way, so an
 * unregistered scheme — which is every dev run and any unsigned build — only
 * costs the user the rest of the poll interval.
 */
function handleDeepLink(url: string): void {
  if (!url.startsWith(`${DESKTOP_PROTOCOL}://`)) return;
  if (window) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
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
    if (url) handleDeepLink(url);
    else if (window) {
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
  registerProtocolClient();
  registerIpc();
  registerAssetProtocol();
  // Must be listening before the window exists: its URL is handed to the
  // renderer as a launch argument.
  localServer = await startLocalServer(() => session, path.join(dirname, "../renderer"));
  createWindow();

  // Push every change to the renderer, so the login gate needs no polling.
  desktopAuth.onChange((state) => window?.webContents.send(IPC.authChanged, state));
  // Not awaited: the window should paint its loading state rather than wait on
  // a network round-trip to the API.
  void desktopAuth.restore();

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
