import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

/** Content types for project assets — shared with the gm-asset protocol. */
export const ASSET_MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
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
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".avif": "image/avif",
  ".m4v": "video/x-m4v",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/** Content type for a project asset path, defaulting to a plain byte stream. */
export function mimeForAsset(file: string): string {
  return ASSET_MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

/** `Range: bytes=a-b` → an inclusive [start, end] inside a file of `size`. */
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? "");
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  // `bytes=-500` is the LAST 500 bytes, not the first 500.
  const start = rawStart ? Number(rawStart) : Math.max(0, size - Number(rawEnd || 0));
  const end = rawStart ? (rawEnd ? Math.min(Number(rawEnd), size - 1) : size - 1) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null;
  }
  return { start, end };
}

/**
 * Serve one project file, with byte ranges.
 *
 * The ranges are the whole point. This used to hand the request to
 * `net.fetch(file://…)` on the strength of that honouring `Range` — it does
 * not. It answers **200** with no `Content-Range`, no `Content-Length` and no
 * `Accept-Ranges`, while quietly returning only the requested bytes. Chromium's
 * media loader reads that as a stream it cannot seek, so `video.seekable` stays
 * empty and every `currentTime =` is dropped on the floor: measured on the real
 * export path, a <Video> reported `currentTime` 0.000 for all 60 frames of a
 * scene and decoded exactly one distinct frame — the clip frozen on the first
 * frame it ever loaded, which is the "the video doesn't play in my export"
 * report. Every render frame is a seek, so this is not a detail.
 */
export async function serveAssetFile(target: string, request: Request): Promise<Response> {
  let size: number;
  try {
    size = (await fs.stat(target)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "content-type": mimeForAsset(target),
    "accept-ranges": "bytes",
    "cache-control": "no-cache",
  };
  const range = parseRange(request.headers.get("range"), size);
  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  headers["content-length"] = String(end - start + 1);
  if (range) headers["content-range"] = `bytes ${start}-${end}/${size}`;

  // HEAD and a zero-length file both want the headers and nothing else.
  if (request.method === "HEAD" || size === 0) {
    return new Response(null, { status: range ? 206 : 200, headers });
  }
  const stream = createReadStream(target, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: range ? 206 : 200,
    headers,
  });
}
