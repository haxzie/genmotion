import { Hono, type Context } from "hono";
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

async function ownsProject(
  projectId: string,
  organizationId: string,
): Promise<boolean> {
  const [project] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, organizationId),
      ),
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

/**
 * Resolve the storage key from a proxy URL path. The URL namespace is `assets`
 * (canonical) or `files` (legacy — kept so previously-stored URLs still
 * resolve). Either way the object lives at `projects/<id>/<rest>`, where <rest>
 * is the path AFTER the namespace segment (e.g. `files/logo.png`,
 * `voiceovers/x.mp3`). Returns null for a missing/unsafe path.
 */
function objectKeyFromPath(path: string, projectId: string): string | null {
  const after = path.split(`/${projectId}/`)[1];
  if (after === undefined) return null;
  const rest = decodeURIComponent(after.replace(/^(assets|files)\//, ""));
  if (!rest || rest.includes("..")) return null;
  return `projects/${projectId}/${rest}`;
}

/** GET /:projectId/assets — list a project's files (authed, owner only). */
async function listFiles(c: Context<AuthEnv>) {
  const projectId = c.req.param("projectId")!;
  if (!(await ownsProject(projectId, c.get("organizationId")))) {
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
}

/**
 * GET /:projectId/assets/* — stream a file through the API (public, so <Img>/
 * <Audio>/<Video> tags and the renderer can load it by URL).
 */
async function streamFile(c: Context<AuthEnv>) {
  const projectId = c.req.param("projectId")!;
  const key = objectKeyFromPath(c.req.path, projectId);
  if (!key) return c.json({ error: "Invalid path" }, 400);
  const decoded = key.slice(`projects/${projectId}/`.length);
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
    // `?download` forces a save dialog (attachment) instead of inline playback —
    // needed because the <a download> attribute is ignored cross-origin.
    if (c.req.query("download") !== undefined) {
      const filename = decoded.split("/").pop() || "download";
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }
    return new Response(webStream, { headers });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
}

/** DELETE /:projectId/assets/* — delete a file (authed, owner only). */
async function deleteFile(c: Context<AuthEnv>) {
  const projectId = c.req.param("projectId")!;
  if (!(await ownsProject(projectId, c.get("organizationId")))) {
    return c.json({ error: "Not found" }, 404);
  }
  const key = objectKeyFromPath(c.req.path, projectId);
  if (!key) return c.json({ error: "Invalid path" }, 400);
  await deleteObject(key);
  // Drop any asset row backed by this object.
  await db.delete(schema.assets).where(eq(schema.assets.storageKey, key));
  return c.json({ ok: true });
}

// `assets` is canonical; `files` is a legacy alias kept so URLs stored before
// the rename (…/files/files/…) keep resolving.
fileRoutes.get("/:projectId/assets", requireAuth, listFiles);
fileRoutes.get("/:projectId/files", requireAuth, listFiles);
fileRoutes.get("/:projectId/assets/*", streamFile);
fileRoutes.get("/:projectId/files/*", streamFile);
fileRoutes.delete("/:projectId/assets/*", requireAuth, deleteFile);
fileRoutes.delete("/:projectId/files/*", requireAuth, deleteFile);
