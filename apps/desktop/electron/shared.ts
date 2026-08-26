/** Types crossing the IPC boundary. Imported by both the main process and the renderer. */
import type { DesktopAuthProvider, ProjectData } from "@genmotion/shared";

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
  bundles: Record<string, SceneBundle>;
  /** Scene files the manifest lists but disk doesn't have. */
  missing: string[];
  /** Manifest-level failure (bad JSON, schema violation) — everything else is stale. */
  manifestError: string | null;
  /** The folder itself is gone (moved, deleted, unmounted). Nothing to show. */
  folderMissing: boolean;
}

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
  pickProjectFolder(): Promise<string | null>;
  /** Creates in the app's own projects folder — the user is never asked where. */
  createProject(input: CreateProjectInput): Promise<DesktopProject>;
  openProject(dir: string): Promise<DesktopProject>;
  closeProject(): Promise<void>;
  recentProjects(range?: RecentProjectRange): Promise<RecentProjectPage>;
  revealProject(dir: string): Promise<void>;
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
  /** Signing in against the hosted API; see electron/auth.ts. */
  auth: DesktopAuthApi;
}

export const IPC = {
  pickProjectFolder: "dialog:pick-project",
  createProject: "project:create",
  openProject: "project:open",
  closeProject: "project:close",
  recentProjects: "project:recent",
  revealProject: "project:reveal",
  openWeb: "shell:open-web",
  projectChanged: "project:changed",
  authState: "auth:state",
  authStart: "auth:start",
  authOpenBrowser: "auth:open-browser",
  authCancel: "auth:cancel",
  authSignOut: "auth:sign-out",
  authChanged: "auth:changed",
} as const;
