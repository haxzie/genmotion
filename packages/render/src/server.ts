import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import { INTERNAL_DIR } from "@genmotion/project";
import { compileComposition, createProjectBundler, FILES_PREFIX, type CompiledComposition } from "./composition";
import { hostBundle } from "./host";
import { STUDIO_HTML } from "./studio-page";

/**
 * A loopback HTTP server for one project folder: the page Chromium renders,
 * the engine's host bundle, freshly bundled scenes, and the project's own
 * files. The renderer points headless Chromium at it; `genmotion dev` points
 * the user's browser at the same thing plus a player UI, so the preview and
 * the export are one page.
 */
export interface ProjectServer {
  url: string;
  port: number;
  projectDir: string;
  /** The last compile, recompiled on demand after any change. */
  composition(): Promise<CompiledComposition>;
  close(): Promise<void>;
}

export interface ServeOptions {
  projectDir: string;
  /** 0 (the default) picks a free port. */
  port?: number;
  host?: string;
  /** Serve the studio UI at `/` and push reloads on file changes. */
  studio?: boolean;
}

export const RENDER_PAGE = "/__gm/render";

const PAGE_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: transparent; overflow: hidden; }
</style></head><body><div id="root"></div><script src="/__gm/host.js"></script></body></html>`;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".hdr": "application/octet-stream",
  ".ktx2": "image/ktx2",
};

/** Folders whose changes never affect the picture. */
const IGNORED_DIRS = new Set(["node_modules", ".git", INTERNAL_DIR, "exports", "out", "dist"]);

export async function serveProject(options: ServeOptions): Promise<ProjectServer> {
  const bundler = createProjectBundler(options.projectDir);
  const projectDir = bundler.projectDir;
  // Probe once up front so a broken engine or missing manifest fails the
  // command that started the server, not the first page load.
  let current: Promise<CompiledComposition> | null = compileComposition(projectDir, bundler);
  const first = await current;
  let revision = 0;

  const composition = () => {
    if (!current) {
      current = compileComposition(projectDir, bundler);
      current.catch(() => {
        current = null;
      });
    }
    return current;
  };

  const clients = new Set<http.ServerResponse>();
  let watcher: fs.FSWatcher | null = null;
  if (options.studio) {
    let timer: NodeJS.Timeout | null = null;
    try {
      watcher = fs.watch(projectDir, { recursive: true }, (_event, file) => {
        if (!file) return;
        const top = String(file).split(/[\\/]/)[0] ?? "";
        if (IGNORED_DIRS.has(top) || String(file).endsWith(".tmp")) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          current = null;
          revision++;
          for (const client of clients) client.write(`event: change\ndata: ${revision}\n\n`);
        }, 120);
      });
    } catch {
      // Recursive watch is unsupported on some Linux kernels/Node builds; the
      // studio still works, it just needs a manual reload.
      watcher = null;
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const pathname = decodeURIComponent(url.pathname);

      if (pathname === RENDER_PAGE) return send(res, 200, MIME[".html"]!, PAGE_SHELL);
      if (pathname === "/" && options.studio) return send(res, 200, MIME[".html"]!, STUDIO_HTML);
      if (pathname === "/__gm/host.js") {
        return send(res, 200, MIME[".js"]!, await hostBundle(first.engine));
      }
      if (pathname === "/__gm/composition") {
        try {
          const compiled = await composition();
          return sendJson(res, 200, { ...compiled, manifest: undefined, revision });
        } catch (err) {
          return sendJson(res, 200, { error: err instanceof Error ? err.message : String(err), revision });
        }
      }
      if (pathname === "/__gm/events" && options.studio) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write(`event: hello\ndata: ${revision}\n\n`);
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }
      if (pathname.startsWith(FILES_PREFIX)) {
        return serveFile(req, res, projectDir, pathname.slice(FILES_PREFIX.length));
      }
      send(res, 404, "text/plain", "Not found");
    } catch (err) {
      send(res, 500, "text/plain", err instanceof Error ? err.message : String(err));
    }
  });

  const host = options.host ?? "127.0.0.1";
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, host, () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  return {
    url: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`,
    port,
    projectDir,
    composition,
    async close() {
      watcher?.close();
      for (const client of clients) client.end();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await bundler.dispose();
    },
  };
}

function send(res: http.ServerResponse, status: number, type: string, body: string | Buffer): void {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  send(res, status, MIME[".json"]!, JSON.stringify(body));
}

/**
 * A project file, contained to the project folder, with byte ranges — a
 * `<video>` element won't seek without them.
 */
function serveFile(req: http.IncomingMessage, res: http.ServerResponse, projectDir: string, relative: string): void {
  const absolute = path.resolve(projectDir, relative);
  const inside = path.relative(projectDir, absolute);
  if (inside.startsWith("..") || path.isAbsolute(inside)) return send(res, 403, "text/plain", "Outside the project");

  let stat: fs.Stats;
  try {
    stat = fs.statSync(absolute);
  } catch {
    return send(res, 404, "text/plain", `Not found: ${relative}`);
  }
  if (!stat.isFile()) return send(res, 404, "text/plain", `Not a file: ${relative}`);

  const type = MIME[path.extname(absolute).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.range ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.range) : null;
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2] || 0));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    if (start > end || start >= stat.size) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      return void res.end();
    }
    res.writeHead(206, {
      "Content-Type": type,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(absolute, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { "Content-Type": type, "Content-Length": stat.size, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" });
  fs.createReadStream(absolute).pipe(res);
}
