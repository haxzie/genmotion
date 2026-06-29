import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  inArray,
  sql,
  db,
  schema,
} from "@genmotion/db";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { enqueueThumbnail } from "../queue";

export const projectRoutes = new Hono<AuthEnv>();

projectRoutes.use(requireAuth);

/** Loads a project owned by the current user, or null. */
async function ownedProject(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)),
    );
  return project ?? null;
}

projectRoutes.get("/", async (c) => {
  const user = c.get("user");
  const projects = await db
    .select({
      ...getTableColumns(schema.projects),
      sceneCount: sql<number>`count(${schema.scenes.id})`.mapWith(Number),
      totalFrames: sql<number>`coalesce(sum(${schema.scenes.durationInFrames}), 0)`.mapWith(
        Number,
      ),
    })
    .from(schema.projects)
    .leftJoin(schema.scenes, eq(schema.scenes.projectId, schema.projects.id))
    .where(eq(schema.projects.userId, user.id))
    .groupBy(schema.projects.id)
    .orderBy(desc(schema.projects.updatedAt));
  return c.json(projects);
});

const createProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  fps: z.number().int().min(1).max(120).optional(),
  width: z.number().int().min(16).max(7680).optional(),
  height: z.number().int().min(16).max(4320).optional(),
});

projectRoutes.post("/", zValidator("json", createProjectSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const [project] = await db
    .insert(schema.projects)
    .values({ userId: user.id, ...body })
    .returning();
  return c.json(project, 201);
});

projectRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const project = await ownedProject(c.req.param("id"), user.id);
  if (!project) return c.json({ error: "Not found" }, 404);

  const scenes = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, project.id))
    .orderBy(asc(schema.scenes.order));

  return c.json({ ...project, scenes });
});

const updateProjectSchema = createProjectSchema;

projectRoutes.patch(
  "/:id",
  zValidator("json", updateProjectSchema),
  async (c) => {
    const user = c.get("user");
    const project = await ownedProject(c.req.param("id"), user.id);
    if (!project) return c.json({ error: "Not found" }, 404);

    const [updated] = await db
      .update(schema.projects)
      .set({ ...c.req.valid("json"), updatedAt: new Date() })
      .where(eq(schema.projects.id, project.id))
      .returning();
    return c.json(updated);
  },
);

projectRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const project = await ownedProject(c.req.param("id"), user.id);
  if (!project) return c.json({ error: "Not found" }, 404);

  await db.delete(schema.projects).where(eq(schema.projects.id, project.id));
  return c.json({ ok: true });
});

const reorderSchema = z.object({
  orderedSceneIds: z.array(z.string().uuid()).min(1),
});

projectRoutes.patch(
  "/:id/scenes/reorder",
  zValidator("json", reorderSchema),
  async (c) => {
    const user = c.get("user");
    const project = await ownedProject(c.req.param("id"), user.id);
    if (!project) return c.json({ error: "Not found" }, 404);

    const { orderedSceneIds } = c.req.valid("json");
    const existing = await db
      .select({ id: schema.scenes.id })
      .from(schema.scenes)
      .where(
        and(
          eq(schema.scenes.projectId, project.id),
          inArray(schema.scenes.id, orderedSceneIds),
        ),
      );
    if (existing.length !== orderedSceneIds.length) {
      return c.json({ error: "Scene list does not match project" }, 400);
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedSceneIds.length; i++) {
        await tx
          .update(schema.scenes)
          .set({ order: (i + 1) * 1000, updatedAt: new Date() })
          .where(eq(schema.scenes.id, orderedSceneIds[i]!));
      }
    });

    await enqueueThumbnail(project.id);
    return c.json({ ok: true });
  },
);

const updateSceneSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  durationInFrames: z.number().int().min(1).max(30 * 60 * 10).optional(),
  audioVolume: z.number().min(0).max(1).optional(),
});

projectRoutes.patch(
  "/:id/scenes/:sceneId",
  zValidator("json", updateSceneSchema),
  async (c) => {
    const user = c.get("user");
    const project = await ownedProject(c.req.param("id"), user.id);
    if (!project) return c.json({ error: "Not found" }, 404);

    const [updated] = await db
      .update(schema.scenes)
      .set({ ...c.req.valid("json"), updatedAt: new Date() })
      .where(
        and(
          eq(schema.scenes.id, c.req.param("sceneId")),
          eq(schema.scenes.projectId, project.id),
        ),
      )
      .returning();
    if (!updated) return c.json({ error: "Scene not found" }, 404);
    return c.json(updated);
  },
);

projectRoutes.delete("/:id/scenes/:sceneId", async (c) => {
  const user = c.get("user");
  const project = await ownedProject(c.req.param("id"), user.id);
  if (!project) return c.json({ error: "Not found" }, 404);

  const deleted = await db
    .delete(schema.scenes)
    .where(
      and(
        eq(schema.scenes.id, c.req.param("sceneId")),
        eq(schema.scenes.projectId, project.id),
      ),
    )
    .returning({ id: schema.scenes.id });
  if (deleted.length === 0) return c.json({ error: "Scene not found" }, 404);
  await enqueueThumbnail(project.id);
  return c.json({ ok: true });
});
