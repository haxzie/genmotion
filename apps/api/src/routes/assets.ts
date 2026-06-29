import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, db, schema } from "@genmotion/db";
import { presignUpload, projectFileKey, publicUrl } from "@genmotion/storage";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

export const assetRoutes = new Hono<AuthEnv>();

assetRoutes.use(requireAuth);

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

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

  if (projectId) {
    const [project] = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectId),
          eq(schema.projects.userId, user.id),
        ),
      );
    if (!project) return c.json({ error: "Project not found" }, 404);
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

assetRoutes.get("/", async (c) => {
  const user = c.get("user");
  const projectId = c.req.query("projectId");
  const conditions = [
    eq(schema.assets.userId, user.id),
    eq(schema.assets.status, "ready" as const),
  ];
  if (projectId) conditions.push(eq(schema.assets.projectId, projectId));
  const rows = await db
    .select()
    .from(schema.assets)
    .where(and(...conditions))
    .orderBy(desc(schema.assets.createdAt));
  return c.json(rows);
});
