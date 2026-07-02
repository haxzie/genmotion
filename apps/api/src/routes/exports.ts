import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, db, schema } from "@genmotion/db";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { getBoss, RENDER_QUEUE } from "../queue";

export const exportRoutes = new Hono<AuthEnv>();

exportRoutes.use(requireAuth);

const createSchema = z.object({
  projectId: z.string().uuid(),
  quality: z.number().int().min(0).max(100).optional(),
});

exportRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const user = c.get("user");
  const { projectId, quality } = c.req.valid("json");

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(eq(schema.projects.id, projectId), eq(schema.projects.userId, user.id)),
    );
  if (!project) return c.json({ error: "Project not found" }, 404);

  const scenes = await db
    .select({ durationInFrames: schema.scenes.durationInFrames })
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, projectId));
  if (scenes.length === 0) {
    return c.json({ error: "Add at least one scene before exporting" }, 400);
  }
  const totalFrames = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);

  // One render at a time per project.
  const [active] = await db
    .select({ id: schema.exportJobs.id })
    .from(schema.exportJobs)
    .where(
      and(
        eq(schema.exportJobs.projectId, projectId),
        eq(schema.exportJobs.status, "queued"),
      ),
    );
  if (active) return c.json({ error: "An export is already queued" }, 409);

  const [job] = await db
    .insert(schema.exportJobs)
    .values({
      projectId,
      userId: user.id,
      totalFrames,
      ...(quality !== undefined && { quality }),
    })
    .returning();

  const boss = await getBoss();
  await boss.send(RENDER_QUEUE, { exportJobId: job!.id });

  return c.json(job, 201);
});

exportRoutes.get("/latest", async (c) => {
  const user = c.get("user");
  const projectId = c.req.query("projectId");
  if (!projectId) return c.json({ error: "projectId required" }, 400);
  const [job] = await db
    .select()
    .from(schema.exportJobs)
    .where(
      and(
        eq(schema.exportJobs.projectId, projectId),
        eq(schema.exportJobs.userId, user.id),
      ),
    )
    .orderBy(desc(schema.exportJobs.createdAt))
    .limit(1);
  return c.json(job ?? null);
});

async function loadJob(jobId: string, userId: string) {
  const [job] = await db
    .select()
    .from(schema.exportJobs)
    .where(
      and(eq(schema.exportJobs.id, jobId), eq(schema.exportJobs.userId, userId)),
    );
  return job ?? null;
}

async function jobWithOutput(job: NonNullable<Awaited<ReturnType<typeof loadJob>>>) {
  let outputUrl: string | null = null;
  if (job.outputAssetId) {
    const [asset] = await db
      .select({ url: schema.assets.url })
      .from(schema.assets)
      .where(eq(schema.assets.id, job.outputAssetId));
    outputUrl = asset?.url ?? null;
  }
  return { ...job, outputUrl };
}

exportRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const job = await loadJob(c.req.param("id"), user.id);
  if (!job) return c.json({ error: "Not found" }, 404);
  return c.json(await jobWithOutput(job));
});

/** SSE progress stream: pushes {status, progress, outputUrl} deltas until terminal. */
exportRoutes.get("/:id/events", async (c) => {
  const user = c.get("user");
  const jobId = c.req.param("id");
  const initial = await loadJob(jobId, user.id);
  if (!initial) return c.json({ error: "Not found" }, 404);

  return streamSSE(c, async (stream) => {
    let lastPayload = "";
    for (let i = 0; i < 60 * 30; i++) {
      const job = await loadJob(jobId, user.id);
      if (!job) break;
      const payload = JSON.stringify(await jobWithOutput(job));
      if (payload !== lastPayload) {
        lastPayload = payload;
        await stream.writeSSE({ event: "progress", data: payload });
      }
      if (job.status === "done" || job.status === "failed") break;
      await stream.sleep(1000);
    }
  });
});
