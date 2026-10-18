import type { HomeTab } from "../components/app-sidebar";
import { SETTINGS_SECTIONS, type SettingsSection } from "../screens/settings/sections";

/**
 * Home's destinations as URL hashes: `#/plugins`, `#/settings/agent`,
 * `#/brands/acme`.
 *
 * The app has no router — screens are store state — but a reload or relaunch
 * used to drop the user on Create whatever they had open, because that state
 * was only in memory. The hash is the one piece of URL the renderer owns, so
 * it carries the Home view: it survives a reload, back/forward walk it, and a
 * link can name a screen.
 */

const HOME_TABS: readonly HomeTab[] = ["create", "projects", "brands", "plugins", "exports", "settings"];

export interface HomeRoute {
  homeView: HomeTab;
  settingsSection?: SettingsSection;
  /**
   * Which brand is open, for `#/brands/<id>`.
   *
   * Unlike a settings section this is not checked against a list — brands are
   * a folder on disk, so the only thing that knows whether an id exists is the
   * screen that fetches it. A hash naming a deleted brand lands on the detail
   * panel's own "could not be read", which is the right place to say so.
   */
  brandId?: string;
}

/** Brand ids are slugs by construction; anything else is not one of ours. */
const BRAND_ID = /^[a-z0-9][a-z0-9-]*$/;

export function parseHomeRoute(hash: string): HomeRoute | null {
  const [view, section] = hash.replace(/^#\/?/, "").split("/");
  const tab = HOME_TABS.find((t) => t === view);
  if (!tab) return null;
  if (tab === "brands") {
    return { homeView: tab, ...(section && BRAND_ID.test(section) ? { brandId: section } : {}) };
  }
  if (tab !== "settings") return { homeView: tab };
  const known = SETTINGS_SECTIONS.find((s) => s.id === section)?.id;
  return { homeView: tab, ...(known ? { settingsSection: known } : {}) };
}

export function formatHomeRoute(route: HomeRoute): string {
  if (route.homeView === "settings" && route.settingsSection) {
    return `#/settings/${route.settingsSection}`;
  }
  if (route.homeView === "brands" && route.brandId) return `#/brands/${route.brandId}`;
  return `#/${route.homeView}`;
}
