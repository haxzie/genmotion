import type { DesktopApi } from "../electron/shared";

declare global {
  interface Window {
    genmotion: DesktopApi;
    __GM_API_URL__: string;
  }
}

export const api: DesktopApi = window.genmotion;
export type { DesktopProject, RecentProject, SceneBundle } from "../electron/shared";
