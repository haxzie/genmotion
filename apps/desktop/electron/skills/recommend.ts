import type { McpCatalog, McpCatalogEntry } from "@genmotion/shared";
import { cloudFetch } from "../auth";
import { listConfigs } from "../mcp/store";

/**
 * The `recommend_integration` tool's body.
 *
 * All it does is validate the id and tell the model what it just showed: the
 * card itself is drawn in the renderer from the tool call's own input (see
 * `tool-presentation.tsx`), so the main process never has to hand the catalog
 * entry across.
 *
 * Deliberately non-blocking, unlike `pick_voice`. That one parks the turn on
 * a click that takes five seconds; this one may need an OAuth round trip
 * through the browser that takes minutes or never finishes. A build must
 * never stall on an offer.
 */

let cached: Promise<McpCatalogEntry[]> | null = null;

async function catalog(): Promise<McpCatalogEntry[]> {
  cached ??= cloudFetch("/api/mcp/catalog", { signal: AbortSignal.timeout(15_000) })
    .then((res) => (res.ok ? (res.json() as Promise<McpCatalog>) : null))
    .then((body) => body?.entries ?? [])
    .catch(() => []);
  return cached;
}

export async function recommendIntegration(serverId: string): Promise<{ text: string; isError?: boolean }> {
  const entries = await catalog();
  const entry = entries.find((e) => e.id === serverId);
  if (entries.length > 0 && !entry) {
    return {
      text: `No marketplace server has id "${serverId}". Valid ids: ${entries.map((e) => e.id).join(", ")}.`,
      isError: true,
    };
  }

  const configured = (await listConfigs().catch(() => [])).find((s) => s.catalogId === serverId || s.id === serverId);
  if (configured?.enabled) {
    // Stops the nag loop: the model asked for something it already has.
    return { text: `${configured.name} is already connected. Use its tools directly.` };
  }

  const name = entry?.name ?? serverId;
  return {
    text: `Shown the user a card offering to connect ${name}. It does not pause this turn, and connecting it will not make its tools available until their next message. Say in one sentence what you will do without it, and carry on.`,
  };
}
