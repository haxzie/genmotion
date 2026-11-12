import type { McpCatalog, McpCatalogEntry } from "@genmotion/shared";
import { cloudFetch } from "../auth";
import { listConfigs } from "./store";

/**
 * The plugin catalog, as the agent's tools read it.
 *
 * Served rather than shipped (see AGENTS.md), so the main process fetches it
 * and keeps it for the life of the process: it changes on a deploy, not while
 * someone is making a video, and `search_plugins` is called often enough on a
 * new request that a round trip per call would be felt.
 *
 * An unreachable catalog is an empty list, never a throw. Nothing here is on
 * the path of building a video — the worst case is that the agent carries on
 * without offering an integration.
 */

let cached: Promise<McpCatalogEntry[]> | null = null;

export async function catalogEntries(): Promise<McpCatalogEntry[]> {
  cached ??= cloudFetch("/api/mcp/catalog", { signal: AbortSignal.timeout(15_000) })
    .then((res) => (res.ok ? (res.json() as Promise<McpCatalog>) : null))
    .then((body) => body?.entries ?? [])
    .catch(() => []);
  const entries = await cached;
  // Don't hold an empty list: it is almost always a network blip, and the
  // next call is the one where the user has their connection back.
  if (entries.length === 0) cached = null;
  return entries;
}

/** Words too common to tell two plugins apart. */
const STOPWORDS = new Set([
  "the", "a", "an", "my", "our", "from", "with", "for", "and", "use", "using",
  "get", "pull", "make", "video", "app", "data", "into", "this", "that", "of",
  "in", "on", "to", "me", "it", "can", "you", "want", "need", "please",
]);

function terms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 1 && !STOPWORDS.has(word)),
    ),
  ];
}

/**
 * How well an entry answers the query.
 *
 * Weighted by where the word landed, because the thing a user names is nearly
 * always the product: "figma" in the name is a hit, "figma" somewhere in a
 * sentence about another plugin's integrations is a coincidence.
 */
function score(entry: McpCatalogEntry, words: string[]): number {
  const id = entry.id.toLowerCase();
  const name = entry.name.toLowerCase();
  const tags = entry.tags.map((tag) => tag.toLowerCase());
  const rest = `${entry.description} ${entry.category}`.toLowerCase();

  let total = 0;
  for (const word of words) {
    if (id === word || name === word) total += 10;
    else if (id.includes(word) || name.includes(word)) total += 6;
    else if (tags.some((tag) => tag.includes(word))) total += 4;
    else if (rest.includes(word)) total += 2;
  }
  return total;
}

/** What the user will be asked for when they press Connect. */
function authLabel(entry: McpCatalogEntry): string {
  if (entry.auth.kind === "oauth") return "one-click sign-in";
  if (entry.auth.kind === "header") return "needs an API key";
  return "no sign-in";
}

/**
 * `search_plugins`' body: the catalog, narrowed to a query, with each match
 * saying whether this machine has it.
 *
 * The connected flag is the whole point of answering from here rather than
 * letting the model guess from its own knowledge of what MCP servers exist:
 * a connected plugin means "use its tools", and an unconnected one means
 * "offer it with `recommend_integration`". Those are different turns.
 */
export async function searchPlugins(query: string, limit = 5): Promise<string> {
  const entries = await catalogEntries();
  if (entries.length === 0) {
    return "The plugin catalog is unreachable right now. Carry on without an integration.";
  }

  const configured = await listConfigs().catch(() => []);
  const connectedIds = new Set(
    configured.filter((server) => server.enabled && server.catalogId).map((server) => server.catalogId!),
  );

  const words = terms(query);
  const hits = entries
    .map((entry) => ({ entry, score: score(entry, words) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit);

  if (hits.length === 0) {
    return [
      `No plugin matches "${query}". The whole catalog is: ${entries.map((e) => e.id).join(", ")}.`,
      "If none of those is what the user asked for, say so in a sentence and build the video without it.",
    ].join("\n");
  }

  const blocks = hits.map(({ entry }, i) => {
    const state = connectedIds.has(entry.id) ? "CONNECTED" : "not connected";
    return [
      `${i + 1}. ${entry.id} — ${entry.name}   [${entry.category} · ${authLabel(entry)}]   ${state}`,
      `   ${entry.description}`,
      entry.tags.length ? `   ${entry.tags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    blocks.join("\n\n"),
    "A CONNECTED plugin's tools are already in your tool list as `mcp__<server>__…` — just call them.",
    "For one that is not, call `recommend_integration` with its id to put a Connect card in the chat. That does not pause the turn and its tools will not arrive until the user's next message, so say in one sentence what you will do meanwhile, and keep building.",
  ].join("\n\n");
}
