import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, getTableColumns, db, schema } from "@genmotion/db";
import { isPaywallBody, PAYWALL_STATUS } from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { claimExportSlot, exportState } from "../limits";
import { getBoss, RENDER_QUEUE } from "../queue";

export const exportRoutes = new Hono<AuthEnv>();

exportRoutes.use(requireAuth);

/**
 * A local export announcing itself. Everything is optional detail except that
 * there is one: the count is of rows, so the body only colours the record.
 */
const claimSchema = z.object({
  format: z.enum(["mp4", "webm", "gif"]).optional(),
  totalFrames: z.number().int().positive().max(1_000_000).optional(),
});

const createSchema = z.object({
  projectId: z.string().uuid(),
  quality: z.number().int().min(0).max(100).optional(),
  format: z.enum(["mp4", "webm", "gif"]).optional(),
});

exportRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const user = c.get("user");
  const organizationId = c.get("organizationId");

  const { projectId, quality, format } = c.req.valid("json");

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, organizationId),
      ),
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

  // The allowance comes off here, after everything that could refuse the
  // export for a reason of its own has had its say — a project with no scenes
  // is a 400, and a 400 must not cost a Free user one of their five.
  const claim = await claimExportSlot(organizationId, user.id, {
    source: "cloud",
    format,
    totalFrames,
  });
  if (isPaywallBody(claim)) return c.json(claim, PAYWALL_STATUS);

  const [job] = await db
    .insert(schema.exportJobs)
    .values({
      projectId,
      userId: user.id,
      totalFrames,
      quality: quality ?? 95,
      ...(format && { format }),
    })
    .returning();

  const boss = await getBoss();
  const queueJobId = await boss.send(RENDER_QUEUE, { exportJobId: job!.id });
  // Remember the pg-boss job id so a still-queued export can be pulled from the
  // queue if the user cancels before it starts rendering.
  if (queueJobId) {
    await db
      .update(schema.exportJobs)
      .set({ queueJobId })
      .where(eq(schema.exportJobs.id, job!.id));
  }

  return c.json({ ...job, queueJobId: queueJobId ?? null, usage: claim.usage }, 201);
});

/**
 * POST /claim — take one export off the month's allowance for a render that
 * happens somewhere we will never see: the desktop app's own offscreen window.
 *
 * The desktop app cannot be trusted to keep this count itself. A local tally
 * would reset with a reinstall, a new machine, or a deleted file, and the
 * allowance is per organization rather than per install. So the app asks here
 * first and renders only on a 200.
 *
 * Separate from `POST /` because that one enqueues a hosted render. This
 * writes the meter row and nothing else; the answer is the meter as it now
 * stands.
 */
exportRoutes.post("/claim", zValidator("json", claimSchema), async (c) => {
  const user = c.get("user");
  const organizationId = c.get("organizationId");
  const { format, totalFrames } = c.req.valid("json");

  const claim = await claimExportSlot(organizationId, user.id, {
    source: "desktop",
    format,
    totalFrames,
  });
  if (isPaywallBody(claim)) return c.json(claim, PAYWALL_STATUS);
  return c.json(claim, 201);
});

/** GET /usage — the month's export meter, without claiming anything. */
exportRoutes.get("/usage", async (c) => {
  return c.json(await exportState(c.get("organizationId")));
});

exportRoutes.get("/latest", async (c) => {
  const organizationId = c.get("organizationId");
  const projectId = c.req.query("projectId");
  if (!projectId) return c.json({ error: "projectId required" }, 400);
  // Only expose exports for a project in the caller's active org (team-shared,
  // so the latest export is per-project, not per-user).
  const [project] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, organizationId),
      ),
    );
  if (!project) return c.json(null);
  const [job] = await db
    .select()
    .from(schema.exportJobs)
    .where(eq(schema.exportJobs.projectId, projectId))
    .orderBy(desc(schema.exportJobs.createdAt))
    .limit(1);
  return c.json(job ?? null);
});

/** Load an export job whose project is in the caller's active organization. */
async function loadJob(jobId: string, organizationId: string) {
  const [job] = await db
    .select(getTableColumns(schema.exportJobs))
    .from(schema.exportJobs)
    .innerJoin(
      schema.projects,
      eq(schema.projects.id, schema.exportJobs.projectId),
    )
    .where(
      and(
        eq(schema.exportJobs.id, jobId),
        eq(schema.projects.organizationId, organizationId),
      ),
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
  const job = await loadJob(c.req.param("id"), c.get("organizationId"));
  if (!job) return c.json({ error: "Not found" }, 404);
  return c.json(await jobWithOutput(job));
});

/**
 * Cancel a still-queued export: mark it cancelled and pull it from the render
 * queue so no worker picks it up. Only works while the job is "queued" — once
 * a worker has started rendering it's too late (409).
 */
exportRoutes.post("/:id/cancel", async (c) => {
  const organizationId = c.get("organizationId");
  const jobId = c.req.param("id");
  const job = await loadJob(jobId, organizationId);
  if (!job) return c.json({ error: "Not found" }, 404);

  // Atomic guard: only flips a job that is STILL queued, so we never cancel one
  // that just started rendering in a race.
  const [cancelled] = await db
    .update(schema.exportJobs)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(
      and(
        eq(schema.exportJobs.id, jobId),
        eq(schema.exportJobs.status, "queued"),
      ),
    )
    .returning(getTableColumns(schema.exportJobs));
  if (!cancelled) {
    return c.json(
      { error: "This export has already started rendering and can't be cancelled." },
      409,
    );
  }

  // Best-effort: remove it from the queue so a worker never even dequeues it.
  // The worker also re-checks status before rendering, so this is belt-and-braces.
  if (job.queueJobId) {
    try {
      const boss = await getBoss();
      await boss.deleteJob(RENDER_QUEUE, job.queueJobId);
    } catch (err) {
      console.warn(`[export ${jobId}] queue removal failed:`, err);
    }
  }

  return c.json(await jobWithOutput(cancelled));
});

/** SSE progress stream: pushes {status, progress, outputUrl} deltas until terminal. */
exportRoutes.get("/:id/events", async (c) => {
  const organizationId = c.get("organizationId");
  const jobId = c.req.param("id");
  const initial = await loadJob(jobId, organizationId);
  if (!initial) return c.json({ error: "Not found" }, 404);

  return streamSSE(c, async (stream) => {
    let lastPayload = "";
    for (let i = 0; i < 60 * 30; i++) {
      const job = await loadJob(jobId, organizationId);
      if (!job) break;
      const payload = JSON.stringify(await jobWithOutput(job));
      if (payload !== lastPayload) {
        lastPayload = payload;
        await stream.writeSSE({ event: "progress", data: payload });
      }
      if (
        job.status === "done" ||
        job.status === "failed" ||
        job.status === "cancelled"
      ) {
        break;
      }
      await stream.sleep(1000);
    }
  });
});
