import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { asc, eq, db, schema } from "@genmotion/db";
import {
  buildRenderAudioSources,
  exportFormatMeta,
  type RenderJobPayload,
  type ThumbnailJobPayload,
} from "@genmotion/shared";
import { verifyRenderToken } from "@genmotion/shared/render-token";
import { putObject } from "@genmotion/storage";
import { env } from "../env";

/**
 * Render control-plane. A renderer (local worker or a remote, credential-less
 * sandbox) authenticates with a short-lived per-job token and uses these
 * endpoints to fetch the job payload, report progress, and hand back the MP4 —
 * so the sandbox never needs the database or object-storage credentials.
 */
type ExportJob = typeof schema.exportJobs.$inferSelect;
type Project = typeof schema.projects.$inferSelect;

type RenderEnv = {
  Variables: { renderJob: ExportJob; thumbProject: Project };
};

export const renderRoutes = new Hono<RenderEnv>();

const renderSecret = () => env.RENDER_JWT_SECRET ?? env.BETTER_AUTH_SECRET;
const bearer = (c: { req: { header: (k: string) => string | undefined } }) => {
  const h = c.req.header("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
};

// Render-job token: scoped "render", must match :id, loads the export job.
const renderJobAuth = createMiddleware<RenderEnv>(async (c, next) => {
  const claims = verifyRenderToken(bearer(c), renderSecret());
  if (!claims || claims.scope !== "render") {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (claims.id !== c.req.param("id")) {
    return c.json({ error: "Token/job mismatch" }, 403);
  }
  const [job] = await db
    .select()
    .from(schema.exportJobs)
    .where(eq(schema.exportJobs.id, claims.id));
  if (!job) return c.json({ error: "Not found" }, 404);
  c.set("renderJob", job);
  await next();
});

// Thumbnail token: scoped "thumbnail", must match :id (project id), loads project.
const thumbnailAuth = createMiddleware<RenderEnv>(async (c, next) => {
  const claims = verifyRenderToken(bearer(c), renderSecret());
  if (!claims || claims.scope !== "thumbnail") {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (claims.id !== c.req.param("id")) {
    return c.json({ error: "Token/project mismatch" }, 403);
  }
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, claims.id));
  if (!project) return c.json({ error: "Not found" }, 404);
  c.set("thumbProject", project);
  await next();
});

renderRoutes.use("/jobs/:id", renderJobAuth);
renderRoutes.use("/jobs/:id/*", renderJobAuth);
renderRoutes.use("/thumbnails/:id", thumbnailAuth);
renderRoutes.use("/thumbnails/:id/*", thumbnailAuth);

/** GET /jobs/:id — the self-contained payload the renderer needs. */
renderRoutes.get("/jobs/:id", async (c) => {
  const job = c.get("renderJob");
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, job.projectId));
  if (!project) return c.json({ error: "Project not found" }, 404);

  const scenes = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, project.id))
    .orderBy(asc(schema.scenes.order));
  const audioClips = await db
    .select()
    .from(schema.audioClips)
    .where(eq(schema.audioClips.projectId, project.id));

  const payload: RenderJobPayload = {
    exportJobId: job.id,
    fps: project.fps,
    width: project.width,
    height: project.height,
    quality: job.quality ?? 95,
    format: job.format,
    filename: project.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "export",
    scenes: scenes.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      durationInFrames: s.durationInFrames,
    })),
    audioSources: buildRenderAudioSources(scenes, audioClips, project.fps),
  };
  return c.json(payload);
});

/** PATCH /jobs/:id — progress / status updates from the renderer. */
renderRoutes.patch("/jobs/:id", async (c) => {
  const job = c.get("renderJob");
  const body = (await c.req.json().catch(() => ({}))) as {
    status?: ExportJob["status"];
    progress?: number;
    error?: string;
    startedAt?: string;
    completedAt?: string;
  };
  const patch: Partial<ExportJob> = {};
  if (body.status) patch.status = body.status;
  if (typeof body.progress === "number") {
    patch.progress = Math.max(0, Math.min(100, Math.round(body.progress)));
  }
  if (body.error) patch.error = body.error.slice(0, 2000);
  if (body.startedAt) patch.startedAt = new Date(body.startedAt);
  if (body.completedAt) patch.completedAt = new Date(body.completedAt);
  if (Object.keys(patch).length > 0) {
    await db
      .update(schema.exportJobs)
      .set(patch)
      .where(eq(schema.exportJobs.id, job.id));
  }
  return c.json({ ok: true });
});

/**
 * POST /jobs/:id/output?frames=N — the finished MP4 (raw body). The API (which
 * holds the R2 credentials) uploads it, records the asset, and marks the job
 * done. This keeps the renderer credential-less; presigned direct-to-R2 uploads
 * are a future optimization for very large files.
 */
renderRoutes.post("/jobs/:id/output", async (c) => {
  const job = c.get("renderJob");
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, job.projectId));
  if (!project) return c.json({ error: "Project not found" }, 404);

  const frames = Number(c.req.query("frames")) || job.totalFrames || 0;
  const body = Buffer.from(await c.req.arrayBuffer());
  if (body.byteLength === 0) return c.json({ error: "Empty output" }, 400);

  const meta = exportFormatMeta(job.format);
  const safeName = project.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "video";
  const baseName = `export_${safeName}_${job.createdAt.getTime()}`;
  const storageKey = `projects/${project.id}/exports/${job.id}/${baseName}.${meta.ext}`;
  const url = await putObject(storageKey, body, meta.mimeType);

  const [asset] = await db
    .insert(schema.assets)
    .values({
      userId: job.userId,
      projectId: project.id,
      storageKey,
      url,
      kind: "export",
      filename: `${baseName}.${meta.ext}`,
      mimeType: meta.mimeType,
      sizeBytes: body.byteLength,
      width: project.width,
      height: project.height,
      durationSeconds: frames > 0 ? frames / project.fps : null,
      status: "ready",
    })
    .returning({ id: schema.assets.id });

  await db
    .update(schema.exportJobs)
    .set({
      status: "done",
      progress: 100,
      outputAssetId: asset!.id,
      completedAt: new Date(),
    })
    .where(eq(schema.exportJobs.id, job.id));

  return c.json({ ok: true, url });
});

// ── Thumbnails (credential-less, so remote renderers hold no Chromium) ──────

/** GET /thumbnails/:id — payload to render a project's thumbnail (first scene). */
renderRoutes.get("/thumbnails/:id", async (c) => {
  const project = c.get("thumbProject");
  const [scene] = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, project.id))
    .orderBy(asc(schema.scenes.order))
    .limit(1);
  if (!scene) return c.json({ error: "Project has no scenes" }, 404);

  const payload: ThumbnailJobPayload = {
    projectId: project.id,
    fps: project.fps,
    width: project.width,
    height: project.height,
    scene: {
      id: scene.id,
      name: scene.name,
      code: scene.code,
      durationInFrames: scene.durationInFrames,
    },
    frame: Math.floor(scene.durationInFrames * 0.6),
  };
  return c.json(payload);
});

/** POST /thumbnails/:id/output — the JPG (raw body); uploaded + set as thumbnail. */
renderRoutes.post("/thumbnails/:id/output", async (c) => {
  const project = c.get("thumbProject");
  const body = Buffer.from(await c.req.arrayBuffer());
  if (body.byteLength === 0) return c.json({ error: "Empty output" }, 400);

  const storageKey = `projects/${project.id}/thumbnails/${crypto.randomUUID()}.jpg`;
  const url = await putObject(storageKey, body, "image/jpeg");
  await db
    .update(schema.projects)
    .set({ thumbnailUrl: url })
    .where(eq(schema.projects.id, project.id));

  return c.json({ ok: true, url });
});
