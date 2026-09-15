import { create } from "zustand";
import type { DesktopProject } from "../api";
import type { HomeTab } from "../components/app-sidebar";
import type { SettingsSection } from "../screens/settings/sections";
import { formatHomeRoute, parseHomeRoute } from "./home-route";

/** The Home tab's id. Project tabs are keyed by their folder path. */
export const HOME_TAB = "home";

export interface ProjectTab {
  dir: string;
  name: string;
  /**
   * The project payload, or null for a tab restored at launch that has not
   * been opened yet — it hydrates the first time it comes to the front.
   */
  project: DesktopProject | null;
  /** The agent is mid-turn here. */
  busy: boolean;
  /** A turn finished while this tab was in the background, and nobody has looked since. */
  unread: boolean;
}

interface TabsState {
  tabs: ProjectTab[];
  /** `HOME_TAB` or a project dir. */
  activeId: string;
  /**
   * Which of Home's destinations is showing. Lives here rather than in
   * `HomeShell` so something outside it — the Exports panel's "Show all" —
   * can send the user to one.
   */
  homeView: HomeTab;
  setHomeView(view: HomeTab): void;
  /** Which of Settings' sections is showing; here for the same reason. */
  settingsSection: SettingsSection;
  setSettingsSection(section: SettingsSection): void;
  /** Add a project's tab, or update the one it already has. Does not focus it. */
  upsert(project: DesktopProject): void;
  /** A remembered tab, not yet opened. */
  addStub(dir: string, name: string): void;
  remove(dir: string): void;
  activate(id: string): void;
  setBusy(dir: string, busy: boolean): void;
  rename(dir: string, name: string): void;
}

/**
 * The one piece of genuinely app-wide editor state: which projects are open,
 * and which is in front. Everything else — selection, playhead, chat — lives
 * per tab.
 */
/** Where the URL says Home was, at load — see `home-route.ts`. */
const initialRoute = typeof window !== "undefined" ? parseHomeRoute(window.location.hash) : null;

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  activeId: HOME_TAB,
  homeView: initialRoute?.homeView ?? "create",
  setHomeView(homeView) {
    set({ homeView });
  },
  settingsSection: initialRoute?.settingsSection ?? "general",
  setSettingsSection(settingsSection) {
    set({ settingsSection });
  },
  upsert(project) {
    set((state) => {
      const index = state.tabs.findIndex((t) => t.dir === project.dir);
      if (index === -1) {
        return {
          tabs: [
            ...state.tabs,
            { dir: project.dir, name: project.name, project, busy: false, unread: false },
          ],
        };
      }
      const tabs = state.tabs.slice();
      tabs[index] = { ...tabs[index]!, name: project.name, project };
      return { tabs };
    });
  },
  addStub(dir, name) {
    set((state) =>
      state.tabs.some((t) => t.dir === dir)
        ? state
        : { tabs: [...state.tabs, { dir, name, project: null, busy: false, unread: false }] },
    );
  },
  remove(dir) {
    set((state) => {
      const index = state.tabs.findIndex((t) => t.dir === dir);
      if (index === -1) return state;
      const tabs = state.tabs.filter((t) => t.dir !== dir);
      // Closing the front tab lands on its right-hand neighbour, or the one
      // to its left at the end of the row, or Home when it was the last.
      let activeId = state.activeId;
      if (activeId === dir) {
        const next = tabs[index] ?? tabs[index - 1];
        activeId = next ? next.dir : HOME_TAB;
      }
      return { tabs, activeId };
    });
  },
  activate(id) {
    set((state) => ({
      activeId: id,
      // Looking at a tab is what clears its unread mark.
      tabs: state.tabs.map((t) => (t.dir === id && t.unread ? { ...t, unread: false } : t)),
    }));
  },
  setBusy(dir, busy) {
    set((state) => {
      const tab = state.tabs.find((t) => t.dir === dir);
      if (!tab || tab.busy === busy) return state;
      // The falling edge in a background tab is the moment worth marking:
      // something finished that the user has not seen.
      const unread = !busy && state.activeId !== dir ? true : tab.unread;
      return { tabs: state.tabs.map((t) => (t.dir === dir ? { ...t, busy, unread } : t)) };
    });
  },
  rename(dir, name) {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.dir === dir && t.name !== name ? { ...t, name } : t)),
    }));
  },
}));

/**
 * Report a chat's busy state to its tab. Called from the chat panel, which is
 * where `useChat`'s status lives — and whose value already includes the moment
 * between pressing send and the first token, which is what the tab should show.
 */
export function reportTabBusy(dir: string, busy: boolean): void {
  useTabsStore.getState().setBusy(dir, busy);
}

// The Home view mirrors into the hash, and the hash (back/forward, a typed
// link) mirrors into the view. `replaceState` for our own writes so every
// click is not a history entry; navigation only makes entries the user made.
if (typeof window !== "undefined") {
  useTabsStore.subscribe((state, previous) => {
    if (state.homeView === previous.homeView && state.settingsSection === previous.settingsSection) return;
    const next = formatHomeRoute({ homeView: state.homeView, settingsSection: state.settingsSection });
    if (window.location.hash !== next) window.history.replaceState(null, "", next);
  });
  window.addEventListener("hashchange", () => {
    const route = parseHomeRoute(window.location.hash);
    if (!route) return;
    const { homeView, settingsSection, setHomeView, setSettingsSection } = useTabsStore.getState();
    if (route.homeView !== homeView) setHomeView(route.homeView);
    if (route.settingsSection && route.settingsSection !== settingsSection) setSettingsSection(route.settingsSection);
  });
}
