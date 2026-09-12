/**
 * The skill pack this app ships to the agent, as a Claude Code plugin.
 *
 * `plugin/` beside `src/` holds `.claude-plugin/plugin.json` and `skills/*`,
 * the latter vendored from `heygen-com/hyperframes` by `scripts/sync-upstream.mjs`
 * (the tag it pulled is in `plugin/upstream.json`). Consumers copy the folder
 * next to their build — a packaged app cannot resolve a workspace path — so
 * this module only names what is in it.
 */

/** Skills upstream ships that make no sense without the CLI or a Figma token. */
export const EXCLUDED_SKILLS = ["hyperframes-cli", "figma", "remotion-to-hyperframes"] as const;

/** The plugin's name as Claude Code reports it, e.g. in `skill:` lines. */
export const PLUGIN_NAME = "hyperframes";
