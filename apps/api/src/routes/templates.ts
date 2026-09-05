import path from "node:path";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import { Hono } from "hono";
import { getObject } from "@genmotion/storage";
import {
  TEMPLATE_PAGE_SIZE,
  TemplateError,
  buildRemixBundle,
  getTemplate,
  listTemplatesPage,
  templateAssetPath,
  templatePosterPath,
  toSummary,
} from "@genmotion/templates";

/**
 * The starter templates.
 *
 * Public and unauthenticated, like `/api/releases`: nothing here is anyone's
 * private data, it is byte-identical for every account, and the desktop app
 * browses the gallery before a project — or a session — exists. Keeping it
 * anonymous is also what lets a poster load from a plain `<img src>`.
 *
 * The files ship inside the API image, so every route below is a filesystem
 * read behind a process-lifetime cache rather than anything that touches the
 * database.
 */
export const templateRoutes = new Hono();

/** JSON is cheap to rebuild but changes only on deploy. */
const JSON_CACHE = "public, max-age=300";
/** Bytes are addressed by `?v=<revision>`, so a hit can be held indefinitely. */
const IMMUTABLE = "public, max-age=31536000, immutable";
const BYTES_CACHE = "public, max-age=3600";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

const mimeFor = (file: string) => MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";

templateRoutes.get("/", async (c) => {
  const limitParam = Number(c.req.query("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : TEMPLATE_PAGE_SIZE;
  const { records, nextCursor } = await listTemplatesPage({
    cursor: c.req.query("cursor"),
    limit,
  });
  c.header("Cache-Control", JSON_CACHE);
  return c.json({ templates: records.map(toSummary), nextCursor });
});

templateRoutes.get("/:id", async (c) => {
  const record = await getTemplate(c.req.param("id")).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);

  // A client that already has this exact content needs none of it back.
  if (c.req.header("if-none-match") === `"${record.revision}"`) return c.body(null, 304);

  c.header("ETag", `"${record.revision}"`);
  c.header("Cache-Control", JSON_CACHE);
  return c.json(toSummary(record));
});

templateRoutes.get("/:id/files", async (c) => {
  const record = await getTemplate(c.req.param("id")).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);
  try {
    c.header("Cache-Control", JSON_CACHE);
    return c.json(await buildRemixBundle(record));
  } catch (err) {
    // A template that cannot be packaged is a catalog bug, not a bad request —
    // the CI check exists so this never reaches a user, and saying so plainly
    // is better than a 404 that reads as "no such template".
    if (err instanceof TemplateError) return c.json({ error: err.message }, 500);
    throw err;
  }
});

templateRoutes.get("/:id/poster", async (c) => {
  const id = c.req.param("id");
  const record = await getTemplate(id).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);

  const jpeg = await fs.readFile(templatePosterPath(id)).catch(() => null);
  if (!jpeg) return c.json({ error: "Not found" }, 404);

  c.header("Content-Type", "image/jpeg");
  c.header("Cache-Control", c.req.query("v") ? IMMUTABLE : BYTES_CACHE);
  c.header("ETag", `"${record.revision}"`);
  return c.body(new Uint8Array(jpeg));
});

/**
 * The pre-rendered MP4 a gallery/detail page actually plays.
 *
 * Rendered offline by `pnpm --filter @genmotion/templates render-video` (see
 * the `templates` skill), not by this process — this route only ever fetches
 * whatever landed at `templates/<id>/video.mp4` in R2. A template that hasn't
 * been rendered yet 404s here rather than falling back to anything live; the
 * client's job is to hide the player, not paper over a missing render.
 *
 * Range requests are forwarded to the store, same as the project-files proxy
 * (`routes/files.ts`) — what lets a `<video>` seek instead of buffering the
 * whole file from the start.
 */
templateRoutes.get("/:id/video", async (c) => {
  const id = c.req.param("id");
  const record = await getTemplate(id).catch(() => null);
  if (!record) return c.json({ error: "Not found" }, 404);

  try {
    const { body, contentLength, contentRange } = await getObject(
      `templates/${id}/video.mp4`,
      c.req.header("range"),
    );
    const headers: Record<string, string> = {
      "Content-Type": "video/mp4",
      "Cache-Control": c.req.query("v") ? IMMUTABLE : BYTES_CACHE,
      "Accept-Ranges": "bytes",
      ETag: `"${record.revision}"`,
    };
    if (contentLength !== undefined) headers["Content-Length"] = String(contentLength);
    if (contentRange) headers["Content-Range"] = contentRange;
    return new Response(Readable.toWeb(body) as ReadableStream, {
      status: contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "InvalidRange") {
      return c.json({ error: "Range not satisfiable" }, 416);
    }
    return c.json({ error: "Not found" }, 404);
  }
});

/**
 * An asset inside a template.
 *
 * Most templates need none of this — the bundler inlines every image a scene
 * imports — but a manifest-declared audio track is referenced by path rather
 * than imported, so the player has to be able to fetch it.
 */
templateRoutes.get("/:id/assets/*", async (c) => {
  const id = c.req.param("id");
  if (!(await getTemplate(id).catch(() => null))) return c.json({ error: "Not found" }, 404);

  // Hono's wildcard keeps the raw path; decode it before it reaches disk, and
  // let `templateAssetPath` be the one place containment is decided.
  const tail = decodeURIComponent(c.req.path.split("/assets/").slice(1).join("/assets/"));
  const absolute = tail ? templateAssetPath(id, tail) : null;
  if (!absolute) return c.json({ error: "Not found" }, 404);

  const bytes = await fs.readFile(absolute).catch(() => null);
  if (!bytes) return c.json({ error: "Not found" }, 404);

  c.header("Content-Type", mimeFor(absolute));
  c.header("Cache-Control", c.req.query("v") ? IMMUTABLE : BYTES_CACHE);
  // Whole-file only: these are small, and the player seeks audio by decoding
  // it rather than by range-requesting a stream.
  c.header("Accept-Ranges", "none");
  return c.body(new Uint8Array(bytes));
});
