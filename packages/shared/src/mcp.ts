import { z } from "zod";
/**
 * MCP servers a user connects to the chat agent.
 *
 * Three parties read this file: the API serves the marketplace catalog, the
 * desktop main process keeps the configured servers and probes them, and the
 * renderer draws both. Like `plugins.ts`, it is pure and browser-safe so the
 * same types describe a server on every side of the loopback.
 *
 * Secrets never appear here. Headers, env and OAuth tokens live in an encrypted
 * file on the machine; what crosses to the renderer is `McpServerView`, which
 * only says *whether* a server has them.
 */

export type McpTransport = "http" | "stdio";

/**
 * How a server expects to be authenticated, as the marketplace declares it.
 *
 * `oauth` — the server publishes OAuth metadata and takes either a
 * dynamically registered client or a URL client id, so "Authenticate" is one
 * click. `header` — it wants a token the user pastes, sent on every request;
 * `tokenUrl` is where to mint one. `none` — public.
 */
export type McpCatalogAuth =
  | { kind: "none" }
  | { kind: "oauth" }
  | {
      kind: "header";
      /** The header the key goes in, e.g. `Authorization`. */
      headerName: string;
      /** Put in front of the key on the wire — `"Bearer "`, `"Key "` — so the user pastes only the key. */
      prefix?: string;
      /** Where to find the key, in one line. */
      hint: string;
      /** Where the vendor mints the token. Opened in the browser from the form. */
      tokenUrl?: string;
    };

/** `McpCatalogAuth["kind"]`, and the same word a configured server keeps. */
export type McpAuthKind = McpCatalogAuth["kind"];

export interface McpCatalogEntry {
  /** Stable slug; also the server id (and tool-name prefix) once connected. */
  id: string;
  name: string;
  /** One or two sentences — the card shows two lines of it. */
  description: string;
  category: string;
  /** https, or an image data URI — the renderer's CSP allows both for `img-src`. */
  iconUrl: string;
  /** The vendor's page about the server. */
  homepage: string;
  transport: McpTransport;
  url?: string;
  command?: string;
  args?: string[];
  auth: McpCatalogAuth;
  tags: string[];
}

export interface McpCatalog {
  entries: McpCatalogEntry[];
  /** Bumped when the list changes, so a client can tell a stale copy apart. */
  revision: string;
}

const httpsUrl = z.url({ protocol: /^https$/ });
/** A server URL: https, or plain http on this machine — a desktop app's own server. */
const serverUrl = z.union([httpsUrl, z.url({ protocol: /^http$/, hostname: /^(127\.0\.0\.1|localhost)$/ })]);
/** An icon: on an https CDN, or inlined as an image data URI. */
const iconUrl = z.union([httpsUrl, z.string().regex(/^data:image\/(svg\+xml|png|webp);base64,[A-Za-z0-9+/=]+$/)]);

/**
 * The shape every marketplace entry is checked against on the way in — see
 * `defineMcpCatalogEntry`. A header entry has to say which header and how to
 * get a token; an HTTP entry has to have a URL; a command entry, a command.
 */
export const mcpCatalogEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase words joined by hyphens"),
    name: z.string().min(1).max(40),
    description: z.string().min(1).max(160),
    category: z.string().min(1),
    iconUrl,
    homepage: httpsUrl,
    transport: z.enum(["http", "stdio"]),
    url: serverUrl.optional(),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    auth: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("none") }),
      z.object({ kind: z.literal("oauth") }),
      z.object({
        kind: z.literal("header"),
        headerName: z.string().min(1),
        prefix: z.string().optional(),
        hint: z.string().min(1),
        tokenUrl: httpsUrl.optional(),
      }),
    ]),
    tags: z.array(z.string().min(1)).max(4),
  })
  .refine((e) => (e.transport === "http" ? Boolean(e.url) : Boolean(e.command)), {
    message: "an http entry needs a url; a stdio entry needs a command",
  })
  .refine((e) => e.transport === "http" || e.auth.kind !== "oauth", {
    message: "a command has nothing to sign in to; use header or none",
  });

/**
 * Declare a marketplace entry. Validates at module load, so a bad entry
 * fails the API's startup (and its tests) rather than landing in a user's
 * "Needs attention".
 */
export function defineMcpCatalogEntry(entry: McpCatalogEntry): McpCatalogEntry {
  return mcpCatalogEntrySchema.parse(entry);
}

export type McpServerStatus = "connecting" | "connected" | "needs-auth" | "error" | "disabled";

export interface McpToolSummary {
  name: string;
  description: string;
}

/** A configured server as the renderer sees it — never carries a secret. */
export interface McpServerView {
  id: string;
  name: string;
  transport: McpTransport;
  url?: string;
  command?: string;
  args?: string[];
  enabled: boolean;
  source: "marketplace" | "custom";
  catalogId?: string;
  /** The icon to draw. For a custom server this is its domain's favicon, by way of the API. */
  iconUrl?: string;
  auth: McpAuthKind;
  /** Headers or env are set (so an Edit can offer to replace them). */
  hasSecrets: boolean;
  /** Which header / env names are set, so the edit form can show them without values. */
  secretHeaderNames?: string[];
  secretEnvNames?: string[];
  status: McpServerStatus;
  error?: string;
  tools: McpToolSummary[];
  /** When the last probe finished. Absent until the first one has. */
  checkedAt?: number;
}

/** What the renderer sends to add or edit a server. Secrets travel here, once. */
export interface McpServerInput {
  name: string;
  transport: McpTransport;
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
  env?: Record<string, string>;
  catalogId?: string;
  iconUrl?: string;
  auth?: McpAuthKind;
}

/**
 * The header a pasted key becomes: the catalog's prefix in front, unless the
 * user pasted it prefix and all — "Bearer Bearer x" helps nobody.
 */
export function apiKeyHeader(auth: Extract<McpCatalogAuth, { kind: "header" }>, key: string): Record<string, string> {
  const trimmed = key.trim();
  const prefix = auth.prefix ?? "";
  const value = prefix && trimmed.toLowerCase().startsWith(prefix.trim().toLowerCase() + " ") ? trimmed : prefix + trimmed;
  return { [auth.headerName]: value };
}

/** A configured server's input, straight from a catalog entry. */
export function catalogEntryToInput(entry: McpCatalogEntry): McpServerInput {
  return {
    name: entry.name,
    transport: entry.transport,
    url: entry.url,
    command: entry.command,
    args: entry.args,
    catalogId: entry.id,
    iconUrl: entry.iconUrl,
    auth: entry.auth.kind,
  };
}

/**
 * An edit. `headers`/`env` are the whole set when present: a key mapped to
 * `null` keeps the value already stored (the renderer never had it), a string
 * replaces it, and a key left out is removed.
 */
export interface McpServerPatch {
  name?: string;
  transport?: McpTransport;
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string | null>;
  env?: Record<string, string | null>;
  enabled?: boolean;
}

/** Tool names as the harness reports them: `mcp__<server>__<tool>`. */
export function mcpToolName(serverId: string, tool: string): string {
  return `mcp__${serverId}__${tool}`;
}

export function parseMcpToolName(name: string): { server: string; tool: string } | null {
  const match = /^mcp__([^_]+)__(.+)$/.exec(name);
  if (!match?.[1] || !match[2]) return null;
  return { server: match[1], tool: match[2] };
}

/**
 * A server's id, from its name.
 *
 * It doubles as the tool-name prefix, so it has to be safe inside
 * `mcp__<id>__<tool>`: lowercase, no underscores (they are the separator),
 * nothing a shell or a Codex config line would trip on.
 */
export function mcpServerId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "server";
}

/**
 * The site a server belongs to, for its favicon: `mcp.linear.app` → `linear.app`.
 *
 * The registrable domain, roughly — the last two labels, or three under a
 * country's second-level suffix (`bbc.co.uk`). A vendor's MCP host is nearly
 * always a subdomain of the brand, and the brand is whose icon we want.
 */
export function mainDomain(hostname: string): string | null {
  const labels = hostname.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length < 2 || labels.some((l) => !l)) return null;
  // Loopback and bare hosts have no favicon worth fetching.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname === "localhost") return null;
  const second = labels[labels.length - 2]!;
  const keep = labels.length >= 3 && /^(co|com|org|net|gov|edu|ac)$/.test(second) ? 3 : 2;
  return labels.slice(-keep).join(".");
}
