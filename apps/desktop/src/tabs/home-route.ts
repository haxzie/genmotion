import type { HomeTab } from "../components/app-sidebar";
import { SETTINGS_SECTIONS, type SettingsSection } from "../screens/settings/sections";

/**
 * Home's destinations as URL hashes: `#/marketplace`, `#/settings/agent`.
 *
 * The app has no router — screens are store state — but a reload or relaunch
 * used to drop the user on Create whatever they had open, because that state
 * was only in memory. The hash is the one piece of URL the renderer owns, so
 * it carries the Home view: it survives a reload, back/forward walk it, and a
 * link can name a screen.
 */

const HOME_TABS: readonly HomeTab[] = ["create", "templates", "marketplace", "exports", "settings"];

export interface HomeRoute {
  homeView: HomeTab;
  settingsSection?: SettingsSection;
}

export function parseHomeRoute(hash: string): HomeRoute | null {
  const [view, section] = hash.replace(/^#\/?/, "").split("/");
  const tab = HOME_TABS.find((t) => t === view);
  if (!tab) return null;
  if (tab !== "settings") return { homeView: tab };
  const known = SETTINGS_SECTIONS.find((s) => s.id === section)?.id;
  return { homeView: tab, ...(known ? { settingsSection: known } : {}) };
}

export function formatHomeRoute(route: HomeRoute): string {
  return route.homeView === "settings" && route.settingsSection
    ? `#/settings/${route.settingsSection}`
    : `#/${route.homeView}`;
}
