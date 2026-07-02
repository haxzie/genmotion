import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, db, schema } from "@genmotion/db";
import {
  deleteObject,
  presignUpload,
  projectFileKey,
  publicUrl,
  putObject,
} from "@genmotion/storage";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

export const assetRoutes = new Hono<AuthEnv>();

assetRoutes.use(requireAuth);

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

/** True when the project exists and belongs to the caller's active org. */
async function projectInOrg(
  projectId: string,
  organizationId: string,
): Promise<boolean> {
  const [p] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, organizationId),
      ),
    );
  return Boolean(p);
}

const KIND_BY_PREFIX: Array<[string, "image" | "video" | "audio"]> = [
  ["image/", "image"],
  ["video/", "video"],
  ["audio/", "audio"],
];

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(127),
  sizeBytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  projectId: z.string().uuid().optional(),
});

assetRoutes.post("/presign", zValidator("json", presignSchema), async (c) => {
  const user = c.get("user");
  const { filename, contentType, sizeBytes, projectId } = c.req.valid("json");

  const kind = KIND_BY_PREFIX.find(([prefix]) =>
    contentType.startsWith(prefix),
  )?.[1];
  if (!kind) {
    return c.json(
      { error: "Only image, video, and audio uploads are supported" },
      400,
    );
  }

  if (projectId && !(await projectInOrg(projectId, c.get("organizationId")))) {
    return c.json({ error: "Project not found" }, 404);
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Project uploads go to the project's dedicated folder (served via the API
  // proxy); user-library uploads with no project keep the per-user path.
  const storageKey = projectId
    ? projectFileKey(projectId, safeName)
    : `uploads/${user.id}/${crypto.randomUUID()}/${safeName}`;

  const [asset] = await db
    .insert(schema.assets)
    .values({
      userId: user.id,
      projectId: projectId ?? null,
      storageKey,
      url: publicUrl(storageKey),
      kind,
      filename,
      mimeType: contentType,
      sizeBytes,
      status: "pending",
    })
    .returning();

  const uploadUrl = await presignUpload(storageKey, contentType);
  return c.json({ uploadUrl, asset });
});

const uploadQuerySchema = z.object({
  filename: z.string().min(1).max(255),
  projectId: z.string().uuid().optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  durationSeconds: z.coerce.number().positive().optional(),
});

/**
 * Proxied upload: the browser POSTs the file body here and the API streams it to
 * R2, then records the asset as ready. This avoids browser→R2 CORS (R2 buckets
 * have no CORS policy by default) and lets the client track upload progress via
 * XHR against our own origin. Metadata is probed client-side and passed as query
 * params. The file is the raw request body; Content-Type is the file's MIME type.
 */
assetRoutes.post("/upload", zValidator("query", uploadQuerySchema), async (c) => {
  const user = c.get("user");
  const { filename, projectId, width, height, durationSeconds } =
    c.req.valid("query");
  const contentType = c.req.header("content-type") ?? "";

  const kind = KIND_BY_PREFIX.find(([prefix]) =>
    contentType.startsWith(prefix),
  )?.[1];
  if (!kind) {
    return c.json(
      { error: "Only image, video, and audio uploads are supported" },
      400,
    );
  }

  if (projectId && !(await projectInOrg(projectId, c.get("organizationId")))) {
    return c.json({ error: "Project not found" }, 404);
  }

  const body = Buffer.from(await c.req.arrayBuffer());
  if (body.byteLength === 0) return c.json({ error: "Empty upload" }, 400);
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return c.json({ error: "File too large" }, 413);
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = projectId
    ? projectFileKey(projectId, safeName)
    : `uploads/${user.id}/${crypto.randomUUID()}/${safeName}`;

  await putObject(storageKey, body, contentType);

  const [asset] = await db
    .insert(schema.assets)
    .values({
      userId: user.id,
      projectId: projectId ?? null,
      storageKey,
      url: publicUrl(storageKey),
      kind,
      filename,
      mimeType: contentType,
      sizeBytes: body.byteLength,
      status: "ready",
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(durationSeconds ? { durationSeconds } : {}),
    })
    .returning();

  return c.json(asset);
});

const completeSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().positive().optional(),
});

assetRoutes.post(
  "/:id/complete",
  zValidator("json", completeSchema),
  async (c) => {
    const user = c.get("user");
    const [asset] = await db
      .update(schema.assets)
      .set({ status: "ready", ...c.req.valid("json") })
      .where(
        and(
          eq(schema.assets.id, c.req.param("id")),
          eq(schema.assets.userId, user.id),
        ),
      )
      .returning();
    if (!asset) return c.json({ error: "Not found" }, 404);
    return c.json(asset);
  },
);

assetRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const [asset] = await db
    .select()
    .from(schema.assets)
    .where(eq(schema.assets.id, c.req.param("id")));
  if (!asset) return c.json({ error: "Not found" }, 404);
  // The uploader, or any member of the org the asset's project belongs to.
  const allowed =
    asset.userId === user.id ||
    (asset.projectId
      ? await projectInOrg(asset.projectId, c.get("organizationId"))
      : false);
  if (!allowed) return c.json({ error: "Not found" }, 404);

  // Best-effort storage removal — drop the row regardless so it leaves the UI.
  try {
    await deleteObject(asset.storageKey);
  } catch {
    /* object may already be gone */
  }
  // An export's MP4 is referenced by its export_jobs row — clear the link first
  // (the column is nullable) or the FK blocks the delete.
  await db
    .update(schema.exportJobs)
    .set({ outputAssetId: null })
    .where(eq(schema.exportJobs.outputAssetId, asset.id));
  await db.delete(schema.assets).where(eq(schema.assets.id, asset.id));
  return c.json({ ok: true });
});

assetRoutes.get("/", async (c) => {
  const user = c.get("user");
  const projectId = c.req.query("projectId");

  // Project assets are shared across the org (any member's uploads show up);
  // library assets with no project stay scoped to the individual user.
  if (projectId) {
    if (!(await projectInOrg(projectId, c.get("organizationId")))) {
      return c.json([]);
    }
    const rows = await db
      .select()
      .from(schema.assets)
      .where(
        and(
          eq(schema.assets.projectId, projectId),
          eq(schema.assets.status, "ready" as const),
        ),
      )
      .orderBy(desc(schema.assets.createdAt));
    return c.json(rows);
  }

  const rows = await db
    .select()
    .from(schema.assets)
    .where(
      and(
        eq(schema.assets.userId, user.id),
        eq(schema.assets.status, "ready" as const),
      ),
    )
    .orderBy(desc(schema.assets.createdAt));
  return c.json(rows);
});
