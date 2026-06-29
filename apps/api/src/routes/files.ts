import { Hono } from "hono";
import { Readable } from "node:stream";
import { and, eq, db, schema } from "@genmotion/db";
import {
  deleteObject,
  getObject,
  listObjects,
  projectFilesPrefix,
  publicUrl,
} from "@genmotion/storage";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

export const fileRoutes = new Hono<AuthEnv>();

async function ownsProject(projectId: string, userId: string): Promise<boolean> {
  const [project] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)),
    );
  return Boolean(project);
}

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  json: "application/json",
  csv: "text/csv",
  txt: "text/plain",
  pdf: "application/pdf",
};

/** GET /:projectId/files — list a project's files (authed, owner only). */
fileRoutes.get("/:projectId/files", requireAuth, async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("projectId");
  if (!(await ownsProject(projectId, user.id))) {
    return c.json({ error: "Not found" }, 404);
  }

  const prefix = projectFilesPrefix(projectId);
  const objects = await listObjects(prefix);
  const files = objects
    .filter((o) => o.key.length > prefix.length)
    .map((o) => {
      const name = o.key.slice(prefix.length);
      return {
        name,
        size: o.size,
        contentType: CONTENT_TYPE[ext(name)] ?? "application/octet-stream",
        lastModified: o.lastModified,
        url: publicUrl(o.key),
      };
    });
  return c.json(files);
});

/**
 * GET /:projectId/files/* — stream a file through the API (public, so <Img>/
 * <Audio>/<Video> tags and the renderer can load it by URL). The wildcard is
 * the object path relative to `projects/<id>/`.
 */
fileRoutes.get("/:projectId/files/*", async (c) => {
  const projectId = c.req.param("projectId");
  const rel = c.req.path.split(`/${projectId}/files/`)[1] ?? "";
  const decoded = decodeURIComponent(rel);
  if (!decoded || decoded.includes("..")) {
    return c.json({ error: "Invalid path" }, 400);
  }

  const key = `projects/${projectId}/${decoded}`;
  try {
    const { body, contentType, contentLength } = await getObject(key);
    const webStream = Readable.toWeb(body) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type":
        contentType ?? CONTENT_TYPE[ext(decoded)] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    };
    if (contentLength !== undefined) {
      headers["Content-Length"] = String(contentLength);
    }
    return new Response(webStream, { headers });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

/** DELETE /:projectId/files/* — delete a file (authed, owner only). */
fileRoutes.delete("/:projectId/files/*", requireAuth, async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("projectId");
  if (!(await ownsProject(projectId, user.id))) {
    return c.json({ error: "Not found" }, 404);
  }

  const rel = c.req.path.split(`/${projectId}/files/`)[1] ?? "";
  const decoded = decodeURIComponent(rel);
  if (!decoded || decoded.includes("..")) {
    return c.json({ error: "Invalid path" }, 400);
  }

  const key = `projects/${projectId}/files/${decoded}`;
  await deleteObject(key);
  // Drop any asset row backed by this object.
  await db.delete(schema.assets).where(eq(schema.assets.storageKey, key));
  return c.json({ ok: true });
});
