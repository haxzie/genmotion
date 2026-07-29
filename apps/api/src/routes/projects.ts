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
import {
  resolveAudioTrack,
  clipsOverlap,
  MAX_AUDIO_TRACKS,
  LIMIT_STATUS,
} from "@genmotion/shared";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { checkLimit } from "../limits";
import { enqueueThumbnail } from "../queue";

export const projectRoutes = new Hono<AuthEnv>();

projectRoutes.use(requireAuth);

/** Loads a project in the caller's active organization, or null. */
async function ownedProject(projectId: string, organizationId: string) {
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, organizationId),
      ),
    );
  return project ?? null;
}

projectRoutes.get("/", async (c) => {
  const organizationId = c.get("organizationId");
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
    .where(eq(schema.projects.organizationId, organizationId))
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
  const organizationId = c.get("organizationId");

  const blocked = await checkLimit(organizationId, "projects");
  if (blocked) return c.json(blocked, LIMIT_STATUS);

  const body = c.req.valid("json");
  const [project] = await db
    .insert(schema.projects)
    .values({ userId: user.id, organizationId, ...body })
    .returning();
  return c.json(project, 201);
});

projectRoutes.get("/:id", async (c) => {
  const project = await ownedProject(c.req.param("id"), c.get("organizationId"));
  if (!project) return c.json({ error: "Not found" }, 404);

  const scenes = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, project.id))
    .orderBy(asc(schema.scenes.order));

  const audioClips = await db
    .select()
    .from(schema.audioClips)
    .where(eq(schema.audioClips.projectId, project.id))
    .orderBy(asc(schema.audioClips.track), asc(schema.audioClips.startFrame));

  return c.json({ ...project, scenes, audioClips });
});

const updateProjectSchema = createProjectSchema;

projectRoutes.patch(
  "/:id",
  zValidator("json", updateProjectSchema),
  async (c) => {
    const project = await ownedProject(c.req.param("id"), c.get("organizationId"));
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
  const project = await ownedProject(c.req.param("id"), c.get("organizationId"));
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
    const project = await ownedProject(c.req.param("id"), c.get("organizationId"));
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
    const project = await ownedProject(c.req.param("id"), c.get("organizationId"));
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
  const project = await ownedProject(c.req.param("id"), c.get("organizationId"));
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

// ── Project-level audio clips (timeline music/ambience/sfx) ────────────────

/** Placements for a project's clips, optionally excluding one (when moving it). */
async function clipPlacements(projectId: string, excludeId?: string) {
  const rows = await db
    .select({
      id: schema.audioClips.id,
      track: schema.audioClips.track,
      startFrame: schema.audioClips.startFrame,
      durationInFrames: schema.audioClips.durationInFrames,
    })
    .from(schema.audioClips)
    .where(eq(schema.audioClips.projectId, projectId));
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
}

const MAX_CLIP_FRAMES = 30 * 60 * 60; // 1h at 30fps — generous upper bound

const createAudioClipSchema = z.object({
  url: z.string().min(1),
  assetId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  startFrame: z.number().int().min(0).optional(),
  durationInFrames: z.number().int().min(1).max(MAX_CLIP_FRAMES).optional(),
  startFrom: z.number().min(0).optional(),
  volume: z.number().min(0).max(1).optional(),
  track: z.number().int().min(0).max(MAX_AUDIO_TRACKS - 1).optional(),
});

projectRoutes.post(
  "/:id/audio-clips",
  zValidator("json", createAudioClipSchema),
  async (c) => {
    const project = await ownedProject(c.req.param("id"), c.get("organizationId"));
    if (!project) return c.json({ error: "Not found" }, 404);
    const body = c.req.valid("json");

    const startFrame = body.startFrame ?? 0;
    let durationInFrames = body.durationInFrames;
    if (!durationInFrames && body.assetId) {
      const [asset] = await db
        .select({ durationSeconds: schema.assets.durationSeconds })
        .from(schema.assets)
        .where(eq(schema.assets.id, body.assetId));
      if (asset?.durationSeconds) {
        durationInFrames = Math.max(1, Math.round(asset.durationSeconds * project.fps));
      }
    }
    durationInFrames = durationInFrames ?? project.fps * 5;

    const existing = await clipPlacements(project.id);
    const track = resolveAudioTrack(existing, startFrame, durationInFrames, body.track);
    if (track === null) {
      return c.json(
        { error: `No free audio track at this position (max ${MAX_AUDIO_TRACKS}).` },
        409,
      );
    }

    const [clip] = await db
      .insert(schema.audioClips)
      .values({
        projectId: project.id,
        assetId: body.assetId ?? null,
        url: body.url,
        name: body.name ?? "Audio",
        startFrame,
        durationInFrames,
        startFrom: body.startFrom ?? 0,
        volume: body.volume ?? 1,
        track,
      })
      .returning();
    return c.json(clip, 201);
  },
);

const updateAudioClipSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  startFrame: z.number().int().min(0).optional(),
  durationInFrames: z.number().int().min(1).max(MAX_CLIP_FRAMES).optional(),
  startFrom: z.number().min(0).optional(),
  volume: z.number().min(0).max(1).optional(),
  track: z.number().int().min(0).max(MAX_AUDIO_TRACKS - 1).optional(),
});

projectRoutes.patch(
  "/:id/audio-clips/:clipId",
  zValidator("json", updateAudioClipSchema),
  async (c) => {
    const project = await ownedProject(c.req.param("id"), c.get("organizationId"));
    if (!project) return c.json({ error: "Not found" }, 404);
    const body = c.req.valid("json");

    const [current] = await db
      .select()
      .from(schema.audioClips)
      .where(
        and(
          eq(schema.audioClips.id, c.req.param("clipId")),
          eq(schema.audioClips.projectId, project.id),
        ),
      );
    if (!current) return c.json({ error: "Audio clip not found" }, 404);

    // A deliberate placement (move/resize/lane change) must not collide.
    const nextTrack = body.track ?? current.track;
    const nextStart = body.startFrame ?? current.startFrame;
    const nextDuration = body.durationInFrames ?? current.durationInFrames;
    const others = await clipPlacements(project.id, current.id);
    const collides = others.some(
      (o) =>
        o.track === nextTrack &&
        clipsOverlap(o, {
          track: nextTrack,
          startFrame: nextStart,
          durationInFrames: nextDuration,
        }),
    );
    if (collides) {
      return c.json({ error: "Overlaps another clip on that track." }, 409);
    }

    const [updated] = await db
      .update(schema.audioClips)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.audioClips.id, current.id))
      .returning();
    return c.json(updated);
  },
);

projectRoutes.delete("/:id/audio-clips/:clipId", async (c) => {
  const project = await ownedProject(c.req.param("id"), c.get("organizationId"));
  if (!project) return c.json({ error: "Not found" }, 404);

  const deleted = await db
    .delete(schema.audioClips)
    .where(
      and(
        eq(schema.audioClips.id, c.req.param("clipId")),
        eq(schema.audioClips.projectId, project.id),
      ),
    )
    .returning({ id: schema.audioClips.id });
  if (deleted.length === 0) return c.json({ error: "Audio clip not found" }, 404);
  return c.json({ ok: true });
});
