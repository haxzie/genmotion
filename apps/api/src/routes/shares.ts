import { Readable } from "node:stream";
import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, isNull, lt, db, schema } from "@genmotion/db";
import {
  deleteObject,
  getObject,
  headObject,
  presignDownload,
  presignUpload,
} from "@genmotion/storage";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { env } from "../env";

/**
 * Publishing a rendered video to a public page.
 *
 * Two halves in one file, and the split matters. The authed half creates a
 * share and hands back presigned PUTs; the public half serves the page, the
 * video and the poster to anyone. It is the third anonymous surface in this
 * API after `/api/templates` and `/api/releases`, and for the same reason —
 * nothing it serves is private, and a `<video>` tag cannot carry a session.
 *
 * What is *not* here is any part of the project. A share is the finished
 * video: the composition behind it is the user's source, and a public page has
 * no need of it to play an MP4.
 */

/** Big enough that guessing one is hopeless, short enough to sit in a URL. */
const SLUG_SUFFIX_BYTES = 5;

/** Refuses an upload larger than any real export. Median is ~5 MB, p90 ~14 MB. */
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const PAGE_SIZE = 24;

const JSON_CACHE = "public, max-age=300";
const BYTES_CACHE = "public, max-age=31536000, immutable";

export const shareRoutes = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// Public. Declared before `requireAuth` is applied, so these stay anonymous.
// ---------------------------------------------------------------------------

/**
 * The one place a share is looked up, so the `deletedAt` check cannot be
 * forgotten in one route and remembered in the others.
 *
 * Returns the row even when withdrawn — the caller needs to tell `410 Gone`
 * from `404 Not found`, which is the whole reason the row is kept.
 */
async function bySlug(slug: string) {
  const [row] = await db
    .select()
    .from(schema.shares)
    .where(eq(schema.shares.slug, slug))
    .limit(1);
  if (!row) return { row: null, gone: false } as const;
  if (row.deletedAt) return { row: null, gone: true } as const;
  if (row.status !== "ready") return { row: null, gone: false } as const;
  return { row, gone: false } as const;
}

/** The public shape. Nothing here is private, and nothing else is exposed. */
function publicShare(
  row: typeof schema.shares.$inferSelect,
  author: { name: string; image: string | null } | null,
) {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    width: row.width,
    height: row.height,
    durationSeconds: row.durationSeconds,
    sizeBytes: row.videoBytes,
    createdAt: row.createdAt.toISOString(),
    hasPoster: Boolean(row.posterKey),
    author: author ? { name: author.name, image: author.image } : null,
  };
}

/** The sitemap's feed: every live share, newest first. */
shareRoutes.get("/public", async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 500, 1000);
  const rows = await db
    .select({
      slug: schema.shares.slug,
      title: schema.shares.title,
      updatedAt: schema.shares.updatedAt,
    })
    .from(schema.shares)
    .where(and(isNull(schema.shares.deletedAt), eq(schema.shares.status, "ready")))
    .orderBy(desc(schema.shares.createdAt))
    .limit(limit);
  c.header("Cache-Control", JSON_CACHE);
  return c.json({
    items: rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
});

shareRoutes.get("/s/:slug", async (c) => {
  const { row, gone } = await bySlug(c.req.param("slug"));
  if (gone) return c.json({ error: "This video was removed." }, 410);
  if (!row) return c.json({ error: "Not found" }, 404);

  const [author] = await db
    .select({ name: schema.user.name, image: schema.user.image })
    .from(schema.user)
    .where(eq(schema.user.id, row.userId))
    .limit(1);

  c.header("Cache-Control", JSON_CACHE);
  return c.json(publicShare(row, author ?? null));
});

/**
 * The video.
 *
 * Range requests are forwarded to the store, the same as the template and
 * project-file proxies — it is what lets a `<video>` seek rather than buffer
 * the whole file from the start.
 */
shareRoutes.get("/s/:slug/video", async (c) => {
  const { row, gone } = await bySlug(c.req.param("slug"));
  if (gone) return c.json({ error: "This video was removed." }, 410);
  if (!row) return c.json({ error: "Not found" }, 404);

  try {
    const { body, contentLength, contentRange } = await getObject(
      row.videoKey,
      c.req.header("range"),
    );
    const headers: Record<string, string> = {
      "Content-Type": "video/mp4",
      // The key contains the share id and a share's bytes never change, so
      // the file at this URL is immutable for as long as it exists.
      "Cache-Control": BYTES_CACHE,
      "Accept-Ranges": "bytes",
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

shareRoutes.get("/s/:slug/poster", async (c) => {
  const { row, gone } = await bySlug(c.req.param("slug"));
  if (gone) return c.json({ error: "This video was removed." }, 410);
  if (!row?.posterKey) return c.json({ error: "Not found" }, 404);

  try {
    const { body, contentLength } = await getObject(row.posterKey);
    const headers: Record<string, string> = {
      "Content-Type": "image/jpeg",
      "Cache-Control": BYTES_CACHE,
    };
    if (contentLength !== undefined) headers["Content-Length"] = String(contentLength);
    return new Response(Readable.toWeb(body) as ReadableStream, { headers });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

/**
 * Download the MP4.
 *
 * A redirect to a presigned URL rather than a proxy: the file can be hundreds
 * of megabytes and there is no reason for it to pass through this process.
 */
shareRoutes.get("/s/:slug/download", async (c) => {
  const { row, gone } = await bySlug(c.req.param("slug"));
  if (gone) return c.json({ error: "This video was removed." }, 410);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.redirect(await presignDownload(row.videoKey), 302);
});

// ---------------------------------------------------------------------------
// Everything below needs a session.
// ---------------------------------------------------------------------------

shareRoutes.use(requireAuth);

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  videoBytes: z.number().int().min(1).max(MAX_VIDEO_BYTES),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().positive().optional(),
  hasPoster: z.boolean().optional(),
  /** The desktop export this came from, so its list can show the link back. */
  exportId: z.string().max(100).optional(),
});

/**
 * Reserve a share and hand back somewhere to put the bytes.
 *
 * The upload goes straight from the desktop app to storage. Routing it through
 * here would mean holding a whole video in this process's memory for no
 * benefit — the app is a Node process, so the browser CORS problem that made
 * the asset routes proxy their uploads does not apply.
 */
shareRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  const slug = `${slugify(body.title)}-${randomBytes(SLUG_SUFFIX_BYTES).toString("hex")}`;

  const [row] = await db
    .insert(schema.shares)
    .values({
      slug,
      userId: user.id,
      organizationId: c.get("organizationId"),
      title: body.title,
      description: body.description ?? null,
      // The id is only known after the insert, so the keys are written back
      // immediately below rather than guessed here.
      videoKey: "",
      exportId: body.exportId ?? null,
      videoBytes: body.videoBytes,
      width: body.width ?? null,
      height: body.height ?? null,
      durationSeconds: body.durationSeconds ?? null,
    })
    .returning();
  if (!row) return c.json({ error: "Could not create the share." }, 500);

  const videoKey = `shares/${row.id}/video.mp4`;
  const posterKey = body.hasPoster ? `shares/${row.id}/poster.jpg` : null;
  await db
    .update(schema.shares)
    .set({ videoKey, posterKey, updatedAt: new Date() })
    .where(eq(schema.shares.id, row.id));

  return c.json({
    id: row.id,
    slug,
    url: `${env.WEB_URL}/v/${slug}`,
    uploads: {
      video: await presignUpload(videoKey, "video/mp4"),
      poster: posterKey ? await presignUpload(posterKey, "image/jpeg") : null,
    },
  });
});

/**
 * Confirm the bytes arrived, and only then make the share visible.
 *
 * The size in `POST /` was the client's claim about a file it had not yet
 * uploaded. This is where that claim is checked against what is actually in
 * storage — without it, a share could be listed and linked with nothing behind
 * it, or with something much larger than was declared.
 */
shareRoutes.post("/:id/complete", async (c) => {
  const [row] = await db
    .select()
    .from(schema.shares)
    .where(
      and(
        eq(schema.shares.id, c.req.param("id")),
        eq(schema.shares.userId, c.get("user").id),
        isNull(schema.shares.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);

  const video = await headObject(row.videoKey);
  if (!video) return c.json({ error: "The video did not finish uploading." }, 400);
  if (video.sizeBytes > MAX_VIDEO_BYTES) {
    await deleteObject(row.videoKey).catch(() => null);
    return c.json({ error: "That video is too large to share." }, 413);
  }
  // A poster that never arrived is not worth failing a share over; the page
  // falls back to the first frame of the video.
  const poster = row.posterKey ? await headObject(row.posterKey) : null;

  await db
    .update(schema.shares)
    .set({
      status: "ready",
      videoBytes: video.sizeBytes,
      posterKey: poster ? row.posterKey : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.shares.id, row.id));

  return c.json({ slug: row.slug, url: `${env.WEB_URL}/v/${row.slug}` });
});

/** The org's shares, newest first. Cursor is the previous page's oldest `createdAt`. */
shareRoutes.get("/", async (c) => {
  const organizationId = c.get("organizationId");
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit")) || PAGE_SIZE, PAGE_SIZE);

  const rows = await db
    .select()
    .from(schema.shares)
    .where(
      and(
        eq(schema.shares.organizationId, organizationId),
        isNull(schema.shares.deletedAt),
        eq(schema.shares.status, "ready"),
        cursor ? lt(schema.shares.createdAt, new Date(cursor)) : undefined,
      ),
    )
    .orderBy(desc(schema.shares.createdAt))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  return c.json({
    items: page.map((row) => ({
      id: row.id,
      slug: row.slug,
      exportId: row.exportId,
      title: row.title,
      url: `${env.WEB_URL}/v/${row.slug}`,
      width: row.width,
      height: row.height,
      durationSeconds: row.durationSeconds,
      sizeBytes: row.videoBytes,
      hasPoster: Boolean(row.posterKey),
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit ? page.at(-1)?.createdAt.toISOString() : undefined,
  });
});

/**
 * Withdraw a share.
 *
 * The row is marked, never deleted — see the schema for why the slug must stay
 * reserved. The order is the point: `deletedAt` is what actually stops every
 * public route, so it is written first and its failure fails the request. The
 * storage cleanup after it is best-effort, because bytes nothing routes to are
 * a cost, not an exposure.
 */
shareRoutes.delete("/:id", async (c) => {
  const [row] = await db
    .select()
    .from(schema.shares)
    .where(
      and(
        eq(schema.shares.id, c.req.param("id")),
        eq(schema.shares.organizationId, c.get("organizationId")),
        isNull(schema.shares.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);

  await db
    .update(schema.shares)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.shares.id, row.id));

  await deleteObject(row.videoKey).catch(() => null);
  if (row.posterKey) await deleteObject(row.posterKey).catch(() => null);

  return c.json({ ok: true });
});

/**
 * A title as a URL segment.
 *
 * Bounded well under the slug column's practical limit, and never empty — a
 * title of nothing but emoji still has to produce a link.
 */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "video";
}
