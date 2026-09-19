// Must be first: it configures where esbuild finds its executable, and the
// project package pulls esbuild in as soon as it is imported.
import "./esbuild-binary";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { BrowserWindow, app, dialog, ipcMain, protocol, session as electronSession, shell } from "electron";
import { createProject, readManifest } from "@genmotion/project";
import { GSAP_VERSION, HYPERFRAMES_AUTHORING_GUIDE, HYPERFRAMES_VERSION } from "@genmotion/hyperframes";
import { DESKTOP_PROTOCOL, type DesktopAuthProvider } from "@genmotion/shared";
import { desktopAuth, WEB_URL } from "./auth";
import { flushAnalytics, startAnalytics, track } from "./analytics";
import {
  activeSession,
  closeAllSessions,
  closeSession,
  getSession,
  onProjectChanged,
  openSession as registryOpen,
  sessionByAssetKey,
  setActiveSession,
  type CloseResult,
} from "./session-registry";
import { refreshThumbnail } from "./export/thumbnail";
import {
  filmstripsFor,
  onFilmstripChanged,
  scheduleFilmstrips,
  setPlaybackState,
} from "./export/filmstrip";
import { SCALED_PARTITION } from "./export/offscreen";
import { forgetProject, listRecents, rememberProject } from "./recents";
import { startLocalServer, type LocalServer } from "./local-server";
import { serveAssetFile } from "./serve-file";
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
  type RestoredTabs,
  type StoredTabs,
} from "./shared";
import { cliStatus, getLaunchDir, installCli, launchDirFromArgv, setLaunchDir } from "./cli";
import { fetchRemixBundle, writeRemix } from "./remix";
import { allocateProjectDir, projectsRoot } from "./projects-dir";
import { seedSampleProjects } from "./samples";
import { projectDefaults } from "./preferences";
import { readSettings, update as updateSettings } from "./settings-store";
import { applySessionRoots } from "./agent/read-roots";
import { installMenu } from "./menu";
import { linkSkillsIntoProject } from "./hyperframes/skills";
import { onScaffoldChange, runScaffoldInstall } from "./hyperframes/scaffold";

const DEV_SERVER = process.env.GM_DEV_SERVER_URL;
// Electron's main process is bundled to CJS, so `__dirname` is the file's own
// directory in both the dev build and the packaged asar.
const dirname = __dirname;

let window: BrowserWindow | null = null;
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

/**
 * Open a project, or return the one already open at that folder.
 *
 * Nothing here closes another project: several stay open at once, one per
 * tab, and the registry is what keeps them apart. The open-time work — grants,
 * the warm subprocess, the recents entry — runs only for a genuinely new
 * session; an already-open folder just gets its payload back, which is all
 * that focusing its tab needs.
 */
async function openSession(dir: string): Promise<DesktopProject> {
  const { session, project, alreadyOpen } = await registryOpen(dir);
  if (alreadyOpen) return project;
  // Folders picked before this project existed — the launch folder, and
  // anything added from the start screen — become grants against it. Awaited
  // rather than fired off, so the subprocess warmed a line below starts with
  // them already in place.
  await applySessionRoots(session.dir);
  // The skill pack, for Codex. Re-linked on every open so an app update
  // reaches projects made before it. Best-effort: a project without the
  // links still works, the agent just has less to read.
  if (session.engine === "hyperframes") {
    await linkSkillsIntoProject(session.dir).catch(() => {});
  }
  // Opening a project is the strongest signal that a turn is coming. Load the
  // agent SDK and resolve the CLI now, so the first message does not pay for
  // them — not awaited, because none of it gates the editor appearing. Only the
  // tab being opened is warmed; the registry keeps one warm process, for the
  // frontmost project, and the renderer re-points it as tabs change.
  void import("./agent/claude-code").then((m) => m.warmClaudeCode(session));
  await rememberProject(session.dir, project.name);
  // Bring the card up to date with whatever happened to the folder while the
  // app wasn't watching it. Deliberately not awaited — a stale picture is not
  // worth delaying the editor for.
  void refreshThumbnail(session).catch(() => {});
  // The timeline's scene strips, likewise: found on disk if nothing changed,
  // rendered in the background if it did.
  scheduleFilmstrips(session);
  return project;
}

/**
 * The renderer's tab came to the front.
 *
 * The one warm subprocess follows the active tab: that is the project whose
 * next turn is most likely, and warming every open one would be an idle Node
 * process per tab for a saving on a single first turn.
 */
function activateProject(dir: string | null): void {
  setActiveSession(dir);
  const session = dir ? getSession(dir) : null;
  void import("./agent/claude-code").then((m) => {
    if (!session) return;
    if (m.warmDir() !== session.dir) m.warmClaudeCode(session);
  });
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

/** Replace the pre-spawned agent process, which fixed its roots when it started. */
function rewarmAgent(): void {
  const session = activeSession();
  if (!session) return;
  void import("./agent/claude-code").then((m) => m.warmClaudeCode(session));
}

/**
 * Which tabs were open last time, minus any folder that has since gone.
 *
 * Names come from the manifests so the strip can label every tab at once; the
 * projects themselves are opened lazily, as the renderer gets to them — a
 * launch with eight tabs should not start eight watchers before painting.
 */
async function restoreTabs(): Promise<RestoredTabs> {
  const stored = (await readSettings()).openTabs;
  if (!stored) return { tabs: [], activeDir: null };
  const tabs: RestoredTabs["tabs"] = [];
  for (const dir of stored.dirs) {
    if (!(await exists(path.join(dir, "project.json")))) continue;
    const name = await readManifest(dir)
      .then((m) => m.name)
      .catch(() => path.basename(dir));
    tabs.push({ dir, name });
  }
  const activeDir =
    stored.activeDir && tabs.some((t) => t.dir === stored.activeDir) ? stored.activeDir : null;
  return { tabs, activeDir };
}

/** The renderer's tabs changed; remember them for the next launch. Debounced — a drag reorders many times. */
let persistTimer: NodeJS.Timeout | null = null;
let pendingTabs: StoredTabs | null = null;

function persistTabs(tabs: StoredTabs): void {
  pendingTabs = tabs;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => void flushTabs(), 500);
}

async function flushTabs(): Promise<void> {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  const tabs = pendingTabs;
  pendingTabs = null;
  if (!tabs) return;
  await updateSettings((settings) => ({ ...settings, openTabs: tabs })).catch(() => {});
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
    const engine = input.engine ?? defaults.engine;
    if (engine === "react") {
      await createProject({ dir, name, width, height, fps: defaults.fps });
      track("project_created", { width, height, engine });
      return openSession(dir);
    }
    // A HyperFrames composition. The folder is written against the release
    // this app carries and is previewable at once; the upgrade to the newest
    // release runs behind the open, reported to the editor's scaffolding
    // banner (`runScaffoldInstall`).
    await createProject({
      dir,
      name,
      width,
      height,
      fps: defaults.fps,
      engine: "hyperframes",
      hyperframes: {
        version: HYPERFRAMES_VERSION,
        gsapVersion: GSAP_VERSION,
        guide: HYPERFRAMES_AUTHORING_GUIDE,
      },
    });
    track("project_created", { width, height, engine });
    const project = await openSession(dir);
    void runScaffoldInstall(project.dir)
      .then(() => getSession(project.dir)?.touch())
      .catch(() => {});
    return project;
  });

  /**
   * Run the install again. The banner offers this after a failure — no
   * network at creation, npm hiccup — and the result flows back over the same
   * event the first attempt used.
   */
  ipcMain.handle(IPC.retryScaffold, async (_event, dir: string) => {
    if (typeof dir !== "string" || !getSession(dir)) throw new Error("That project isn't open");
    const state = await runScaffoldInstall(dir);
    getSession(dir)?.touch();
    return state;
  });

  ipcMain.handle(IPC.remixTemplate, async (_event, input: RemixTemplateInput) =>
    remixTemplateAndOpen(input.templateId, input.name),
  );

  ipcMain.handle(IPC.openProject, async (_event, dir: string) => openSession(dir));
  /**
   * Close a project's tab.
   *
   * With the agent mid-turn, the first attempt is refused and the question is
   * put to the user here — a native dialog the main process owns, for the same
   * reason delete's is: it ends work in progress, and the renderer runs
   * agent-authored code.
   */
  ipcMain.handle(
    IPC.closeProject,
    async (_event, dir: string, options?: { force?: boolean }): Promise<CloseResult> => {
      if (typeof dir !== "string") throw new Error("Expected a project folder");
      const first = await closeSession(dir, options);
      if (first.closed || options?.force) return first;
      const name = await readManifest(dir)
        .then((m) => m.name)
        .catch(() => path.basename(dir));
      const { response } = await dialog.showMessageBox({
        type: "warning",
        buttons: ["Stop and close", "Cancel"],
        defaultId: 1,
        cancelId: 1,
        message: `The agent is still working on “${name}”.`,
        detail: "Closing the tab stops it. Everything it has already written stays in the project.",
      });
      if (response !== 0) return first;
      return closeSession(dir, { force: true });
    },
  );
  ipcMain.handle(IPC.activateProject, async (_event, dir: string | null) => activateProject(dir));
  ipcMain.handle(IPC.filmstrips, async (_event, dir: string) => filmstripsFor(dir));
  ipcMain.on(IPC.playbackState, (_event, dir: string, playing: boolean) => {
    setPlaybackState(dir, playing);
  });
  ipcMain.handle(IPC.restoreTabs, async () => restoreTabs());
  // `on`, not `handle`: the renderer sends and forgets.
  ipcMain.on(IPC.persistTabs, (_event, tabs: StoredTabs) => persistTabs(tabs));
  /**
   * Show a finished export in the file manager.
   *
   * By job id rather than path: the main process is the only side that knows
   * where the file went, and a project opened with `genmotion <path>` can live
   * anywhere — so this cannot go through `revealPath`, which is deliberately
   * fenced to the projects root.
   */
  ipcMain.handle(IPC.revealExport, async (_event, id: string) => {
    const { exportOutputPath } = await import("./export/service");
    const target = await exportOutputPath(id);
    if (target && (await exists(target))) shell.showItemInFolder(target);
  });
  ipcMain.handle(IPC.recentProjects, async (_event, range: RecentProjectRange | undefined) =>
    listRecents(range ?? {}),
  );
  // Never throws to the renderer: an offline first launch is an empty start
  // screen, which is what it would have been anyway.
  ipcMain.handle(IPC.seedSampleProjects, async () => {
    const seeded = await seedSampleProjects().catch(() => []);
    return { seeded: seeded.length };
  });
  ipcMain.handle(IPC.revealProject, async (_event, dir: string) => {
    shell.openPath(dir);
  });

  ipcMain.handle(IPC.paths, async () => ({ projectsRoot: projectsRoot() }));
  ipcMain.handle(IPC.fullScreen, async () => window?.isFullScreen() ?? false);

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
    // Trash is a stream of errors for a project nobody is looking at. Forced:
    // an agent mid-turn in a project being deleted has nothing left to do.
    await closeSession(dir, { force: true });
    window?.webContents.send(IPC.projectClosed, dir);

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
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "gm-asset:") return null;
  // The key names the project, so every open tab's assets resolve — not just
  // the frontmost one's.
  const session = sessionByAssetKey(url.hostname);
  if (!session) return null;
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const target = path.resolve(session.dir, relative);
  return path.relative(session.dir, target).startsWith("..") ? null : target;
}

function registerAssetProtocol(): void {
  const handle = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    // `gm-asset://<key>/<path>` — the key names which open project this is,
    // so a background tab's preview and audio keep resolving.
    const session = sessionByAssetKey(url.hostname);
    if (!session) return new Response("Unknown project", { status: 404 });
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const target = path.resolve(session.dir, relative);
    if (path.relative(session.dir, target).startsWith("..")) {
      return new Response("Forbidden", { status: 403 });
    }
    return serveAssetFile(target, request);
  };
  protocol.handle("gm-asset", handle);
  // Scaled captures render in their own session (see `offscreen.ts`), and a
  // React scene's assets are `gm-asset://` URLs — so the scheme has to answer
  // there too.
  electronSession.fromPartition(SCALED_PARTITION).protocol.handle("gm-asset", handle);
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
    remixTemplateAndOpen(templateId)
      .then((project) => {
        // Opened from outside the renderer, so it has to be told there is a
        // new project to put a tab on.
        window?.webContents.send(IPC.projectOpened, project);
      })
      .catch((err: unknown) => {
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
  //
  // Nothing else may navigate this window either. The renderer is a single
  // page; a plain `<a href="/settings/billing">` inherited from the web app
  // would otherwise unload the editor onto a loopback URL that serves nothing.
  // Links to our own web app open in the real browser (where the session
  // cookie is); anything else is dropped.
  const ownDocument = DEV_SERVER ?? (localServer ? `${localServer.origin}/index.html` : null);
  window.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("gm-asset:")) {
      event.preventDefault();
      const target = assetPathFromUrl(url);
      if (target) shell.showItemInFolder(target);
      return;
    }
    if (ownDocument && url.split("#")[0] === ownDocument.split("#")[0]) return;
    event.preventDefault();
    try {
      const parsed = new URL(url);
      if (parsed.origin === new URL(WEB_URL).origin) void shell.openExternal(parsed.toString());
    } catch {
      // Not a URL we can reason about — dropping it is the safe outcome.
    }
  });

  // The tab strip leaves room for the traffic lights; in full screen macOS
  // hides them, and the room should close up with them.
  const announceFullScreen = () => {
    window?.webContents.send(IPC.fullScreenChanged, window.isFullScreen());
  };
  window.on("enter-full-screen", announceFullScreen);
  window.on("leave-full-screen", announceFullScreen);

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
      // The project in front right now gets the folder too — the user ran the
      // command from somewhere, and waiting until they open the next project
      // to act on that would read as the command having done nothing.
      const active = activeSession();
      if (active) void applySessionRoots(active.dir).then(rewarmAgent);
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
  localServer = await startLocalServer(path.join(dirname, "../renderer"));
  installMenu(() => window);
  createWindow();

  // A scene strip finished rendering; the timeline card swaps it in.
  onFilmstripChanged((dir, sceneId, strip) => {
    if (!window || window.isDestroyed()) return;
    window.webContents.send(IPC.filmstripChanged, dir, sceneId, strip);
  });
  // Push every project's changes to the renderer; the payload carries its
  // `dir`, which is how the renderer knows which tab it belongs to.
  onProjectChanged((project) => {
    if (!window || window.isDestroyed()) return;
    window.webContents.send(IPC.projectChanged, project);
  });
  // The install behind a new project, step by step, for its tab's banner.
  onScaffoldChange((dir, state) => {
    if (!window || window.isDestroyed()) return;
    window.webContents.send(IPC.scaffoldChanged, dir, state);
  });

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

/**
 * Quit waits for the sessions to close.
 *
 * Each close may capture a project card, and with several tabs open a
 * fire-and-forget teardown would lose every one of them. The flag is what
 * lets the second `quit()` through once the work is done.
 */
let quitting = false;
app.on("before-quit", (event) => {
  if (quitting) return;
  quitting = true;
  event.preventDefault();
  void (async () => {
    await flushTabs();
    await Promise.race([
      closeAllSessions(),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]).catch(() => {});
    await localServer?.close().catch(() => {});
    app.quit();
  })();
});
