import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import type { UIMessage } from "ai";
import type { AssetData } from "@genmotion/shared";
import { readManifest, writeManifest, type ProjectManifest } from "@genmotion/project";
import type { ProjectSession } from "./project-session";
// Static, unlike the other agent imports: this is a two-line registry with no
// startup cost, and a lazily-imported copy risks being a *second* registry —
// the turn parks on one map and the answer lands in the other.
import { answerQuestion } from "./agent/questions";

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

type SessionRef = () => ProjectSession | null;

/** Sentinel: the route wrote directly to the socket (an event stream). */
const HANDLED = Symbol("handled");

/** The agent turn currently running, so a new one can supersede it. */
let inFlightTurn: AbortController | null = null;

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

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
};

export async function startLocalServer(
  getSession: SessionRef,
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
  let mcpUrl = "";

  const server = http.createServer((req, res) => {
    void handle(req, res).catch((err) => {
      send(res, 500, { error: err instanceof Error ? err.message : String(err) });
    });
  });

  async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const rawUrl = req.url ?? "/";
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

    const session = getSession();
    if (!session) {
      send(res, 409, { error: "No project is open" });
      return;
    }

    const result = await route(session, method, rest, url, req, res);
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

  /** `undefined` means no route; `HANDLED` means the response was written directly. */
  async function route(
    session: ProjectSession,
    method: string,
    segments: string[],
    url: URL,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<unknown | Response | undefined> {
    const [head, ...tail] = segments;

    if (head === "projects") return projectRoutes(session, method, tail, req);
    if (head === "assets") return assetRoutes(session, method, tail, url, req);
    if (head === "exports") return exportRoutes(session, method, tail, req, res);
    if (head === "mcp") return mcpRoute(session, method, req);
    if (head === "chat") {
      // An answer to an `AskUserQuestion` card. It arrives on its own request
      // because the turn that asked is still streaming on another one.
      if (method === "POST" && tail.at(-1) === "answer") return answerQuestionRoute(req);
      // The transcript lives in the project folder, so a conversation travels
      // with it — a page at a time, newest first, so opening a long-running
      // project costs the same as opening a new one.
      if (method === "GET") {
        const before = url.searchParams.get("before") ?? undefined;
        const limit = Number(url.searchParams.get("limit")) || undefined;
        return session.readTranscript({ before, limit });
      }
      if (method === "POST") return chatTurn(session, req, mcpUrl);
    }
    return undefined;
  }

  async function agentRoutes(method: string, req: http.IncomingMessage): Promise<unknown> {
    const { harnessState, setHarness } = await import("./agent/registry");
    if (method === "POST") {
      const body = await readJson<{ id?: string }>(req);
      if (!body.id) throw new Error("Missing harness id");
      return setHarness(body.id as Parameters<typeof setHarness>[0]);
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
    session: ProjectSession,
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

    const reply = await handleMcpMessage(session, await readJson<unknown>(req));
    // A notification has no reply — 202 is how the transport says "received".
    if (!reply) return new Response(null, { status: 202 });
    return new Response(JSON.stringify(reply), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  /**
   * Everything after the project id in `/api/projects/<id>/...`.
   *
   * The id here is the project's absolute folder path, so it spans many URL
   * segments — `/api/projects//Users/me/.genmotion/projects/foo/scenes/...`.
   * Splitting on "/" and taking one segment silently 404s every mutation the
   * editor makes, so the id is matched against the open session instead.
   */
  function pathAfterProjectId(session: ProjectSession, segments: string[]): string[] {
    // `segments` already excludes the "projects" prefix, so it begins with the id.
    const after = segments.map((part) => decodeURIComponent(part));
    const joined = after.join("/");
    const dirKey = session.dir.replace(/^\/+/, "");
    if (joined === dirKey) return [];
    if (joined.startsWith(`${dirKey}/`)) return joined.slice(dirKey.length + 1).split("/");
    // An id that isn't the folder path (a test, or a project addressed by name)
    // still occupies exactly one segment.
    return after.slice(1);
  }

  async function projectRoutes(
    session: ProjectSession,
    method: string,
    segments: string[],
    req: http.IncomingMessage,
  ): Promise<unknown | undefined> {
    const rest = pathAfterProjectId(session, segments);
    const [section, ...targetParts] = rest;
    // Scene ids are project-relative paths, so they arrive spread across
    // several URL segments (`.../scenes/scenes/01-intro.tsx`). Rejoin them.
    const target = targetParts.length > 0 ? targetParts.join("/") : undefined;

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
          if (typeof body.volume === "number") clip.volume = body.volume;
          if (body.name) clip.name = body.name;
        });
        return { ok: true };
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

  async function assetRoutes(
    session: ProjectSession,
    method: string,
    segments: string[],
    url: URL,
    req: http.IncomingMessage,
  ): Promise<unknown | undefined> {
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
    session: ProjectSession,
    method: string,
    segments: string[],
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<unknown | undefined> {
    const [target, action] = segments;
    const { cancelExport, latestExport, onExportChange, startExport } = await import(
      "./export/service"
    );

    if (target === "latest" && method === "GET") {
      const job = latestExport();
      // The button asks per project; a job from another folder isn't theirs.
      return job && job.projectId === session.dir ? job : null;
    }

    if (!target && method === "POST") {
      const body = await readJson<{ format?: "mp4" | "webm" | "gif" }>(req);
      return startExport(session, { format: body.format ?? "mp4" });
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
      const initial = latestExport();
      if (initial) write(initial);
      const off = onExportChange((job) => {
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
      mimeType: MIME[path.extname(rel).toLowerCase()] ?? "application/octet-stream",
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

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server has no port");

  const origin = `http://127.0.0.1:${address.port}`;
  mcpUrl = `${origin}${prefix}/api/mcp`;
  return {
    url: `${origin}${prefix}`,
    origin,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
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

  const text = messageText(last);
  if (!text.trim()) return jsonResponse(400, { error: "Empty message" });

  const [{ createClaudeCodeBackend }, { createCodexBackend }, { runTurnAsUiStream }, { harnessState }] =
    await Promise.all([
      import("./agent/claude-code"),
      import("./agent/codex"),
      import("./agent/ui-stream"),
      import("./agent/registry"),
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

  // The user's message is persisted before the turn runs, so an interrupted or
  // failed turn still leaves the transcript honest.
  await session.appendTranscript(last);

  // A new turn supersedes whatever was running. Without this, hitting retry
  // leaves the old turn alive: two agents editing the same files at once, both
  // billed to the user's plan.
  inFlightTurn?.abort();
  const controller = new AbortController();
  inFlightTurn = controller;
  req.on("close", () => controller.abort());

  return runTurnAsUiStream({
    backend,
    projectDir: session.dir,
    text,
    resumeSessionId: await session.readAgentSession(backend.id),
    signal: controller.signal,
    onFinish: async ({ message, sessionId }) => {
      if (inFlightTurn === controller) inFlightTurn = null;
      if (message) await session.appendTranscript(message);
      await session.writeAgentSession(sessionId, backend.id);
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

/** Flatten a UIMessage's text parts — the harness takes a plain prompt. */
function messageText(message: UIMessage): string {
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

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
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
