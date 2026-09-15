import { app } from "electron";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { UnauthorizedError, auth } from "@modelcontextprotocol/sdk/client/auth.js";
import type { McpServerInput, McpServerPatch, McpServerView, McpToolSummary } from "@genmotion/shared";
import { agentEnv } from "../agent/detect";
import { localServerUrl } from "../local-server";
import {
  AuthRequiredError,
  createProvider,
  hasPendingAuth,
  resetOAuth,
  takePending,
  tokenLooksUsable,
  useUrlClientId,
} from "./oauth";
import {
  addServer,
  getConfig,
  getSecrets,
  iconDomainOf,
  listConfigs,
  removeServer,
  updateServer,
  type McpServerConfig,
} from "./store";

/**
 * The configured MCP servers, and what we last learned about each.
 *
 * A server is *probed*, not held: connect, list its tools, disconnect. That
 * is enough for the status dot and the tool count, and it means a stdio
 * server is not running twice — the harness starts its own copy for a turn,
 * from the same config this file hands it. Probes run on launch, after any
 * change, and on request; the renderer polls while one is in flight.
 */

/** Which wire protocol an HTTP server turned out to speak. */
type HttpProtocol = "http" | "sse";

interface Runtime {
  status: McpServerView["status"];
  tools: McpToolSummary[];
  error?: string;
  checkedAt?: number;
  protocol?: HttpProtocol;
}

/** What the Claude Agent SDK's `mcpServers` option takes, structurally. */
export type ClaudeMcpConfig =
  | { type: "http"; url: string; headers?: Record<string, string> }
  | { type: "sse"; url: string; headers?: Record<string, string> }
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string> };

export interface HarnessConfigs {
  claude: Record<string, ClaudeMcpConfig>;
  /** `-c` entries for `codex exec`, plus the env the secrets travel in. */
  codex: { configLines: string[]; env: Record<string, string> };
}

/** Generous: a stdio server may be `npx`-ing itself into existence. */
const PROBE_TIMEOUT_MS = 30_000;

class McpManager {
  private runtime = new Map<string, Runtime>();
  private inflight = new Map<string, Promise<void>>();
  private listeners = new Set<() => void>();
  /** Transports mid-authorization, kept so the callback can finish on them. */
  private authTransports = new Map<string, StreamableHTTPClientTransport | SSEClientTransport>();
  private started = false;

  /** Fires after a config or status change — the harness needs re-warming. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /** Probe everything once. Safe to call repeatedly; only the first does work. */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.probeAll();
  }

  async list(): Promise<McpServerView[]> {
    const configs = await listConfigs();
    return Promise.all(configs.map((config) => this.view(config)));
  }

  private async view(config: McpServerConfig): Promise<McpServerView> {
    const runtime = this.runtime.get(config.id);
    const secrets = await getSecrets(config.id);
    const headerNames = Object.keys(secrets.headers ?? {});
    const envNames = Object.keys(secrets.env ?? {});
    return {
      id: config.id,
      name: config.name,
      transport: config.transport,
      url: config.url,
      command: config.command,
      args: config.args,
      enabled: config.enabled,
      source: config.source,
      catalogId: config.catalogId,
      iconUrl: config.iconUrl ?? faviconUrl(config.iconDomain ?? iconDomainOf(config.url).iconDomain),
      auth: config.auth,
      hasSecrets: headerNames.length > 0 || envNames.length > 0,
      secretHeaderNames: headerNames.length ? headerNames : undefined,
      secretEnvNames: envNames.length ? envNames : undefined,
      status: !config.enabled ? "disabled" : (runtime?.status ?? "connecting"),
      error: config.enabled ? runtime?.error : undefined,
      tools: runtime?.tools ?? [],
      checkedAt: runtime?.checkedAt,
    };
  }

  async probeAll(): Promise<void> {
    const configs = await listConfigs();
    await Promise.all(configs.filter((c) => c.enabled).map((c) => this.probe(c.id)));
  }

  /**
   * Connect, list tools, disconnect. `interactive` lets an OAuth server send
   * the user to the browser; everything but "Authenticate" leaves it false and
   * gets `needs-auth` instead.
   */
  probe(id: string, options: { interactive?: boolean } = {}): Promise<void> {
    const running = this.inflight.get(id);
    if (running && !options.interactive) return running;
    const task = this.doProbe(id, options.interactive ?? false).finally(() => {
      if (this.inflight.get(id) === task) this.inflight.delete(id);
    });
    this.inflight.set(id, task);
    return task;
  }

  private async doProbe(id: string, interactive: boolean): Promise<void> {
    const config = await getConfig(id);
    if (!config || !config.enabled) {
      this.runtime.delete(id);
      return;
    }
    const previous = this.runtime.get(id);
    this.runtime.set(id, { ...previous, status: "connecting", tools: previous?.tools ?? [] });
    this.emit();

    try {
      const result =
        config.transport === "http"
          ? await this.probeHttp(config, interactive)
          : await this.probeStdio(config);
      // Some servers answer `tools/list` to anyone and only refuse the calls
      // (Mux does). The catalog says which ones sign in; without a token,
      // "connected" would be a promise the first tool call breaks.
      const secrets = await getSecrets(id);
      const unsigned = config.auth === "oauth" && usesOAuth(config, secrets) && !secrets.oauth?.tokens;
      this.runtime.set(id, {
        status: unsigned ? "needs-auth" : "connected",
        tools: unsigned ? [] : result.tools,
        checkedAt: Date.now(),
        protocol: result.protocol,
      });
    } catch (err) {
      const needsAuth =
        err instanceof UnauthorizedError ||
        err instanceof AuthRequiredError ||
        (err instanceof Error && /\b401\b/.test(err.message));
      this.runtime.set(id, {
        status: needsAuth ? "needs-auth" : "error",
        tools: [],
        error: needsAuth ? undefined : describeError(err),
        checkedAt: Date.now(),
        protocol: previous?.protocol,
      });
    }
    this.emit();
  }

  private async probeHttp(
    config: McpServerConfig,
    interactive: boolean,
  ): Promise<{ tools: McpToolSummary[]; protocol: HttpProtocol }> {
    const url = new URL(config.url!);
    const secrets = await getSecrets(config.id);
    const headers = secrets.headers ?? {};
    // A server the user gave a token to is not also sent through OAuth: if the
    // token is wrong the answer is "fix the token", not a browser window.
    const authProvider = usesOAuth(config, secrets) ? createProvider(config.id, { interactive }) : undefined;

    const attempt = async (protocol: HttpProtocol) => {
      const transport =
        protocol === "sse"
          ? new SSEClientTransport(url, { authProvider, requestInit: { headers } })
          : new StreamableHTTPClientTransport(url, { authProvider, requestInit: { headers } });
      if (authProvider) this.authTransports.set(config.id, transport);
      const tools = await this.listTools(transport);
      return { tools, protocol };
    };

    // Streamable HTTP is the current transport; SSE is what older servers
    // speak. Try the one the last probe found, then the other on a plain
    // HTTP refusal — an auth demand is an answer, not a reason to switch.
    const first = this.runtime.get(config.id)?.protocol ?? (url.pathname.endsWith("/sse") ? "sse" : "http");
    try {
      return await attempt(first);
    } catch (err) {
      if (err instanceof UnauthorizedError || err instanceof AuthRequiredError) throw err;
      if (!looksLikeWrongTransport(err)) throw err;
      return attempt(first === "http" ? "sse" : "http");
    }
  }

  private async probeStdio(config: McpServerConfig): Promise<{ tools: McpToolSummary[]; protocol?: undefined }> {
    const secrets = await getSecrets(config.id);
    const base = agentEnv();
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(base)) if (value !== undefined) env[key] = value;
    Object.assign(env, secrets.env ?? {});
    const transport = new StdioClientTransport({
      command: config.command!,
      args: config.args ?? [],
      env,
      // Our stderr is nobody's console; the error message carries what matters.
      stderr: "ignore",
    });
    return { tools: await this.listTools(transport) };
  }

  private async listTools(
    transport: StreamableHTTPClientTransport | SSEClientTransport | StdioClientTransport,
  ): Promise<McpToolSummary[]> {
    const client = new Client({ name: "genmotion", version: app.getVersion() });
    try {
      await client.connect(transport, { timeout: PROBE_TIMEOUT_MS });
      const { tools } = await client.listTools(undefined, { timeout: PROBE_TIMEOUT_MS });
      return tools.map((tool) => ({
        name: tool.name,
        description: (tool.description ?? "").split("\n")[0]?.trim() ?? "",
      }));
    } finally {
      await client.close().catch(() => {});
    }
  }

  async add(input: McpServerInput): Promise<McpServerView> {
    const config = await addServer(input);
    void this.probe(config.id);
    this.emit();
    return this.view(config);
  }

  async update(id: string, patch: McpServerPatch): Promise<McpServerView> {
    const config = await updateServer(id, patch);
    if (config.enabled) void this.probe(id);
    else this.runtime.delete(id);
    this.emit();
    return this.view(config);
  }

  async remove(id: string): Promise<void> {
    await removeServer(id);
    this.runtime.delete(id);
    this.authTransports.delete(id);
    this.emit();
  }

  async refresh(id: string): Promise<McpServerView> {
    await this.probe(id);
    const config = await getConfig(id);
    if (!config) throw new Error("That server is no longer configured.");
    return this.view(config);
  }

  /**
   * "Authenticate": register afresh and send the user to the browser. Returns
   * as soon as the browser is open — the callback finishes the job.
   */
  async authenticate(id: string): Promise<McpServerView> {
    const config = await getConfig(id);
    if (!config) throw new Error("That server is no longer configured.");
    if (!usesOAuth(config, await getSecrets(id))) {
      throw new Error("This server does not sign in through the browser.");
    }
    await resetOAuth(id);
    // Straight to the SDK's flow — discovery, registration, the browser —
    // rather than connecting and hoping for a 401: a server that lists its
    // tools to anyone never sends one, and we still owe the user a sign-in.
    const previous = this.runtime.get(id);
    this.runtime.set(id, { ...previous, status: "connecting", tools: [] });
    this.emit();
    try {
      const urlClientId = await useUrlClientId(config.url!);
      const result = await auth(createProvider(id, { interactive: true, urlClientId }), { serverUrl: config.url! });
      if (result === "AUTHORIZED") {
        await this.probe(id);
      } else {
        this.runtime.set(id, { ...previous, status: "needs-auth", tools: [], error: undefined, checkedAt: Date.now() });
        this.emit();
      }
    } catch (err) {
      this.runtime.set(id, { status: "error", tools: [], error: describeError(err), checkedAt: Date.now() });
      this.emit();
    }
    return this.view(config);
  }

  /** The browser came back. Exchange the code and probe again. */
  async finishAuth(state: string, code: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
    const id = takePending(state);
    if (!id) return { ok: false, error: "This sign-in link has expired. Try Authenticate again." };
    const config = await getConfig(id);
    if (!config?.url) return { ok: false, error: "That server is no longer configured." };
    try {
      const transport = this.authTransports.get(id);
      if (transport) {
        await transport.finishAuth(code);
      } else {
        await auth(createProvider(id, { interactive: false }), {
          serverUrl: config.url,
          authorizationCode: code,
        });
      }
    } catch (err) {
      this.runtime.set(id, { status: "error", tools: [], error: describeError(err), checkedAt: Date.now() });
      this.emit();
      return { ok: false, error: describeError(err) };
    } finally {
      this.authTransports.delete(id);
    }
    await this.probe(id);
    return { ok: true, name: config.name };
  }

  isAuthPending(id: string): boolean {
    return hasPendingAuth(id);
  }

  /**
   * What the harness is handed for a turn: every enabled server the last
   * probe reached. A server that is mid-error is left out rather than passed
   * along to fail again inside the turn, where the message is worse.
   */
  async harnessConfigs(): Promise<HarnessConfigs> {
    const claude: Record<string, ClaudeMcpConfig> = {};
    const configLines: string[] = [];
    const env: Record<string, string> = {};

    for (const config of await listConfigs()) {
      const runtime = this.runtime.get(config.id);
      if (!config.enabled || runtime?.status !== "connected") continue;
      const secrets = await getSecrets(config.id);
      const codexKey = `mcp_servers.${codexServerName(config.id)}`;

      if (config.transport === "stdio") {
        const stdioEnv = secrets.env ?? {};
        claude[config.id] = {
          type: "stdio",
          command: config.command!,
          args: config.args ?? [],
          ...(Object.keys(stdioEnv).length ? { env: stdioEnv } : {}),
        };
        configLines.push(
          `${codexKey}.command=${toml(config.command!)}`,
          `${codexKey}.args=${tomlArray(config.args ?? [])}`,
          ...(Object.keys(stdioEnv).length ? [`${codexKey}.env=${tomlTable(stdioEnv)}`] : []),
          `${codexKey}.default_tools_approval_mode="approve"`,
        );
        continue;
      }

      const headers: Record<string, string> = { ...(secrets.headers ?? {}) };
      // A server that connected without a token is public; one that has a
      // token was signed into, and gets it fresh. A token that cannot be
      // refreshed drops the server from this turn — the row says so.
      if (usesOAuth(config, secrets) && secrets.oauth?.tokens) {
        const token = await this.freshToken(config);
        if (!token) continue;
        headers.Authorization = `Bearer ${token}`;
      }
      claude[config.id] = {
        type: runtime.protocol === "sse" ? "sse" : "http",
        url: config.url!,
        ...(Object.keys(headers).length ? { headers } : {}),
      };

      // Codex reads header values from env, so no secret sits in `ps`.
      const envHeaders: Record<string, string> = {};
      Object.entries(headers).forEach(([name, value], index) => {
        const variable = `GENMOTION_MCP_${config.id.replace(/-/g, "_").toUpperCase()}_H${index}`;
        env[variable] = value;
        envHeaders[name] = variable;
      });
      configLines.push(
        `${codexKey}.url=${toml(config.url!)}`,
        ...(Object.keys(envHeaders).length ? [`${codexKey}.env_http_headers=${tomlTable(envHeaders)}`] : []),
        `${codexKey}.default_tools_approval_mode="approve"`,
      );
    }
    return { claude, codex: { configLines, env } };
  }

  /** The access token, refreshed if it is about to expire. Null means re-auth. */
  private async freshToken(config: McpServerConfig): Promise<string | null> {
    if (!(await tokenLooksUsable(config.id))) {
      this.markNeedsAuth(config.id);
      return null;
    }
    const secrets = await getSecrets(config.id);
    const oauth = secrets.oauth!;
    const expiringSoon = oauth.expiresAt !== undefined && oauth.expiresAt < Date.now() + 60_000;
    if (!expiringSoon) return oauth.tokens!.access_token;
    try {
      // `auth` refreshes when it can and would otherwise redirect — which the
      // non-interactive provider turns into a throw.
      const result = await auth(createProvider(config.id, { interactive: false }), {
        serverUrl: config.url!,
      });
      if (result !== "AUTHORIZED") throw new AuthRequiredError();
      return (await getSecrets(config.id)).oauth?.tokens?.access_token ?? null;
    } catch {
      this.markNeedsAuth(config.id);
      return null;
    }
  }

  private markNeedsAuth(id: string): void {
    const previous = this.runtime.get(id);
    this.runtime.set(id, { ...previous, status: "needs-auth", tools: [], error: undefined, checkedAt: Date.now() });
    this.emit();
  }
}

/**
 * A custom server's icon, served through the loopback so the renderer's CSP
 * allows it — the API fetches and caches the site's favicon behind it.
 */
function faviconUrl(domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  try {
    return `${localServerUrl()}/api/mcp-favicon/${encodeURIComponent(domain)}`;
  } catch {
    return undefined;
  }
}

/**
 * Whether a server is signed into through the browser: an HTTP server the
 * user has not given a token to. The catalog's `auth` is advice; a pasted
 * header is a decision.
 */
function usesOAuth(config: McpServerConfig, secrets: { headers?: Record<string, string> }): boolean {
  return config.transport === "http" && Object.keys(secrets.headers ?? {}).length === 0;
}

/**
 * Codex names a server as a TOML key segment, where `-` needs quoting that a
 * `-c` override does not reliably get. Ids never contain `_`, so swapping is
 * reversible — `codexServerId` below is what the transcript reader uses.
 */
export function codexServerName(id: string): string {
  return id.replace(/-/g, "_");
}

export function codexServerId(name: string): string {
  return name.replace(/_/g, "-");
}

function toml(value: string): string {
  return JSON.stringify(value);
}

function tomlArray(values: string[]): string {
  return `[${values.map(toml).join(", ")}]`;
}

function tomlTable(record: Record<string, string>): string {
  return `{ ${Object.entries(record)
    .map(([key, value]) => `${toml(key)} = ${toml(value)}`)
    .join(", ")} }`;
}

/**
 * A streamable-HTTP client talking to an SSE server gets a 404 or 405 on its
 * first POST; the other way round, the GET for the event stream fails the
 * same way. Anything else — DNS, TLS, a real 500 — is the server's answer.
 */
function looksLikeWrongTransport(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /\b(400|404|405|406)\b/.test(message) || /SSE|text\/event-stream|Non-200/i.test(message);
}

function describeError(err: unknown): string {
  // Node's fetch says "fetch failed" and keeps the reason in `cause`.
  const base = err instanceof Error ? err : null;
  const cause = base?.cause instanceof Error ? base.cause : null;
  const message = base && cause && /fetch failed/i.test(base.message) ? cause.message : base ? base.message : String(err);
  // The SDK's messages are precise but long; keep the first clause.
  const short = message.replace(/^Error:\s*/i, "").split("\n")[0] ?? "";
  // A registration endpoint that answers 403 (Figma, for one) is an
  // allowlist: only clients it knows may sign in. The SDK reports the
  // non-JSON body it got instead, which reads like a parser bug.
  if (/HTTP 403/.test(short) && /Invalid OAuth error response|Forbidden/.test(short)) {
    return "This server only lets approved apps sign in (403 at registration).";
  }
  if (/does not support dynamic client registration/.test(short)) {
    return "This server doesn't register new apps; it needs a pre-registered client or a token.";
  }
  if (/ENOTFOUND|EAI_AGAIN/.test(short)) return "Can't resolve the server's address.";
  if (/ECONNREFUSED/.test(short)) return "The server refused the connection.";
  if (/ENOENT/.test(short)) return "The command was not found on this machine.";
  if (/timed? ?out/i.test(short)) return "The server didn't answer in time.";
  return short.length > 160 ? `${short.slice(0, 157)}…` : short;
}

export const mcpManager = new McpManager();
