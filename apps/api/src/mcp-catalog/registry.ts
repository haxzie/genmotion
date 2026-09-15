import type { McpCatalog, McpCatalogEntry } from "@genmotion/shared";

/**
 * Assemble the marketplace from its entries.
 *
 * Each entry has already been through `defineMcpCatalogEntry`, so what is
 * left to check is what one file cannot know about another: that no two
 * claim the same id. Order is the order given — the grid and the category
 * pills follow it, so the list is arranged by what a video needs first.
 */
export function createMcpCatalog(entries: McpCatalogEntry[]): McpCatalog {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) throw new Error(`MCP catalog: two entries with id "${entry.id}"`);
    seen.add(entry.id);
  }
  return { entries, revision: revisionOf(entries) };
}

/** FNV-1a over the serialised list: a different list is a different revision. */
function revisionOf(entries: McpCatalogEntry[]): string {
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(entries)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
