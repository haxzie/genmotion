import { contextBridge, ipcRenderer } from "electron";
import type { DesktopAuthProvider } from "@genmotion/shared";
import {
  IPC,
  type AuthState,
  type DesktopApi,
  type DesktopProject,
  type LaunchContext,
  type UpdateState,
} from "./shared";

/** Passed in as a launch argument because the port isn't known until runtime. */
const apiUrl =
  process.argv.find((arg) => arg.startsWith("--gm-api-url="))?.slice("--gm-api-url=".length) ?? "";

/**
 * The only surface the renderer gets. Node stays in the main process — the
 * renderer runs agent-authored scene code, so it must not reach the filesystem
 * directly. Everything project-shaped goes over the loopback HTTP API instead,
 * which is what lets the web app's data layer run here unchanged.
 */
const api: DesktopApi = {
  apiUrl,
  createProject: (input) => ipcRenderer.invoke(IPC.createProject, input),
  remixTemplate: (input) => ipcRenderer.invoke(IPC.remixTemplate, input),
  openProject: (dir) => ipcRenderer.invoke(IPC.openProject, dir),
  closeProject: () => ipcRenderer.invoke(IPC.closeProject),
  recentProjects: (range) => ipcRenderer.invoke(IPC.recentProjects, range),
  revealProject: (dir) => ipcRenderer.invoke(IPC.revealProject, dir),
  onProjectChanged: (listener) => {
    const handler = (_event: unknown, project: DesktopProject) => listener(project);
    ipcRenderer.on(IPC.projectChanged, handler);
    return () => {
      ipcRenderer.off(IPC.projectChanged, handler);
    };
  },
  deleteProject: (dir: string) => ipcRenderer.invoke(IPC.deleteProject, dir),
  openWeb: (path: string) => ipcRenderer.invoke(IPC.openWeb, path),
  paths: () => ipcRenderer.invoke(IPC.paths),
  revealPath: (target: string) => ipcRenderer.invoke(IPC.revealPath, target),
  launchContext: () => ipcRenderer.invoke(IPC.launchContext),
  onLaunchContext: (listener) => {
    const handler = (_event: unknown, context: LaunchContext) => listener(context);
    ipcRenderer.on(IPC.launchContextChanged, handler);
    return () => {
      ipcRenderer.off(IPC.launchContextChanged, handler);
    };
  },
  cli: {
    status: () => ipcRenderer.invoke(IPC.cliStatus),
    install: () => ipcRenderer.invoke(IPC.cliInstall),
  },
  auth: {
    state: () => ipcRenderer.invoke(IPC.authState),
    start: (provider: DesktopAuthProvider, email?: string) =>
      ipcRenderer.invoke(IPC.authStart, provider, email),
    openBrowser: () => ipcRenderer.invoke(IPC.authOpenBrowser),
    cancel: () => ipcRenderer.invoke(IPC.authCancel),
    signOut: () => ipcRenderer.invoke(IPC.authSignOut),
    onChanged: (listener) => {
      const handler = (_event: unknown, state: AuthState) => listener(state);
      ipcRenderer.on(IPC.authChanged, handler);
      return () => {
        ipcRenderer.off(IPC.authChanged, handler);
      };
    },
  },
  // `send`, not `invoke`: nothing comes back and no caller should be made to
  // wait on analytics.
  track: (event: string, properties?: Record<string, unknown>) => {
    ipcRenderer.send(IPC.track, event, properties);
  },
  update: {
    state: () => ipcRenderer.invoke(IPC.updateState),
    check: () => ipcRenderer.invoke(IPC.updateCheck),
    download: () => ipcRenderer.invoke(IPC.updateDownload),
    install: () => ipcRenderer.invoke(IPC.updateInstall),
    onChanged: (listener) => {
      const handler = (_event: unknown, state: UpdateState) => listener(state);
      ipcRenderer.on(IPC.updateChanged, handler);
      return () => {
        ipcRenderer.off(IPC.updateChanged, handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld("genmotion", api);
// Read by the web app's `lib/api` through a Vite define, so its `API_URL`
// constant resolves to this launch's loopback server.
contextBridge.exposeInMainWorld("__GM_API_URL__", apiUrl);
