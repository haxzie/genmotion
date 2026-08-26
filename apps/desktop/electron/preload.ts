import { contextBridge, ipcRenderer } from "electron";
import type { DesktopAuthProvider } from "@genmotion/shared";
import { IPC, type AuthState, type DesktopApi, type DesktopProject } from "./shared";

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
  pickProjectFolder: () => ipcRenderer.invoke(IPC.pickProjectFolder),
  createProject: (input) => ipcRenderer.invoke(IPC.createProject, input),
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
  openWeb: (path: string) => ipcRenderer.invoke(IPC.openWeb, path),
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
};

contextBridge.exposeInMainWorld("genmotion", api);
// Read by the web app's `lib/api` through a Vite define, so its `API_URL`
// constant resolves to this launch's loopback server.
contextBridge.exposeInMainWorld("__GM_API_URL__", apiUrl);
