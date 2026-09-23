import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import type { UIMessage } from "ai";
import {
  PAYWALL_STATUS,
  type AssetData,
  type McpCatalog,
  type McpServerInput,
  type McpServerPatch,
} from "@genmotion/shared";
import { readManifest, writeManifest, type ProjectManifest } from "@genmotion/project";
import { ENTRY_FILE, splitAudioClip as splitHyperframesAudioClip } from "@genmotion/hyperframes";
import type { ProjectSession } from "./project-session";
import { getSession, listSessions } from "./session-registry";
import { mimeForAsset, serveAssetFile } from "./serve-file";
import type { MarkupRequest } from "./markup";

export { mimeForAsset };
// Static, unlike the other agent imports: this is a two-line registry with no
// startup cost, and a lazily-imported copy risks being a *second* registry —
// the turn parks on one map and the answer lands in the other.
import { answerQuestion } from "./agent/questions";
import { beginTurn, endTurn } from "./agent/turns";
import { readRemixOrigin } from "./remix";

/**
 * A loopback HTTP server speaking the same routes as the hosted Hono API, so
 * the editor UI — its react-query hooks, its XHR upload with progress, its
 * streaming chat transport — runs against a project folder without a single
 * call site changing.
 *
 * Every URL carries a per-launch secret as a path prefix. The listener is bound
 * to 127.0.0.1, but any process on the machine can reach a loopback port; the
 * prefix means they also have to guess the secret. It costs the client nothing
 * because it is simply part of the base URL.
 */
export interface LocalServer {
  /** Base URL the renderer should use as API_URL, secret prefix included. */
  readonly url: string;
  /** Origin the renderer itself is served from. */
  readonly origin: string;
  close(): Promise<void>;
}

/** Sentinel: the route wrote directly to the socket (an event stream). */
const HANDLED = Symbol("handled");

/**
 * The running server's base URL, secret prefix included.
 *
 * Main-process code that opens a *page* on the server — the offscreen window
 * a HyperFrames export renders in — needs an absolute URL, and nothing but
 * the server knows its port. Set once at listen.
 */
let serverUrl: string | null = null;

/** Organization endpoints the members page may reach — see the `org` route. */
const ORG_ACTIONS = new Set([
  "get-full-organization",
  "invite-member",
  "remove-member",
  "cancel-invitation",
  "update-member-role",
]);

export function localServerUrl(): string {
  if (!serverUrl) throw new Error("The local server is not running");
  return serverUrl;
}

/**
 * The preview document for a project, as a URL on this server.
 *
 * Exported for the export window; the renderer builds the same URL itself
 * from `apiUrl`. `revision` cache-busts: the document is regenerated on every
 * folder change and the iframe must never be served the previous compile.
 */
export function previewUrl(
  session: ProjectSession,
  options: { revision?: number; render?: boolean } = {},
): string {
  const dir = session.dir.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  const query = new URLSearchParams();
  if (options.revision !== undefined) query.set("r", String(options.revision));
  if (options.render) query.set("mode", "render");
  const suffix = query.size ? `?${query}` : "";
  return `${localServerUrl()}/api/projects/${dir}/preview/index.html${suffix}`;
}

/** Thrown by a route that was asked about a project no tab has open. */
/** See `handle()`: the one route that lives outside the secret prefix. */
const MCP_OAUTH_CALLBACK_PATH = "/mcp-oauth/callback";
/** The loopback port to try first — named in the API's OAuth client document. */
export const PREFERRED_PORT = 41297;

class ProjectNotOpen extends Error {
  constructor() {
    super("That project isn't open");
  }
}

/**
 * Cap for JSON bodies, which are read into memory.
 *
 * Generous because a chat turn posts its message history, and a turn with a
 * few large tool payloads in it is bigger than it looks. Asset uploads are NOT
 * bound by this — they stream to disk (see the upload route), because a video
 * is routinely larger than any sane JSON cap and buffering one in the main
 * process to write it straight back out helps nobody.
 */
const MAX_JSON_BYTES = 32 * 1024 * 1024;

/**
 * Cap for an asset.
 *
 * Generous rather than absent: the file is being copied into the project
 * folder, and a mis-drop of something enormous should fail fast rather than
 * fill the disk. 4GB is past any plausible b-roll clip.
 */
const MAX_ASSET_BYTES = 4 * 1024 * 1024 * 1024;

const AUDIO_EXT = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);

function assetKind(file: string): AssetData["kind"] {
  const ext = path.extname(file).toLowerCase();
  if (AUDIO_EXT.has(ext)) return "audio";
  if (VIDEO_EXT.has(ext)) return "video";
  return IMAGE_EXT.has(ext) ? "image" : "export";
}

/**
 * Which open project a URL path names, and what follows it.
 *
 * A project's id is its absolute folder path, so it spans many URL segments —
 * `/api/projects//Users/me/.genmotion/projects/foo/scenes/...`. With several
 * projects open the question is *which* folder the path starts with, and one
 * project can sit inside another's folder (`~/work` and `~/work/promo`), so
 * the longest match wins rather than the first. Exported for its test.
 */
export function matchProjectPath(
  sessions: readonly ProjectSession[],
  segments: readonly string[],
): { session: ProjectSession; rest: string[] } | null {
  const joined = segments.map((part) => decodeURIComponent(part)).join("/");
  let best: { session: ProjectSession; rest: string[] } | null = null;
  for (const session of sessions) {
    const key = session.dir.replace(/^\/+/, "");
    if (joined !== key && !joined.startsWith(`${key}/`)) continue;
    if (best && best.session.dir.length >= session.dir.length) continue;
    best = {
      session,
      rest: joined === key ? [] : joined.slice(key.length + 1).split("/"),
    };
  }
  return best;
}

/** `?projectId=<dir>` → the open session, or a 409 for the caller. */
function sessionFromQuery(url: URL): ProjectSession {
  const dir = url.searchParams.get("projectId");
  const session = dir ? getSession(dir) : null;
  if (!session) throw new ProjectNotOpen();
  return session;
}

export async function startLocalServer(
  /**
   * Directory of the built renderer. Serving the UI over http rather than
   * file:// gives it a real origin, so root-absolute asset paths written for
   * the web app (`/logo.svg`) resolve here too.
   */
  rendererDir?: string,
): Promise<LocalServer> {
  const secret = randomBytes(24).toString("base64url");
  const prefix = `/s/${secret}`;
  // Filled in once the port is known — a spawned harness needs an absolute URL.
  let origin = "";
  /**
   * The MCP endpoint for one project. The folder is in the path because the
   * harness is handed this URL at spawn and keeps it for the whole turn — it
   * has to land on its own project's bundler, whichever tab is in front.
   */
  const mcpUrlFor = (session: ProjectSession) =>
    `${origin}${prefix}/api/mcp/${session.dir
      .replace(/^\/+/, "")
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

  const server = http.createServer((req, res) => {
    void handle(req, res).catch((err) => {
      if (err instanceof ProjectNotOpen) {
        send(res, 409, { error: err.message });
        return;
      }
      send(res, 500, { error: err instanceof Error ? err.message : String(err) });
    });
  });

  async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const rawUrl = req.url ?? "/";
    // Where an MCP server's OAuth sends the browser back. Outside the secret
    // prefix on purpose: this URL is registered with a third party and sits
    // in the browser's history, so it must not carry the secret. The `state`
    // in the query is what ties it to a server, and it is good for one use.
    if (rawUrl.startsWith(MCP_OAUTH_CALLBACK_PATH) && (req.method ?? "GET") === "GET") {
      await mcpOAuthCallback(new URL(rawUrl, "http://localhost"), res);
      return;
    }
    if (!rawUrl.startsWith(`${prefix}/`)) {
      // Static UI files aren't secret, so they sit outside the secret prefix —
      // which is also what lets `/logo.svg` resolve.
      if (rendererDir && (req.method ?? "GET") === "GET") {
        const served = await serveStatic(rendererDir, rawUrl, res);
        if (served) return;
      }
      send(res, 404, { error: "Not found" });
      return;
    }
    const url = new URL(rawUrl.slice(prefix.length), "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const method = req.method ?? "GET";

    // /api/...
    const [api, ...rest] = segments;
    if (api !== "api") {
      send(res, 404, { error: "Not found" });
      return;
    }

    // Which harness drives the chat is a property of the machine, not of a
    // project — the start screen offers the choice before a folder exists.
    if (rest[0] === "agents") {
      send(res, 200, await agentRoutes(method, req));
      return;
    }

    // Machine-wide preferences, like the harness above — the start screen
    // offers them before any folder exists.
    if (rest[0] === "preferences") {
      send(res, 200, await preferenceRoutes(method, req));
      return;
    }

    // MCP servers are a property of the machine too, and the marketplace is
    // browsed from the start screen before any project is open.
    if (rest[0] === "mcp-servers") {
      send(res, 200, await mcpServerRoutes(method, rest.slice(1), req));
      return;
    }
    if (rest[0] === "mcp-catalog" && rest[1] && rest[2] === "token-link" && method === "POST") {
      send(res, 200, await openCatalogTokenLink(rest[1]));
      return;
    }
    if (rest[0] === "mcp-catalog") {
      await mcpCatalogProxy("/api/mcp/catalog", req, res, 15_000);
      return;
    }
    if (rest[0] === "mcp-favicon" && rest[1]) {
      await mcpCatalogProxy(`/api/mcp/favicon/${encodeURIComponent(rest[1])}`, req, res, 15_000);
      return;
    }
    // The team: the auth server's organization endpoints, called with the
    // desktop's bearer token. Only the handful Settings › Members needs;
    // an allowlist rather than a wildcard so this stays a members page and
    // not a tunnel to every auth route.
    if (rest[0] === "org" && rest[1] && ORG_ACTIONS.has(rest[1])) {
      const { desktopAuth } = await import("./auth");
      const action = rest[1];
      if (action === "get-full-organization") {
        const query = new URL(req.url ?? "/", "http://localhost").search;
        const result = await desktopAuth.request<unknown>(`/api/auth/organization/${action}${query}`);
        send(res, result.status, result.body);
        return;
      }
      if (method !== "POST") {
        send(res, 405, { error: "POST only" });
        return;
      }
      const result = await desktopAuth.request<unknown>(`/api/auth/organization/${action}`, {
        method: "POST",
        json: await readJson<unknown>(req),
      });
      send(res, result.status, result.body);
      return;
    }
    // Help & feedback, and "contact us": forwarded to the API with this
    // build's version stamped on, so the channel knows what they were on.
    if (rest[0] === "feedback" && method === "POST") {
      const { desktopAuth } = await import("./auth");
      const { app } = await import("electron");
      const body = await readJson<{ message?: string; topic?: string }>(req);
      const result = await desktopAuth.request<unknown>("/api/feedback", {
        method: "POST",
        json: { ...body, source: `desktop ${app.getVersion()} · ${process.platform}` },
      });
      send(res, result.status, result.body);
      return;
    }
    // The voices a voiceover can use, and a few seconds of each — for the
    // picker the agent puts in the chat. Signed calls to the API on the
    // account's behalf; the preview comes back through here because the
    // renderer's CSP plays media from this server only.
    if (rest[0] === "voices" && method === "GET") {
      const { desktopAuth } = await import("./auth");
      if (rest[1] && rest[2] === "preview") {
        const result = await desktopAuth.requestBinary(`/api/plugins/voices/${encodeURIComponent(rest[1])}/preview`);
        if (!result.ok) {
          send(res, result.status, result.body);
          return;
        }
        res.writeHead(200, { "content-type": result.mime, "cache-control": "private, max-age=86400" });
        res.end(result.bytes);
        return;
      }
      const result = await desktopAuth.request<unknown>("/api/plugins/voices");
      send(res, result.status, result.body);
      return;
    }

    // Entitlement is a property of the account, not of a folder, so this sits
    // above the "no project is open" check with the harness route.
    if (rest[0] === "billing" && rest[1] === "limits") {
      const limits = await billingLimitsRoute();
      send(res, limits.status, limits.body);
      return;
    }

    // The start screen shares folders too, and a folder picked there is held
    // until a project exists to grant it against — so this takes an optional
    // project rather than requiring one.
    if (rest[0] === "read-roots") {
      const dir = url.searchParams.get("projectId");
      const session = dir ? getSession(dir) : null;
      if (dir && !session) throw new ProjectNotOpen();
      const result = await readRootRoutes(session, method, url);
      if (result === undefined) {
        send(res, 404, { error: `No route for ${method} /${rest.join("/")}` });
        return;
      }
      send(res, 200, result);
      return;
    }

    // The gallery lives on the start screen, and a template is browsed and
    // remixed before any folder is open. Public upstream, so no token is
    // attached and it works signed-out too.
    if (rest[0] === "templates") {
      await templateProxy(rest.slice(1), url, req, res);
      return;
    }

    const result = await route(method, rest, url, req, res);
    if (result === undefined) {
      send(res, 404, { error: `No route for ${method} /${rest.join("/")}` });
      return;
    }
    if (result === HANDLED) return;
    if (result instanceof Response) {
      await pipeResponse(result, res);
      return;
    }
    send(res, 200, result);
  }

  /**
   * Every project-shaped route names its project, because several are open at
   * once and there is no "current" one to fall back on. `/projects/<dir>/…`
   * and `/chat/<dir>/…` carry it in the path; assets and exports carry it as
   * `?projectId=` or in the body; the MCP endpoint carries it in the path so a
   * spawned harness — which is handed a fixed URL — reaches its own project's
   * bundler.
   */
  async function route(
    method: string,
    segments: string[],
    url: URL,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<unknown | Response | undefined> {
    const [head, ...tail] = segments;

    if (head === "projects") {
      const match = matchProjectPath(listSessions(), tail);
      if (!match) throw new ProjectNotOpen();
      return projectRoutes(match.session, method, match.rest, req);
    }
    if (head === "assets") return assetRoutes(method, tail, url, req);
    if (head === "exports") return exportRoutes(method, tail, url, req, res);
    if (head === "mcp") {
      const match = matchProjectPath(listSessions(), tail);
      return mcpRoute(match?.session ?? null, method, req);
    }
    if (head === "chat") {
      // An answer to an `AskUserQuestion` card. It arrives on its own request
      // because the turn that asked is still streaming on another one — and it
      // names no project: the tool-call id alone says which turn is waiting.
      if (method === "POST" && tail.length === 1 && tail[0] === "answer") {
        return answerQuestionRoute(req);
      }
      const match = matchProjectPath(listSessions(), tail);
      if (!match) throw new ProjectNotOpen();
      const { session, rest } = match;
      // Called by the composer right before it retries a failed turn: `regenerate()`
      // drops the errored assistant bubble from the live view the moment it's
      // called, so whatever had already streamed in has to be on disk *before*
      // that happens or it's gone from this session for good. Idempotent by the
      // message's own id, same as the normal end-of-turn write — it either lands
      // ahead of that write or is a no-op once it does.
      if (method === "POST" && rest.at(-1) === "save-partial") {
        return savePartialRoute(session, req);
      }
      // The transcript lives in the project folder, so a conversation travels
      // with it — a page at a time, newest first, so opening a long-running
      // project costs the same as opening a new one.
      if (method === "GET") {
        const before = url.searchParams.get("before") ?? undefined;
        const limit = Number(url.searchParams.get("limit")) || undefined;
        const page = await session.readTranscript({ before, limit });
        // Only on the newest page: this is the composer's opening state, and
        // an older page is scrolled into a panel that already has a number.
        // `usage` may be null — the harness has not reported yet — and the
        // ring says "unknown" rather than inventing one from message count.
        return before ? page : { ...page, context: { usage: await session.readAgentContext() } };
      }
      if (method === "POST") return chatTurn(session, req, mcpUrlFor(session));
    }
    return undefined;
  }

  /**
   * The org's plan, proxied from the hosted API.
   *
   * The renderer cannot ask for this itself: the session token lives in the
   * main process and the window carries no cookie, so the only way the editor
   * learns whether chat plugins are available is through here. Passed straight
   * back so the desktop upgrade modal reads the same `LimitsResponse` the web
   * app's does.
   */
  async function billingLimitsRoute(): Promise<{ status: number; body: unknown }> {
    const { desktopAuth } = await import("./auth");
    const res = await desktopAuth
      .request<unknown>("/api/billing/limits")
      .catch(() => null);
    // Unreachable is not unentitled: the menu should say it cannot tell, not
    // wrongly offer an upgrade to someone who already pays.
    if (!res) return { status: 503, body: { error: "Can't reach GenMotion." } };
    return { status: res.status, body: res.body };
  }

  /**
   * The template catalog, proxied from the hosted API.
   *
   * The renderer cannot ask for this itself: its CSP allows `connect-src` from
   * its own origin only, so every poster, bundle and remix has to arrive
   * through here. That is also what keeps template audio playable — `media-src`
   * has no `https:` in it, and a same-origin URL needs none.
   */
  async function templateProxy(
    rest: string[],
    url: URL,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const { cloudFetch } = await import("./auth");
    const tail = rest.length ? `/${rest.map(encodeURIComponent).join("/")}` : "";
    const upstream = await cloudFetch(`/api/templates${tail}${url.search}`, {
      headers: { accept: req.headers.accept ?? "*/*" },
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null);

    if (!upstream) {
      send(res, 503, { error: "Can't reach GenMotion." });
      return;
    }
    await pipeUpstream(upstream, res);
  }

  /**
   * The MCP marketplace and its favicons, proxied from the hosted API for the
   * same reason the templates are: the renderer's CSP only lets it talk to
   * this server.
   */
  async function mcpCatalogProxy(
    upstreamPath: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    timeoutMs: number,
  ): Promise<void> {
    const { cloudFetch } = await import("./auth");
    const upstream = await cloudFetch(upstreamPath, {
      headers: { accept: req.headers.accept ?? "*/*" },
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => null);
    if (!upstream) {
      send(res, 503, { error: "Can't reach GenMotion." });
      return;
    }
    await pipeUpstream(upstream, res);
  }

  /**
   * "Create a token" on a marketplace card: open the vendor's page for it.
   *
   * The renderer names a catalog entry, not a URL — the catalog is served by
   * us, so the browser only ever opens somewhere we listed. Agent-authored
   * code runs in this renderer, which is why no "open anything" IPC exists.
   */
  async function openCatalogTokenLink(id: string): Promise<{ ok: boolean }> {
    const [{ cloudFetch }, { shell }] = await Promise.all([import("./auth"), import("electron")]);
    const catalog = (await cloudFetch("/api/mcp/catalog", { signal: AbortSignal.timeout(15_000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)) as McpCatalog | null;
    const entry = catalog?.entries.find((e) => e.id === id);
    const url = entry?.auth.kind === "header" ? entry.auth.tokenUrl : undefined;
    if (!url || !url.startsWith("https://")) return { ok: false };
    await shell.openExternal(url);
    return { ok: true };
  }

  /**
   * The user's MCP servers: list, add, edit, remove, re-probe, authenticate.
   *
   * Every change rewarms the open sessions (see `onChange` below): the
   * pre-spawned harness fixed its server list when it started.
   */
  async function mcpServerRoutes(
    method: string,
    rest: string[],
    req: http.IncomingMessage,
  ): Promise<unknown> {
    const { mcpManager } = await import("./mcp/manager");
    await mcpManager.start();
    const [id, action] = rest;

    if (!id) {
      if (method === "POST") {
        return mcpManager.add(await readJson<McpServerInput>(req));
      }
      return { servers: await mcpManager.list() };
    }
    if (action === "refresh" && method === "POST") return mcpManager.refresh(id);
    if (action === "auth" && method === "POST") return mcpManager.authenticate(id);
    if (action) throw new Error(`No route for ${method} /mcp-servers/${rest.join("/")}`);
    if (method === "PATCH") {
      return mcpManager.update(id, await readJson<McpServerPatch>(req));
    }
    if (method === "DELETE") {
      await mcpManager.remove(id);
      return { ok: true };
    }
    throw new Error(`No route for ${method} /mcp-servers/${rest.join("/")}`);
  }

  async function mcpOAuthCallback(url: URL, res: http.ServerResponse): Promise<void> {
    const { mcpManager } = await import("./mcp/manager");
    const state = url.searchParams.get("state") ?? "";
    const code = url.searchParams.get("code");
    const denied = url.searchParams.get("error");
    const result = !code
      ? { ok: false as const, error: denied ? `Sign-in was cancelled (${denied}).` : "No authorization code came back." }
      : await mcpManager.finishAuth(state, code);
    const page = oauthResultPage(result);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": Buffer.byteLength(page) });
    res.end(page);
  }

  async function preferenceRoutes(
    method: string,
    req: http.IncomingMessage,
  ): Promise<unknown> {
    const { projectDefaults, setProjectDefaults } = await import("./preferences");
    if (method === "POST") {
      const body = await readJson<{ width?: number; height?: number; fps?: number; engine?: "react" | "hyperframes" }>(req);
      return setProjectDefaults(body);
    }
    return projectDefaults();
  }

  async function agentRoutes(method: string, req: http.IncomingMessage): Promise<unknown> {
    const { harnessState, setHarness, setEffort } = await import("./agent/registry");
    if (method === "POST") {
      const body = await readJson<{ id?: string; model?: string; effort?: string }>(req);
      if (!body.id) throw new Error("Missing harness id");
      const id = body.id as Parameters<typeof setHarness>[0];
      if (body.effort) await setEffort(id, body.effort as Parameters<typeof setEffort>[1]);
      return setHarness(id, body.model ?? null);
    }
    return harnessState();
  }

  /**
   * The GenMotion tools, for a harness that can only reach MCP over a socket.
   *
   * Codex is handed this URL, so it ends up in a child process's arguments
   * where any local user can read it. The bearer token travels separately
   * through the environment, which is what actually guards the endpoint.
   */
  async function mcpRoute(
    session: ProjectSession | null,
    method: string,
    req: http.IncomingMessage,
  ): Promise<unknown | Response | undefined> {
    const { MCP_TOKEN, handleMcpMessage } = await import("./agent/mcp-http");
    if (req.headers.authorization !== `Bearer ${MCP_TOKEN}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    // A client closing its session; there is no per-connection state to drop.
    if (method === "DELETE") return new Response(null, { status: 204 });
    if (method !== "POST") return undefined;
    // The token was right but the project has closed under the harness.
    if (!session) throw new ProjectNotOpen();

    const reply = await handleMcpMessage(session, await readJson<unknown>(req));
    // A notification has no reply — 202 is how the transport says "received".
    if (!reply) return new Response(null, { status: 202 });
    return new Response(JSON.stringify(reply), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  /**
   * Folders outside the project that the agent may read.
   *
   * The picker is opened here, in the main process, rather than by handing the
   * renderer a path: a grant has to come from the user choosing a folder in a
   * native dialog, and a renderer that has just run agent-authored scene code
   * is not something to take a filesystem path from.
   *
   * Works with no project open, because the start screen offers the same
   * control: those picks are held for the run and applied to whatever project
   * is opened next. `pending` is which of the two the caller is looking at, so
   * the UI can say "shared with the project you create" rather than implying a
   * grant that does not exist yet.
   *
   * Every change with a project open re-warms the harness: the pre-spawned CLI
   * fixed its working roots and its system prompt when it started, and a folder
   * shared after that would be denied by a process that never heard about it.
   */
  async function readRootRoutes(
    session: ProjectSession | null,
    method: string,
    url: URL,
  ): Promise<unknown | undefined> {
    const roots = await import("./agent/read-roots");
    const state = async () => ({
      roots: session ? await roots.listReadRoots(session.dir) : roots.listSessionRoots(),
      pending: !session,
    });

    if (method === "GET") return state();

    if (method === "POST") {
      const { dialog } = await import("electron");
      const picked = await dialog.showOpenDialog({
        title: "Share a folder with the agent",
        message: "The agent can read this folder. It can still only write inside the project.",
        buttonLabel: "Share folder",
        properties: ["openDirectory"],
      });
      const dir = picked.canceled ? null : picked.filePaths[0];
      if (!dir) return { ...(await state()), cancelled: true };
      if (session) {
        await roots.grantReadRoot(session.dir, dir);
        await rewarm(session);
      } else {
        await roots.addSessionRoot(dir);
      }
      return state();
    }

    if (method === "DELETE") {
      const dir = url.searchParams.get("path");
      if (!dir) throw new Error("Missing path");
      // Dropped from both lists: a folder revoked with a project open would
      // otherwise come back the next time that project is opened, because the
      // session list is re-applied on every open.
      roots.removeSessionRoot(dir);
      if (session) {
        await roots.revokeReadRoot(session.dir, dir);
        await rewarm(session);
      }
      return state();
    }

    return undefined;
  }

  /** Replace the pre-spawned Claude Code process so it picks up new grants. */
  async function rewarm(session: ProjectSession): Promise<void> {
    const { warmClaudeCode } = await import("./agent/claude-code");
    warmClaudeCode(session);
  }

  async function projectRoutes(
    session: ProjectSession,
    method: string,
    /** What followed the project's folder in the path. */
    rest: string[],
    req: http.IncomingMessage,
  ): Promise<unknown | undefined> {
    const [section, ...targetParts] = rest;
    // Scene ids are project-relative paths, so they arrive spread across
    // several URL segments (`.../scenes/scenes/01-intro.tsx`). Rejoin them.
    const target = targetParts.length > 0 ? targetParts.join("/") : undefined;

    // The compiled HyperFrames composition and everything it loads. Served
    // as ordinary pages so the iframe and the export window get relative
    // asset paths, range requests for video, and a cacheable runtime for
    // free — the same three things the CLI's own preview server exists for.
    if (section === "preview") {
      if (method !== "GET" && method !== "HEAD") return undefined;
      return previewRoutes(session, target ?? "index.html", req);
    }

    // The project's card image, for the tab strip. Served rather than
    // inlined as a data URL: a tab re-renders often and the picture is the
    // heaviest thing about a project. `no-store` so a fresh capture after a
    // turn shows on the next request, not after a cache expires.
    if (section === "thumbnail" && method === "GET") {
      const { thumbnailPath } = await import("./export/thumbnail");
      const served = await serveAssetFile(thumbnailPath(session.dir), new Request("http://localhost/"));
      served.headers.set("cache-control", "no-store");
      return served;
    }

    // The preview's Screenshot button: the frame under the playhead as a PNG,
    // filed with the exports. See `export/screenshot.ts`.
    if (section === "screenshot" && method === "POST") {
      const body = await readJson<{ frame?: number }>(req);
      if (typeof body.frame !== "number") throw new Error("Expected a frame");
      const { captureScreenshot } = await import("./export/screenshot");
      return captureScreenshot(session, body.frame);
    }

    // The preview's Draw tool: strokes over a frame, rendered into a picture
    // for the agent to read. See `markup.ts`.
    if (section === "markup" && method === "POST") {
      const body = await readJson<Partial<MarkupRequest>>(req);
      if (typeof body.frame !== "number" || !Array.isArray(body.marks) || body.marks.length === 0) {
        throw new Error("Expected a frame and at least one mark");
      }
      const { renderMarkup } = await import("./markup");
      return renderMarkup(session, { frame: body.frame, marks: body.marks });
    }

    if (rest.length === 0) {
      if (method === "GET") return session.load();
      if (method === "PATCH") {
        const body = await readJson<{ name?: string }>(req);
        await mutate(session, (manifest) => {
          if (body.name?.trim()) manifest.name = body.name.trim();
        });
        return { ok: true };
      }
      return undefined;
    }

    if (section === "scenes") {
      if (target === "reorder" && method === "PATCH") {
        const body = await readJson<{ orderedSceneIds: string[] }>(req);
        await mutate(session, (manifest) => {
          const byFile = new Map(manifest.scenes.map((s) => [s.file, s]));
          const ordered = body.orderedSceneIds
            .map((id) => byFile.get(id))
            .filter((s): s is NonNullable<typeof s> => Boolean(s));
          // Anything the client didn't mention keeps its place at the end.
          const missing = manifest.scenes.filter((s) => !body.orderedSceneIds.includes(s.file));
          manifest.scenes = [...ordered, ...missing];
        });
        return { ok: true };
      }

      if (target && method === "PATCH") {
        const body = await readJson<{
          name?: string;
          durationInFrames?: number;
          audioVolume?: number;
        }>(req);
        await mutate(session, (manifest) => {
          const scene = manifest.scenes.find((s) => s.file === target);
          if (!scene) throw new Error(`Unknown scene ${target}`);
          if (body.name?.trim()) scene.name = body.name.trim();
          if (typeof body.durationInFrames === "number") {
            scene.durationInFrames = Math.max(1, Math.round(body.durationInFrames));
          }
          if (typeof body.audioVolume === "number") scene.audioVolume = body.audioVolume;
        });
        return { ok: true };
      }

      // Cut a scene in two at a frame of the entry. The file is copied so
      // the second half has an id of its own (a scene's id is its file), and
      // both entries keep the whole's timing: the code inside sees the
      // original length, the second starts where the cut was.
      if (target?.endsWith("/split") && method === "POST") {
        const file = target.slice(0, -"/split".length);
        const body = await readJson<{ atFrame?: number }>(req);
        const at = Math.round(body.atFrame ?? NaN);
        const manifest = await readManifest(session.dir);
        const scene = manifest.scenes.find((s) => s.file === file);
        if (!scene) throw new Error(`Unknown scene ${file}`);
        if (!Number.isFinite(at) || at < 1 || at >= scene.durationInFrames) {
          throw new Error("The cut has to fall inside the scene");
        }
        const copy = await uniqueSiblingPath(session.dir, file);
        await fs.copyFile(path.join(session.dir, file), path.join(session.dir, copy));
        await mutate(session, (m) => {
          const index = m.scenes.findIndex((s) => s.file === file);
          const first = m.scenes[index];
          if (!first) throw new Error(`Unknown scene ${file}`);
          const startFrom = first.startFrom ?? 0;
          const source = first.sourceDurationInFrames ?? startFrom + first.durationInFrames;
          m.scenes.splice(index + 1, 0, {
            ...first,
            file: copy,
            startFrom: startFrom + at,
            durationInFrames: first.durationInFrames - at,
            sourceDurationInFrames: source,
          });
          first.durationInFrames = at;
          first.sourceDurationInFrames = source;
        });
        return { file: copy };
      }

      if (target && method === "DELETE") {
        await mutate(session, (manifest) => {
          manifest.scenes = manifest.scenes.filter((s) => s.file !== target);
        });
        // The file goes to the project's trash rather than being destroyed:
        // deleting a scene should mean "not in the video", not "gone forever".
        await trashFile(session.dir, target);
        return { ok: true };
      }
    }

    if (section === "audio-clips") {
      if (!target && method === "POST") {
        const body = await readJson<AudioClipInput>(req);
        const id = randomUUID();
        await mutate(session, (manifest) => {
          manifest.audio.push({
            id,
            file: toProjectRelative(session, body.url),
            track: body.track ?? 0,
            startFrame: body.startFrame ?? 0,
            durationInFrames: Math.max(1, Math.round(body.durationInFrames ?? 90)),
            startFrom: body.startFrom ?? 0,
            volume: body.volume ?? 1,
            fadeInFrames: Math.max(0, Math.round(body.fadeInFrames ?? 0)),
            fadeOutFrames: Math.max(0, Math.round(body.fadeOutFrames ?? 0)),
            muted: body.muted ?? false,
            ...(body.name ? { name: body.name } : {}),
          });
        });
        return { id };
      }

      if (target && method === "PATCH") {
        const body = await readJson<Partial<AudioClipInput>>(req);
        await mutate(session, (manifest) => {
          const clip = manifest.audio.find((c) => c.id === target);
          if (!clip) throw new Error(`Unknown audio clip ${target}`);
          if (typeof body.track === "number") clip.track = body.track;
          if (typeof body.startFrame === "number") clip.startFrame = Math.max(0, Math.round(body.startFrame));
          if (typeof body.durationInFrames === "number") {
            clip.durationInFrames = Math.max(1, Math.round(body.durationInFrames));
          }
          if (typeof body.startFrom === "number") clip.startFrom = body.startFrom;
          if (typeof body.volume === "number") {
            // The schema's ceiling, applied here too: a client sending 50 is a
            // bug, and clamping beats writing a manifest that fails to parse.
            clip.volume = Math.min(2, Math.max(0, body.volume));
          }
          if (typeof body.fadeInFrames === "number") {
            clip.fadeInFrames = Math.max(0, Math.round(body.fadeInFrames));
          }
          if (typeof body.fadeOutFrames === "number") {
            clip.fadeOutFrames = Math.max(0, Math.round(body.fadeOutFrames));
          }
          if (typeof body.muted === "boolean") clip.muted = body.muted;
          if (body.name) clip.name = body.name;
        });
        return { ok: true };
      }

      // Cut a clip in two at a frame of the clip. Same source, same lane and
      // level; the second half seeks further into the file.
      if (target?.endsWith("/split") && method === "POST") {
        const clipId = target.slice(0, -"/split".length);
        const body = await readJson<{ atFrame?: number }>(req);
        const at = Math.round(body.atFrame ?? NaN);

        // HyperFrames has no manifest-level audio array — the timing lives on
        // the `<audio>` element itself, in index.html — so the cut is a text
        // edit to that file rather than a `mutate()` of project.json.
        if (session.engine === "hyperframes") {
          if (!Number.isFinite(at) || at < 1) throw new Error("The cut has to fall inside the clip");
          const manifest = await readManifest(session.dir);
          const state = session.hyperframes.state();
          const clip = state.timeline.audio.find((c) => c.id === clipId);
          if (!clip) throw new Error(`Unknown audio clip ${clipId}`);
          const entryPath = path.join(session.dir, ENTRY_FILE);
          const html = await fs.readFile(entryPath, "utf8");
          const { html: updated, newId } = splitHyperframesAudioClip(html, clipId, at / manifest.fps, {
            start: clip.start,
            duration: clip.duration ?? Math.max(0, state.durationSeconds - clip.start),
            mediaStart: clip.mediaStart,
          });
          await fs.writeFile(entryPath, updated, "utf8");
          return { id: newId };
        }

        const id = randomUUID();
        await mutate(session, (manifest) => {
          const index = manifest.audio.findIndex((c) => c.id === clipId);
          const first = manifest.audio[index];
          if (!first) throw new Error(`Unknown audio clip ${clipId}`);
          if (!Number.isFinite(at) || at < 1 || at >= first.durationInFrames) {
            throw new Error("The cut has to fall inside the clip");
          }
          // A fade belongs to the edge it sits on: the fade-in stays with the
          // first half, the fade-out goes with the second.
          manifest.audio.splice(index + 1, 0, {
            ...first,
            id,
            startFrame: first.startFrame + at,
            durationInFrames: first.durationInFrames - at,
            startFrom: Math.round((first.startFrom + at / manifest.fps) * 1000) / 1000,
            fadeInFrames: 0,
          });
          first.durationInFrames = at;
          first.fadeOutFrames = 0;
        });
        return { id };
      }

      if (target && method === "DELETE") {
        await mutate(session, (manifest) => {
          manifest.audio = manifest.audio.filter((c) => c.id !== target);
        });
        return { ok: true };
      }
    }

    return undefined;
  }

  async function previewRoutes(
    session: ProjectSession,
    target: string,
    req: http.IncomingMessage,
  ): Promise<Response> {
    if (session.engine !== "hyperframes") {
      return new Response("Not a HyperFrames project", { status: 404 });
    }
    const engine = session.hyperframes;
    // The editor sandboxes the preview iframe to an opaque origin, so a
    // composition that `fetch`es its own Lottie JSON or a 3D model is making
    // a cross-origin request to this server. These are the project's own
    // files, and nothing here is private to an origin.
    const noStore = { "cache-control": "no-store", "access-control-allow-origin": "*" };

    if (target === "index.html") {
      const html = engine.previewHtml();
      if (html === null) {
        return new Response(engine.compileError ?? "The composition has not compiled yet", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8", ...noStore },
        });
      }
      // `?mode=render` is the export window asking for the same document with
      // the runtime's capture mode switched on before any page script runs —
      // the flag HyperFrames' own renderer sets, so media and timelines are
      // driven by seeks rather than by a live clock.
      const render = new URL(req.url ?? "/", "http://localhost").searchParams.get("mode") === "render";
      return new Response(render ? engine.renderHtml(html) : html, {
        headers: { "content-type": "text/html; charset=utf-8", ...noStore },
      });
    }

    // `__gm/…` is what the compiler wrote the runtime and GSAP references as
    // (see `hyperframes/engine.ts`); both are the app's to serve.
    if (target === "__gm/runtime.js") {
      return new Response(await engine.runtimeScript(), {
        headers: { "content-type": "text/javascript; charset=utf-8", ...noStore },
      });
    }
    if (target === "__gm/gsap.min.js") {
      const { gsapSource } = await import("./hyperframes/vendor");
      return new Response(await gsapSource(), {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "max-age=3600",
          "access-control-allow-origin": "*",
        },
      });
    }

    // Anything else is a file the composition references — an asset, a
    // font, a script the agent installed — inside the project folder.
    // `.genmotion/` holds the transcript and the app's own state, which no
    // composition has a reason to load and no page should be able to read.
    // `target` arrived decoded — `matchProjectPath` decodes every segment.
    const file = path.resolve(session.dir, target);
    const inside = path.relative(session.dir, file);
    if (!inside || inside.startsWith("..") || path.isAbsolute(inside) || inside.startsWith(".genmotion")) {
      return new Response("Forbidden", { status: 403 });
    }
    const served = await serveAssetFile(
      file,
      new Request("http://localhost/", {
        method: req.method ?? "GET",
        headers: req.headers.range ? { range: req.headers.range } : {},
      }),
    );
    served.headers.set("access-control-allow-origin", "*");
    return served;
  }

  async function assetRoutes(
    method: string,
    segments: string[],
    url: URL,
    req: http.IncomingMessage,
  ): Promise<unknown | undefined> {
    // Every asset route says which project: the list and the upload always
    // have, and a delete now does too.
    const session = sessionFromQuery(url);
    // Asset ids are project-relative paths, so rejoin the segments.
    const target =
      segments.length > 0 ? segments.map((part) => decodeURIComponent(part)).join("/") : undefined;

    if (!target && method === "GET") return listAssets(session);

    if (target === "upload" && method === "POST") {
      const filename = url.searchParams.get("filename") ?? `upload-${Date.now()}`;
      const safe = path.basename(filename).replace(/[^\w.\- ]+/g, "_");
      const rel = await uniqueAssetPath(session.dir, safe);
      await fs.mkdir(path.join(session.dir, "assets"), { recursive: true });
      // Streamed, not buffered: a dropped video is commonly hundreds of
      // megabytes, and holding one in the main process only to write it back
      // out is memory spent for nothing — and was where a large file used to
      // fail with an unhelpful 500.
      const written = await streamToFile(req, path.join(session.dir, rel));
      return describeAsset(session, rel, written);
    }

    if (target && method === "DELETE") {
      if (!target.startsWith("assets/")) throw new Error("Not an asset");
      await trashFile(session.dir, target);
      return { ok: true };
    }

    return undefined;
  }

  async function exportRoutes(
    method: string,
    segments: string[],
    url: URL,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<unknown | undefined> {
    const [target, action] = segments;
    const { cancelExport, latestExport, listExports, onExportChange, startExport } = await import(
      "./export/service"
    );
    const { ExportPaywallError } = await import("./export/entitlement");

    // Every project's exports, newest first — this run's queue and the
    // remembered history behind it. The panel asks for a few; the page asks
    // for all of them with pictures.
    if (!target && method === "GET") {
      return listExports({
        limit: Number(url.searchParams.get("limit")) || undefined,
        thumbnails: url.searchParams.get("thumbnails") === "1",
      });
    }

    if (target === "latest" && method === "GET") {
      // The button asks per project; a job from another folder isn't theirs.
      return latestExport(sessionFromQuery(url).dir);
    }

    if (!target && method === "POST") {
      const body = await readJson<{ projectId?: string; format?: "mp4" | "webm" | "gif" }>(req);
      const session = body.projectId ? getSession(body.projectId) : null;
      if (!session) throw new ProjectNotOpen();
      // Same status and body the hosted `POST /api/exports` answers with —
      // the export button's `handleLimitError` already recognises this shape
      // and opens the upgrade modal without knowing which backend refused it.
      try {
        return await startExport(session, { format: body.format ?? "mp4" });
      } catch (err) {
        if (err instanceof ExportPaywallError) {
          return new Response(JSON.stringify(err.body), {
            status: PAYWALL_STATUS,
            headers: { "content-type": "application/json" },
          });
        }
        throw err;
      }
    }

    // One stream for the whole queue, for the Exports panel: the full list on
    // connect and again on every change. Unlike the per-job stream below it
    // never ends on its own — it lives as long as the panel does.
    if (target === "feed" && method === "GET") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      const limit = Number(url.searchParams.get("limit")) || undefined;
      // Writes are chained so a burst of progress events cannot land out of
      // order — each snapshot is awaited before the next is read.
      let chain: Promise<void> = Promise.resolve();
      const write = () => {
        chain = chain.then(async () => {
          const jobs = await listExports({ limit });
          if (!res.writableEnded) res.write(`event: exports\ndata: ${JSON.stringify(jobs)}\n\n`);
        });
      };
      write();
      const off = onExportChange(write);
      // Comments keep an idle connection from being reaped by anything in
      // between; the browser ignores them.
      const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
      res.on("close", () => {
        off();
        clearInterval(heartbeat);
      });
      return HANDLED;
    }

    if (target && action === "cancel" && method === "POST") {
      return { ok: cancelExport(target) };
    }

    if (target && action === "events" && method === "GET") {
      // Server-sent events: the export button already listens on this.
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      // Named `progress` events, matching the hosted API — the export button
      // subscribes with addEventListener("progress"), so an unnamed event
      // dispatches as "message" and is silently ignored.
      const write = (job: unknown) =>
        res.write(`event: progress\ndata: ${JSON.stringify(job)}\n\n`);
      const initial = (await listExports()).find((job) => job.id === target);
      if (initial) write(initial);
      // Filtered to this job: with a queue there are other jobs' changes on
      // the same listener, and the button must not see another project's
      // progress as its own.
      const off = onExportChange((job) => {
        if (job.id !== target) return;
        write(job);
        if (["done", "failed", "cancelled"].includes(job.status)) {
          off();
          res.end();
        }
      });
      res.on("close", off);
      return HANDLED;
    }

    return undefined;
  }

  async function listAssets(session: ProjectSession): Promise<AssetData[]> {
    const dir = path.join(session.dir, "assets");
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    const assets: AssetData[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith(".")) continue;
      const rel = `assets/${entry.name}`;
      const stat = await fs.stat(path.join(dir, entry.name)).catch(() => null);
      assets.push(describeAsset(session, rel, stat?.size ?? 0));
    }
    return assets;
  }

  function describeAsset(session: ProjectSession, rel: string, size: number): AssetData {
    return {
      id: rel,
      url: session.assetUrl(rel),
      kind: assetKind(rel),
      mimeType: mimeForAsset(rel),
      sizeBytes: size,
      filename: path.basename(rel),
    };
  }

  /** Apply a manifest edit and persist it; the watcher pushes the new state. */
  async function mutate(
    session: ProjectSession,
    apply: (manifest: ProjectManifest) => void,
  ): Promise<void> {
    const manifest = await readManifest(session.dir);
    apply(manifest);
    await writeManifest(session.dir, manifest);
  }

  /** Turn an asset URL from the client back into a manifest-relative path. */
  function toProjectRelative(session: ProjectSession, url: string): string {
    const prefixToStrip = `gm-asset://${session.assetKey}/`;
    if (url.startsWith(prefixToStrip)) {
      return decodeURIComponent(url.slice(prefixToStrip.length));
    }
    return url;
  }

  // A fixed port first, so the OAuth redirect an authorization server sees
  // is the one our client document names (see `mcp/oauth.ts`); any port when
  // it is taken — a second copy of the app, or something else on it.
  await new Promise<void>((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code !== "EADDRINUSE" && err.code !== "EACCES") {
        reject(err);
        return;
      }
      server.removeListener("error", onError);
      server.listen(0, "127.0.0.1", resolve);
    };
    server.once("error", onError);
    server.listen(PREFERRED_PORT, "127.0.0.1", () => {
      server.removeListener("error", onError);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server has no port");

  origin = `http://127.0.0.1:${address.port}`;
  serverUrl = `${origin}${prefix}`;

  // MCP servers: the OAuth redirect needs the port, so this waits for it. A
  // change to the list — or to a server's reachability — replaces every
  // pre-spawned harness, which fixed its `mcpServers` when it started.
  // Debounced: a launch-time probe of ten servers is ten changes.
  void (async () => {
    const [{ setCallbackUrl }, { mcpManager }] = await Promise.all([
      import("./mcp/oauth"),
      import("./mcp/manager"),
    ]);
    setCallbackUrl(`${origin}${MCP_OAUTH_CALLBACK_PATH}`);
    let timer: NodeJS.Timeout | null = null;
    mcpManager.onChange(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        const { refreshWarmClaudeCode } = await import("./agent/claude-code");
        refreshWarmClaudeCode(getSession);
      }, 500);
    });
    await mcpManager.start();
  })();
  return {
    url: `${origin}${prefix}`,
    origin,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
        // `close` alone waits for every connection to end, and an event
        // stream — the Exports panel's feed, a turn mid-stream — never does
        // on its own. Quitting must not hang on them.
        server.closeAllConnections();
      }),
  };
}

/**
 * One agent turn. The request is exactly what `useChat` sends, and the response
 * is exactly what it expects back — the desktop difference is only which
 * harness produces the tokens.
 */
async function chatTurn(
  session: ProjectSession,
  req: http.IncomingMessage,
  mcpUrl: string,
): Promise<Response> {
  const body = await readJson<{ messages?: UIMessage[] }>(req);
  const messages = body.messages ?? [];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return jsonResponse(400, { error: "Expected a trailing user message" });
  }

  const continuation = isContinuation(last);
  if (!continuation && !messageText(last).trim()) {
    return jsonResponse(400, { error: "Empty message" });
  }

  const [
    { createClaudeCodeBackend },
    { createCodexBackend },
    { runTurnAsUiStream },
    { harnessState },
    { buildRemixNote, buildContinueNote },
  ] = await Promise.all([
    import("./agent/claude-code"),
    import("./agent/codex"),
    import("./agent/ui-stream"),
    import("./agent/registry"),
    import("./agent/prompt"),
  ]);

  const { active, options } = await harnessState();
  const harness = options.find((o) => o.id === active);
  if (!harness?.supported || !harness.installed) {
    return jsonResponse(503, {
      error:
        harness?.unavailableReason ??
        "No agent is available. Install Claude Code or the Codex CLI and sign in, then try again.",
    });
  }

  const backend =
    active === "codex" ? createCodexBackend(session, mcpUrl) : createClaudeCodeBackend(session);

  // A continuation stands in for the turn the connection dropped: the
  // composer keeps the half-finished assistant bubble in place and sends this
  // instead of regenerating, so what's on screen and what the agent already
  // did both survive. The harness resumes the same session — it has the
  // partial work — and is told to carry on, with the request it was serving
  // for the thread that has nothing to resume.
  const text = continuation
    ? buildContinueNote(messageText(lastRequest(messages)) || "(not recorded)")
    : messageText(last);

  // The user's message is persisted before the turn runs, so an interrupted or
  // failed turn still leaves the transcript honest.
  await session.appendTranscript(last);

  // A new turn supersedes whatever was running *in this project*. Without
  // this, hitting retry leaves the old turn alive: two agents editing the same
  // files at once, both billed to the user's plan. Other projects' turns are
  // untouched — a tab in the background keeps working.
  const controller = beginTurn(session.dir);
  req.on("close", () => controller.abort());

  // A remixed template's agent is told so with the first message of a thread
  // — before it reads a request that, on its own, reads as "make a different
  // video". Only the thread's first message: a resumed thread has it in
  // history. The transcript keeps the user's message as they typed it; the
  // note is for the agent, not the chat.
  const resumeSessionId = await session.readAgentSession(backend.id);
  const remix = resumeSessionId ? null : await readRemixOrigin(session.dir);

  return runTurnAsUiStream({
    backend,
    projectDir: session.dir,
    text: remix ? `${buildRemixNote(remix)}\n\n${text}` : text,
    resumeSessionId,
    signal: controller.signal,
    // Best-effort: a checkpoint write failing must never take the turn down
    // with it, so errors are swallowed here rather than in ui-stream.ts,
    // which has no io of its own to know how to handle one failing.
    onCheckpoint: (message) => {
      void session.writeCheckpoint(message).catch(() => {});
    },
    onFinish: async ({ message, sessionId, context, checkpointId }) => {
      endTurn(session.dir, controller);
      // Stamped with the checkpoint's id so the two are one message on disk:
      // a checkpoint recovered by a later open must not sit beside the turn
      // it was a snapshot of.
      if (message) {
        await session.appendTranscript({
          ...message,
          metadata: { ...(message.metadata as object | undefined), checkpointId },
        });
      }
      await session.writeAgentSession(sessionId, backend.id, context);
      // The turn reached a real end — successful or not, the AI SDK still
      // ran flush() to get here — so whatever the checkpoint was standing in
      // for is now either persisted above or was never worth persisting
      // (an empty turn). Either way it's stale.
      await session.clearCheckpoint();
    },
  });
}

/**
 * Hand a chat answer to the turn parked on it.
 *
 * Nothing waiting is not an error worth shouting about — the turn was stopped,
 * or the question timed out — so it reports the outcome rather than throwing.
 */
async function answerQuestionRoute(req: http.IncomingMessage): Promise<Response> {
  const body = await readJson<{ toolCallId?: string; answers?: Record<string, string> }>(req);
  if (!body.toolCallId || !body.answers) {
    return jsonResponse(400, { error: "Expected a toolCallId and answers" });
  }
  const delivered = answerQuestion(body.toolCallId, body.answers);
  return jsonResponse(delivered ? 200 : 410, { delivered });
}

async function savePartialRoute(
  session: ProjectSession,
  req: http.IncomingMessage,
): Promise<Response> {
  const body = await readJson<{ message?: UIMessage }>(req);
  if (!body.message || body.message.role !== "assistant" || typeof body.message.id !== "string") {
    return jsonResponse(400, { error: "Expected an assistant message with an id" });
  }
  await session.appendTranscript(body.message);
  return jsonResponse(200, { saved: true });
}

function isContinuation(message: UIMessage): boolean {
  return (message.metadata as { continuation?: unknown } | undefined)?.continuation === true;
}

/** The user message the interrupted turn was answering — the last one that isn't itself a continuation. */
function lastRequest(messages: UIMessage[]): UIMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role === "user" && !isContinuation(m)) return m;
  }
  return undefined;
}

/** Flatten a UIMessage's text parts — the harness takes a plain prompt. */
function messageText(message: UIMessage | undefined): string {
  if (!message) return "";
  return (message.parts ?? [])
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface AudioClipInput {
  url: string;
  assetId?: string;
  name?: string;
  startFrame?: number;
  durationInFrames?: number;
  startFrom?: number;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  muted?: boolean;
  track?: number;
}

async function uniqueAssetPath(projectDir: string, filename: string): Promise<string> {
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  for (let n = 0; n < 500; n++) {
    const candidate = n === 0 ? `assets/${stem}${ext}` : `assets/${stem}-${n}${ext}`;
    const taken = await fs
      .access(path.join(projectDir, candidate))
      .then(() => true)
      .catch(() => false);
    if (!taken) return candidate;
  }
  return `assets/${stem}-${Date.now()}${ext}`;
}

/** Move a project file into `.genmotion/trash/` instead of unlinking it. */
/** `scenes/01-intro.tsx` → `scenes/01-intro-2.tsx`, or -3, -4… until one is free. */
async function uniqueSiblingPath(projectDir: string, relative: string): Promise<string> {
  const ext = path.extname(relative);
  const stem = relative.slice(0, -ext.length);
  for (let n = 2; n < 500; n++) {
    const candidate = `${stem}-${n}${ext}`;
    const taken = await fs
      .access(path.join(projectDir, candidate))
      .then(() => true)
      .catch(() => false);
    if (!taken) return candidate;
  }
  throw new Error(`Couldn't find a free name next to ${relative}`);
}

async function trashFile(projectDir: string, relative: string): Promise<void> {
  const source = path.join(projectDir, relative);
  const exists = await fs
    .access(source)
    .then(() => true)
    .catch(() => false);
  if (!exists) return;
  const trash = path.join(projectDir, ".genmotion", "trash");
  await fs.mkdir(trash, { recursive: true });
  const stamped = `${Date.now()}-${path.basename(relative)}`;
  await fs.rename(source, path.join(trash, stamped));
}

async function readBody(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    total += (chunk as Buffer).byteLength;
    if (total > MAX_JSON_BYTES) throw new Error("Request body too large");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

/**
 * Write a request body straight to disk, returning the bytes written.
 *
 * A partial file is removed rather than left behind: half a video that still
 * appears in the assets list is worse than no video, because nothing about it
 * looks wrong until it is used.
 */
async function streamToFile(
  req: http.IncomingMessage,
  destination: string,
): Promise<number> {
  const handle = await fs.open(destination, "w");
  let total = 0;
  try {
    for await (const chunk of req) {
      total += (chunk as Buffer).byteLength;
      if (total > MAX_ASSET_BYTES) throw new Error("That file is larger than 4GB.");
      await handle.write(chunk as Buffer);
    }
  } catch (err) {
    await handle.close();
    await fs.rm(destination, { force: true });
    throw err;
  }
  await handle.close();
  return total;
}

async function readJson<T>(req: http.IncomingMessage): Promise<T> {
  const body = await readBody(req);
  if (body.byteLength === 0) return {} as T;
  return JSON.parse(body.toString("utf8")) as T;
}

const STATIC_MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".map": "application/json",
  ".wasm": "application/wasm",
};

/** Serve a file from the built renderer. Returns false if there's nothing there. */
async function serveStatic(
  rendererDir: string,
  rawUrl: string,
  res: http.ServerResponse,
): Promise<boolean> {
  const requested = decodeURIComponent(new URL(rawUrl, "http://localhost").pathname);
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const file = path.resolve(rendererDir, relative);
  // Never serve outside the renderer directory, whatever the path contains.
  if (path.relative(rendererDir, file).startsWith("..")) return false;

  const body = await fs.readFile(file).catch(() => null);
  if (!body) return false;

  res.writeHead(200, {
    "content-type": STATIC_MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "content-length": body.byteLength,
    "cache-control": "no-store",
  });
  res.end(body);
  return true;
}

/** What the browser shows after an MCP server's OAuth redirect. */
function oauthResultPage(result: { ok: true; name: string } | { ok: false; error: string }): string {
  const escape = (text: string) =>
    text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const title = result.ok ? `Connected to ${escape(result.name)}` : "Couldn\u2019t connect";
  const body = result.ok
    ? "You can close this tab and go back to GenMotion."
    : `${escape(result.error)} Go back to GenMotion and try again.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0d;color:#e8e8ea;font:15px/1.5 -apple-system,system-ui,sans-serif}
main{max-width:26rem;padding:2rem;text-align:center}h1{font-size:1.25rem;font-weight:500;margin:0 0 .5rem}p{margin:0;color:#9a9aa2}</style></head>
<body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

/**
 * Headers worth carrying from an upstream response.
 *
 * An allowlist rather than a copy, because `content-encoding` must NOT be
 * forwarded: `fetch` has already decompressed the body by the time we see it,
 * so echoing "gzip" hands Chromium plain bytes it will try to inflate — a
 * poster that fails to decode with nothing in the console to say why.
 * `content-length` goes for the same reason; Node re-chunks the body itself.
 */
const FORWARDED_HEADERS = [
  "content-type",
  "cache-control",
  "etag",
  "last-modified",
  "accept-ranges",
  "content-range",
];

/** Pipe an upstream response through, keeping only headers that still apply. */
async function pipeUpstream(source: Response, res: http.ServerResponse): Promise<void> {
  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = source.headers.get(name);
    if (value !== null) headers[name] = value;
  }
  res.writeHead(source.status, headers);
  if (!source.body) {
    res.end();
    return;
  }
  const reader = source.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

async function pipeResponse(source: Response, res: http.ServerResponse): Promise<void> {
  const headers: Record<string, string> = {};
  source.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(source.status, headers);
  if (!source.body) {
    res.end();
    return;
  }
  const reader = source.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}
