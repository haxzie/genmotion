/** Types crossing the IPC boundary. Imported by both the main process and the renderer. */
import type {
  DesktopAuthProvider,
  ExportFormat,
  ExportJobData,
  ProjectData,
} from "@genmotion/shared";
import type { ProjectEngine } from "@genmotion/project/schema";
import type { CompositionTimeline, InstallStep, LintReport } from "@genmotion/hyperframes/shared";

/**
 * What the main process produced for one scene. The bundle is built there,
 * where native esbuild can resolve the project's real node_modules; the
 * renderer only evaluates the resulting string.
 */
export interface SceneBundle {
  /** Bundled CJS, or null when the scene failed to build. */
  code: string | null;
  /** Blocking failure, phrased for a human (and for the agent). */
  error: string | null;
  warnings: string[];
}

/**
 * A project folder in the shape the editor already speaks (`ProjectData`), plus
 * the desktop-only extras. Served verbatim by `GET /api/projects/:id`, so the
 * existing react-query hooks need no changes.
 */
export interface DesktopProject extends ProjectData {
  dir: string;
  /** Which runtime the folder is written for; decides which half of the editor shows. */
  engine: ProjectEngine;
  /** Present for `hyperframes` projects: the compiled composition and everything around it. */
  hyperframes: HyperframesState | null;
  bundles: Record<string, SceneBundle>;
  /** Scene files the manifest lists but disk doesn't have. */
  missing: string[];
  /** Manifest-level failure (bad JSON, schema violation) — everything else is stale. */
  manifestError: string | null;
  /** The folder itself is gone (moved, deleted, unmounted). Nothing to show. */
  folderMissing: boolean;
}

/** Which HyperFrames runtime the preview and export load, and why. */
export interface HyperframesRuntime {
  version: string;
  /** `project` is the folder's own `node_modules` copy; `app` the one this build carries. */
  source: "project" | "app";
  /** Shown in the editor when the choice is not the obvious one. */
  note: string | null;
}

/** The install that follows a new project, as the scaffolding banner shows it. */
export type ScaffoldState = InstallStep & { at: number };

/**
 * What the main process knows about a HyperFrames project after compiling it.
 *
 * The compiled document itself is not in here — it is served to the preview
 * iframe and the export window by URL — but everything the editor draws from
 * it is: the timeline, the lint findings, the source files for the Code view.
 */
export interface HyperframesState {
  /** Bumped per compile. The preview keys its iframe on it. */
  revision: number;
  /** From the root's `data-width`/`data-height`; null until a compile succeeds. */
  width: number | null;
  height: number | null;
  durationSeconds: number;
  timeline: CompositionTimeline;
  lint: LintReport;
  /** The compiler refused the folder outright (no index.html, a broken sub-composition). */
  compileError: string | null;
  runtime: HyperframesRuntime;
  /** `index.html` and every `scenes/*.html`, for the Code view. */
  files: { path: string; code: string }[];
  scaffold: ScaffoldState | null;
}

/**
 * One export, as the Exports panel lists it.
 *
 * `ExportJobData` is the hosted renderer's wire shape and is all the export
 * button reads; the rest is what a list spanning every open project needs to
 * say which project a row belongs to and how long ago it was asked for. Kept
 * here rather than in `@genmotion/shared` because nothing hosted has a use for
 * it.
 */
export interface DesktopExportJob extends ExportJobData {
  /** The project folder — the same value as `projectId`, named for what it is. */
  projectDir: string;
  projectName: string;
  format: ExportFormat;
  /** Epoch ms. */
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  /** Known once the file exists. */
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  /** The file has since been moved or deleted — nothing to show in Finder. */
  fileMissing?: boolean;
  /** The project's card image as a data URL, only when asked for (the Exports page). */
  thumbnail?: string | null;
}

/**
 * Where the app is in the update cycle.
 *
 * `idle` covers both "no update" and "not checked yet" on purpose: from the
 * UI's side they are the same thing — nothing to show.
 */
export type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; version: string }
  | { status: "downloading"; version: string; percent: number }
  | { status: "ready"; version: string }
  | { status: "error"; message: string };

export interface RecentProject {
  dir: string;
  name: string;
  openedAt: number;
  /**
   * When the project folder was made.
   *
   * Taken from the folder rather than `project.json`, whose birth time resets
   * every time the timeline is saved — `writeManifest` writes a temp file and
   * renames over the old one, so the manifest is a new file after every edit.
   */
  createdAt: number;
  /** Read from the manifest when the list is built, for the project cards. */
  sceneCount: number;
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  /** Cached card image as a data URL, or null before one has been captured. */
  thumbnail: string | null;
}

/** Open tabs, as remembered between launches. */
export interface StoredTabs {
  /** Project folders, in tab order. */
  dirs: string[];
  /** The frontmost one, or null for the Home tab. */
  activeDir: string | null;
}

/** What comes back at launch: the remembered tabs that still exist, with names to label them before they load. */
export interface RestoredTabs {
  tabs: { dir: string; name: string }[];
  activeDir: string | null;
}

/**
 * Whether a project closed.
 *
 * `turn-running` is the one refusal: the agent is mid-turn there, and closing
 * would dispose the bundler its tools compile against. The renderer confirms
 * and retries with `force`, which stops the turn first.
 */
export type CloseProjectResult = { closed: true } | { closed: false; reason: "turn-running" };

/** Tab shortcuts the OS menu forwards to the renderer. */
export type TabCommand = "close" | "next" | "prev" | { select: number };

/** Which slice of the recents list to build. */
export interface RecentProjectRange {
  offset?: number;
  limit?: number;
}

export interface RecentProjectPage {
  items: RecentProject[];
  /** Projects still on disk, so the caller knows whether more can be asked for. */
  total: number;
}

export interface CreateProjectInput {
  /** Derived from the user's first prompt; the agent may rename it later. */
  name?: string;
  width?: number;
  height?: number;
  /** Omitted means the stored default (see `preferences.ts`) — the start screen's picker. */
  engine?: ProjectEngine;
}

/** Which template to copy, and what to call the copy. */
export interface RemixTemplateInput {
  templateId: string;
  /** Defaults to the template's own name. */
  name?: string;
}

/** Where a project folder lives, and what a new one starts as. */
export interface DesktopPaths {
  /** The folder the app allocates projects in. */
  projectsRoot: string;
}

/**
 * What a launch carried with it.
 *
 * `genmotion .` starts the app with the shell's working directory attached;
 * a plain launch from the Dock has none.
 */
export interface LaunchContext {
  /** Absolute path the app was launched from, or null. */
  dir: string | null;
  /** True when that folder is itself a GenMotion project, so it can be opened. */
  isProject: boolean;
}

/** Where the `genmotion` shell command stands. See electron/cli.ts. */
export interface CliStatus {
  /** False on platforms where nothing is written yet — Windows, Linux. */
  supported: boolean;
  installed: boolean;
  /** True when an installed command points at *this* app rather than an old one. */
  current: boolean;
  /** Where the command is, or would go. */
  path: string;
  /** Present when installing failed, phrased for the menu. */
  error?: string;
}

// ── Account ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  onboardingCompleted: boolean;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
}

/**
 * Where the sign-in stands, as one value.
 *
 * `pending` carries the user code because the point of showing it is that the
 * human can compare it against the browser — a spinner alone would give them
 * nothing to check.
 */
export type AuthState =
  | { status: "loading" }
  | { status: "signed-out"; error?: string }
  | {
      status: "pending";
      provider: DesktopAuthProvider;
      userCode: string;
      verificationUrl: string;
      email?: string;
      /** Epoch ms; the code is refused after this. */
      expiresAt: number;
    }
  | { status: "signed-in"; user: AuthUser; organization: AuthOrganization | null };

export interface DesktopAuthApi {
  /** The state as of now — the renderer seeds from this, then subscribes. */
  state(): Promise<AuthState>;
  /** Opens the browser and starts polling. Email is only read for magic links. */
  start(provider: DesktopAuthProvider, email?: string): Promise<AuthState>;
  /** Reopen the browser for the attempt already in flight. */
  openBrowser(): Promise<void>;
  cancel(): Promise<void>;
  signOut(): Promise<void>;
  onChanged(listener: (state: AuthState) => void): () => void;
}

export interface DesktopApi {
  /** Base URL for the loopback API, secret prefix included. */
  readonly apiUrl: string;
  /** Creates in the app's own projects folder — the user is never asked where. */
  createProject(input: CreateProjectInput): Promise<DesktopProject>;
  /**
   * Copy a template into a brand-new project and open it.
   *
   * The bundle is fetched, checked, and written in the main process: the
   * renderer evaluates agent-authored scene code and has no business reaching
   * the filesystem. Returns the same value `createProject` does, so the
   * renderer navigates identically after either.
   */
  remixTemplate(input: RemixTemplateInput): Promise<DesktopProject>;
  /** Open a folder, or return the project already open at it — several can be open at once. */
  openProject(dir: string): Promise<DesktopProject>;
  /**
   * Close one project. While its agent is mid-turn the main process asks the
   * user first — a native dialog, like delete's — and `closed: false` means
   * they kept it. `force` skips the question.
   */
  closeProject(dir: string, options?: { force?: boolean }): Promise<CloseProjectResult>;
  /** Which project's tab is frontmost; null for Home. Drives the warm subprocess. */
  activateProject(dir: string | null): Promise<void>;
  /** Tabs remembered from the last launch, minus folders that have since gone. */
  restoreTabs(): Promise<RestoredTabs>;
  /** Fire-and-forget: remember the open tabs for next launch. */
  persistTabs(tabs: StoredTabs): void;
  /** A project was opened from outside the renderer — a deep link — and needs a tab. */
  onProjectOpened(listener: (project: DesktopProject) => void): () => void;
  /** A project was closed from the main process — deleted — and its tab should go. */
  onProjectClosed(listener: (dir: string) => void): () => void;
  /** A tab shortcut from the OS menu. */
  onTabCommand(listener: (command: TabCommand) => void): () => void;
  /** The install behind a new HyperFrames project moved; the banner follows it. */
  onScaffoldChanged(listener: (dir: string, state: ScaffoldState) => void): () => void;
  /** Run the HyperFrames install again for a project whose first attempt failed. */
  retryScaffold(dir: string): Promise<ScaffoldState>;
  /** Show a finished export in the file manager, by job id. */
  revealExport(id: string): Promise<void>;
  recentProjects(range?: RecentProjectRange): Promise<RecentProjectPage>;
  revealProject(dir: string): Promise<void>;
  /**
   * Confirm with the user, then move the project folder to the Trash and drop
   * it from the recents index. `deleted: false` means they cancelled — the
   * confirmation is native and lives in the main process, so a renderer that
   * ran agent-authored code cannot fake or skip it.
   */
  deleteProject(dir: string): Promise<{ deleted: boolean }>;
  /** Where the app is in the update cycle, and how to move it along. */
  update: {
    state(): Promise<UpdateState>;
    check(): Promise<UpdateState>;
    download(): Promise<UpdateState>;
    /** Quits and relaunches on the new version. Only valid once `ready`. */
    install(): Promise<void>;
    onChanged(listener: (state: UpdateState) => void): () => void;
  };
  /** Fires whenever the watcher rebuilds anything. */
  onProjectChanged(listener: (project: DesktopProject) => void): () => void;
  /**
   * Open a page of the hosted web app in the user's real browser.
   *
   * Billing and account settings are the web app's job — the desktop app has
   * no checkout — and they need the browser's session cookie anyway, which is
   * not something this window has.
   */
  openWeb(path: string): Promise<void>;
  /** The folder this launch came from, as of now. */
  launchContext(): Promise<LaunchContext>;
  /** A later `genmotion <path>` reached the running app. */
  onLaunchContext(listener: (context: LaunchContext) => void): () => void;
  /** The `genmotion` shell command: whether it is there, and putting it there. */
  cli: {
    status(): Promise<CliStatus>;
    install(): Promise<CliStatus>;
  };
  /** Folders the app owns, for the Settings screen. */
  paths(): Promise<DesktopPaths>;
  /** Open a folder in the OS file manager. */
  revealPath(target: string): Promise<void>;
  /** Signing in against the hosted API; see electron/auth.ts. */
  auth: DesktopAuthApi;
  /**
   * Record a product event.
   *
   * Fire-and-forget by design: the renderer hands the name over and moves on.
   * Queueing, batching, and the wait for a signed-in token all happen in the
   * main process, which is the only side holding one. See electron/analytics.ts.
   */
  track(event: string, properties?: Record<string, unknown>): void;
}

export const IPC = {
  createProject: "project:create",
  remixTemplate: "template:remix",
  paths: "app:paths",
  revealPath: "shell:reveal",
  openProject: "project:open",
  closeProject: "project:close",
  activateProject: "project:activate",
  projectOpened: "project:opened",
  projectClosed: "project:closed",
  restoreTabs: "tabs:restore",
  persistTabs: "tabs:persist",
  tabCommand: "tabs:command",
  revealExport: "export:reveal",
  recentProjects: "project:recent",
  revealProject: "project:reveal",
  deleteProject: "project:delete",
  updateState: "update:state",
  updateCheck: "update:check",
  updateDownload: "update:download",
  updateInstall: "update:install",
  updateChanged: "update:changed",
  openWeb: "shell:open-web",
  launchContext: "launch:context",
  launchContextChanged: "launch:changed",
  cliStatus: "cli:status",
  cliInstall: "cli:install",
  projectChanged: "project:changed",
  scaffoldChanged: "project:scaffold-changed",
  retryScaffold: "project:scaffold-retry",
  authState: "auth:state",
  authStart: "auth:start",
  authOpenBrowser: "auth:open-browser",
  authCancel: "auth:cancel",
  authSignOut: "auth:sign-out",
  authChanged: "auth:changed",
  track: "analytics:track",
} as const;
