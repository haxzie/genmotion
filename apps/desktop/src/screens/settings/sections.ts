/**
 * The Settings sub-navigation, in the order it is shown.
 *
 * Its own file so the tabs store can name a section without importing the
 * screen — a link from elsewhere ("choose a model" from the composer, say)
 * needs the id and nothing else.
 */
export const SETTINGS_SECTIONS = [
  { id: "general", label: "General" },
  { id: "agent", label: "Agent" },
  { id: "account", label: "Account" },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["id"];
