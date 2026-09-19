import { create } from "zustand";
import type { DesktopProject, RecentProject } from "../api";

/**
 * Projects the app has adopted into a tab this session, ahead of Home's own
 * fetch from disk.
 *
 * Home's list is paged and only loads once — it does not refetch when a tab
 * elsewhere creates or remixes a project, so without this a brand-new project
 * simply would not appear on the grid until the app restarted, and a user who
 * closed its tab before going back to Home would find nothing there and
 * assume the work was gone. `adopt()` in `App.tsx` writes here the moment a
 * project gets a tab; Home merges this in ahead of its fetched page.
 */
interface RecentProjectsStore {
  pending: RecentProject[];
  add(project: DesktopProject): void;
  clear(dir: string): void;
}

function toRecentProject(project: DesktopProject): RecentProject {
  const now = Date.now();
  return {
    dir: project.dir,
    name: project.name,
    openedAt: now,
    createdAt: now,
    sceneCount: project.scenes.length,
    totalFrames: project.scenes.reduce((n, s) => n + s.durationInFrames, 0),
    fps: project.fps,
    width: project.width,
    height: project.height,
    // Nothing has rendered a frame yet — the real thumbnail arrives once
    // Home's own fetch catches up with this project.
    thumbnail: null,
  };
}

export const useRecentProjectsStore = create<RecentProjectsStore>((set) => ({
  pending: [],
  add(project) {
    set((state) => ({
      pending: [toRecentProject(project), ...state.pending.filter((p) => p.dir !== project.dir)],
    }));
  },
  clear(dir) {
    set((state) => ({ pending: state.pending.filter((p) => p.dir !== dir) }));
  },
}));
