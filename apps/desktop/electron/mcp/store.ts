import path from "node:path";
import fs from "node:fs/promises";
import { app, safeStorage } from "electron";
import type {
  OAuthClientInformationMixed,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { McpAuthKind, McpServerInput, McpServerPatch, McpTransport } from "@genmotion/shared";
import { mainDomain, mcpServerId } from "@genmotion/shared";
import { readSettings, update } from "../settings-store";

/**
 * Where a configured MCP server lives, split by what it would cost to leak.
 *
 * The shape of a server — name, URL, command — sits in `settings.json` with
 * every other preference, through the same serialised writer. What it sends
 * to authenticate — headers, env, OAuth tokens — sits in its own file,
 * encrypted with the OS keychain the way the session token in `auth.ts` is.
 * A settings file someone pastes into a bug report then carries no secret.
 */

export interface McpServerConfig {
  /** Slug from the name; also the `mcp__<id>__` tool prefix. */
  id: string;
  name: string;
  transport: McpTransport;
  url?: string;
  command?: string;
  args?: string[];
  enabled: boolean;
  source: "marketplace" | "custom";
  catalogId?: string;
  /** From the marketplace. A custom server has `iconDomain` instead. */
  iconUrl?: string;
  /** The site whose favicon stands in for an icon — see `mainDomain`. */
  iconDomain?: string;
  auth: McpAuthKind;
  /** When it was added — the list is shown in this order. */
  createdAt: number;
}

export interface McpOAuthState {
  clientInformation?: OAuthClientInformationMixed;
  tokens?: OAuthTokens;
  codeVerifier?: string;
  /** Epoch ms the access token stops working, from `expires_in` when saved. */
  expiresAt?: number;
}

export interface McpServerSecrets {
  headers?: Record<string, string>;
  env?: Record<string, string>;
  oauth?: McpOAuthState;
}

type SecretsFile = {
  encrypted: boolean;
  /** `JSON.stringify(Record<id, McpServerSecrets>)`, base64 of the ciphertext when encrypted. */
  payload: string;
};

function secretsFile(): string {
  return path.join(app.getPath("userData"), "mcp-secrets.json");
}

async function readSecretsAll(): Promise<Record<string, McpServerSecrets>> {
  const raw = await fs.readFile(secretsFile(), "utf8").catch(() => null);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as SecretsFile;
    const json = parsed.encrypted
      ? safeStorage.decryptString(Buffer.from(parsed.payload, "base64"))
      : parsed.payload;
    return JSON.parse(json) as Record<string, McpServerSecrets>;
  } catch {
    // Unreadable is unrecoverable — a keychain that changed, a half-written
    // file. The servers stay configured; they will ask to be authenticated
    // again, which is the honest outcome.
    return {};
  }
}

/** One writer, like `settings-store`: two saves in flight must not lose keys. */
let queue: Promise<unknown> = Promise.resolve();

function writeSecretsAll(
  mutate: (all: Record<string, McpServerSecrets>) => Record<string, McpServerSecrets>,
): Promise<Record<string, McpServerSecrets>> {
  const next = queue.then(async () => {
    const merged = mutate(await readSecretsAll());
    const json = JSON.stringify(merged);
    const encrypted = safeStorage.isEncryptionAvailable();
    const stored: SecretsFile = {
      encrypted,
      payload: encrypted ? safeStorage.encryptString(json).toString("base64") : json,
    };
    const file = secretsFile();
    const tmp = `${file}.tmp`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(stored), { encoding: "utf8", mode: 0o600 });
    await fs.rename(tmp, file);
    return merged;
  });
  queue = next.catch(() => {});
  return next;
}

export async function listConfigs(): Promise<McpServerConfig[]> {
  const settings = await readSettings();
  return [...(settings.mcpServers ?? [])].sort((a, b) => a.createdAt - b.createdAt);
}

export async function getConfig(id: string): Promise<McpServerConfig | null> {
  return (await listConfigs()).find((s) => s.id === id) ?? null;
}

export async function getSecrets(id: string): Promise<McpServerSecrets> {
  return (await readSecretsAll())[id] ?? {};
}

export function setSecrets(
  id: string,
  mutate: (current: McpServerSecrets) => McpServerSecrets | null,
): Promise<void> {
  return writeSecretsAll((all) => {
    const next = mutate(all[id] ?? {});
    const { [id]: _dropped, ...rest } = all;
    return next ? { ...rest, [id]: next } : rest;
  }).then(() => undefined);
}

/** Derived at add time, and again on read for servers added before it existed. */
export function iconDomainOf(url: string | undefined): { iconDomain?: string } {
  if (!url) return {};
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return {};
  }
  const domain = mainDomain(hostname);
  return domain ? { iconDomain: domain } : {};
}

/** A slug nobody else has: `figma`, then `figma-2`, and so on. */
function uniqueId(name: string, taken: Set<string>): string {
  const base = mcpServerId(name);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Blank strings are what an empty form field sends; treat them as unset. */
function clean(record: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!record) return undefined;
  const entries = Object.entries(record).filter(([k, v]) => k.trim() && v.trim());
  return entries.length ? Object.fromEntries(entries.map(([k, v]) => [k.trim(), v])) : undefined;
}

function validate(input: McpServerInput): void {
  if (!input.name?.trim()) throw new Error("Give the server a name.");
  if (input.transport === "http") {
    let parsed: URL;
    try {
      parsed = new URL(input.url ?? "");
    } catch {
      throw new Error("Enter the server's URL.");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("The URL has to start with http:// or https://.");
    }
  } else if (!input.command?.trim()) {
    throw new Error("Enter the command that starts the server.");
  }
}

export async function addServer(input: McpServerInput): Promise<McpServerConfig> {
  validate(input);
  // `genmotion` is the app's own server; a user's cannot shadow its tools.
  const reserved = new Set(["genmotion"]);
  let created: McpServerConfig | null = null;
  await update((settings) => {
    const existing = settings.mcpServers ?? [];
    const taken = new Set([...reserved, ...existing.map((s) => s.id)]);
    created = {
      id: uniqueId(input.name, taken),
      name: input.name.trim(),
      transport: input.transport,
      ...(input.transport === "http"
        ? { url: input.url!.trim() }
        : { command: input.command!.trim(), args: input.args?.filter(Boolean) ?? [] }),
      enabled: true,
      source: input.catalogId ? "marketplace" : "custom",
      ...(input.catalogId ? { catalogId: input.catalogId } : {}),
      ...(input.iconUrl ? { iconUrl: input.iconUrl } : {}),
      ...(!input.iconUrl && input.transport === "http" ? iconDomainOf(input.url!) : {}),
      auth: input.auth ?? "none",
      createdAt: Date.now(),
    };
    return { ...settings, mcpServers: [...existing, created] };
  });
  const config = created!;
  const headers = clean(input.headers);
  const env = clean(input.env);
  if (headers || env) {
    await setSecrets(config.id, () => ({ ...(headers ? { headers } : {}), ...(env ? { env } : {}) }));
  }
  return config;
}

/**
 * Edit a server. A secret map, when sent, is the whole set — but a key mapped
 * to `null` keeps what is stored, since the renderer never had the value to
 * send back. See `McpServerPatch`.
 */
export async function updateServer(id: string, patch: McpServerPatch): Promise<McpServerConfig> {
  let updated: McpServerConfig | null = null;
  await update((settings) => {
    const existing = settings.mcpServers ?? [];
    const current = existing.find((s) => s.id === id);
    if (!current) throw new Error("That server is no longer configured.");
    const merged: McpServerInput = {
      name: patch.name ?? current.name,
      transport: patch.transport ?? current.transport,
      url: patch.url ?? current.url,
      command: patch.command ?? current.command,
      args: patch.args ?? current.args,
    };
    validate(merged);
    updated = {
      ...current,
      name: merged.name.trim(),
      transport: merged.transport,
      ...(merged.transport === "http"
        ? { url: merged.url!.trim(), command: undefined, args: undefined }
        : { command: merged.command!.trim(), args: merged.args?.filter(Boolean) ?? [], url: undefined }),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      // A custom server moved to another site takes that site's icon along.
      ...(!current.iconUrl && merged.transport === "http" ? iconDomainOf(merged.url!) : { iconDomain: undefined }),
    };
    return { ...settings, mcpServers: existing.map((s) => (s.id === id ? updated! : s)) };
  });
  if (patch.headers !== undefined || patch.env !== undefined) {
    await setSecrets(id, (current) => ({
      ...current,
      ...(patch.headers !== undefined ? { headers: mergeSecret(current.headers, patch.headers) } : {}),
      ...(patch.env !== undefined ? { env: mergeSecret(current.env, patch.env) } : {}),
    }));
  }
  return updated!;
}

function mergeSecret(
  stored: Record<string, string> | undefined,
  patch: Record<string, string | null>,
): Record<string, string> | undefined {
  const next: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(patch)) {
    const key = rawKey.trim();
    if (!key) continue;
    if (value === null) {
      if (stored?.[key] !== undefined) next[key] = stored[key];
    } else if (value.trim()) {
      next[key] = value;
    }
  }
  return Object.keys(next).length ? next : undefined;
}

export async function removeServer(id: string): Promise<void> {
  await update((settings) => ({
    ...settings,
    mcpServers: (settings.mcpServers ?? []).filter((s) => s.id !== id),
  }));
  await setSecrets(id, () => null);
}
