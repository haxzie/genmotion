import { Hono } from "hono";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  or,
  sql,
  db,
  schema,
} from "@genmotion/db";
import type { PlanId } from "@genmotion/shared";
import { auth } from "../auth";
import { signAdminToken } from "../admin/token";
import { isAdminEmail } from "../admin/domains";
import { entitlementsFromRow, getEntitlements } from "../entitlements";
import { requireAdmin, type AdminEnv } from "../middleware/require-admin";

/**
 * Admin console API. `POST /session` is gated by the better-auth session and,
 * after an email-domain check, mints a short-lived admin token. Every other
 * route requires that Bearer token via `requireAdmin` — a normal user session
 * cannot reach the data below. List endpoints are keyset-paginated for infinite
 * scroll: they take `?cursor=` and return `{ items, nextCursor }`.
 */
export const adminRoutes = new Hono<AdminEnv>();

const PAGE = 40;
const DAY = (col: unknown) => sql<string>`to_char(${col}, 'YYYY-MM-DD')`;
const scalar = async (query: Promise<Array<{ value: number }>>) =>
  Number((await query)[0]?.value ?? 0);

/** Cursor = `<createdAt ISO>|<id>` — a stable keyset for (createdAt desc, id desc). */
function parseCursor(raw?: string): { createdAt: Date; id: string } | null {
  if (!raw) return null;
  const i = raw.lastIndexOf("|");
  if (i < 0) return null;
  const createdAt = new Date(raw.slice(0, i));
  const id = raw.slice(i + 1);
  return Number.isNaN(createdAt.getTime()) || !id ? null : { createdAt, id };
}

function nextCursor(
  rows: Array<{ createdAt: Date | string; id: string }>,
): string | null {
  if (rows.length < PAGE) return null;
  const last = rows[rows.length - 1]!;
  const ca = last.createdAt instanceof Date ? last.createdAt.toISOString() : String(last.createdAt);
  return `${ca}|${last.id}`;
}

interface PlanInfo {
  plan: PlanId;
  planName: string;
}
const FREE: PlanInfo = { plan: "free", planName: "Free" };

/**
 * Effective plan for a page of organizations, in one query.
 *
 * Reads through `entitlementsFromRow` rather than the raw `plan` column so the
 * console shows what an org can actually do — a cancelled subscription still
 * inside its paid period reports the paid plan, and anything unrecognised fails
 * closed to Free, exactly as the product gates see it.
 */
async function plansFor(orgIds: string[]): Promise<Map<string, PlanInfo>> {
  if (!orgIds.length) return new Map();
  const rows = await db
    .select()
    .from(schema.organizationSubscriptions)
    .where(inArray(schema.organizationSubscriptions.organizationId, orgIds));
  const byOrg = new Map(rows.map((r) => [r.organizationId, r]));
  return new Map(
    orgIds.map((id) => {
      const ent = entitlementsFromRow(id, byOrg.get(id) ?? null);
      return [id, { plan: ent.plan, planName: ent.planName }];
    }),
  );
}

interface PersonRef {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/** The `user` columns every admin view shows a person by. */
const personColumns = {
  id: schema.user.id,
  name: schema.user.name,
  email: schema.user.email,
  image: schema.user.image,
};

/**
 * Who created each organization. There is no `created_by` column, so the
 * creator is inferred as the earliest owner — which is precisely the row
 * `createDefaultOrg()` writes at signup. Orgs with no owner (possible only if
 * one was demoted) fall back to their oldest member; `DISTINCT ON` keeps this
 * to a single query for the whole page.
 */
async function creatorsFor(orgIds: string[]): Promise<Map<string, PersonRef>> {
  if (!orgIds.length) return new Map();
  const rows = await db
    .selectDistinctOn([schema.member.organizationId], {
      organizationId: schema.member.organizationId,
      ...personColumns,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(inArray(schema.member.organizationId, orgIds))
    .orderBy(
      schema.member.organizationId,
      // false sorts before true, so owners win the DISTINCT ON.
      sql`(${schema.member.role} <> 'owner')`,
      asc(schema.member.createdAt),
    );
  return new Map(
    rows.map(({ organizationId, ...person }) => [organizationId, person]),
  );
}

/** `id -> count` from a grouped aggregate, defaulting missing keys to 0. */
function countMap<K extends string>(
  rows: Array<{ key: K | null; n: number }>,
): Map<K, number> {
  return new Map(
    rows.flatMap(({ key, n }) => (key === null ? [] : [[key, n] as [K, number]])),
  );
}

/** Bootstrap: exchange a Google-OAuth session (on an allowed domain) for a token. */
adminRoutes.post("/session", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Not signed in" }, 401);
  if (!isAdminEmail(session.user.email)) {
    return c.json({ error: "This account isn't authorized for the admin area." }, 403);
  }
  const token = signAdminToken({ id: session.user.id, email: session.user.email });
  return c.json({
    token,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
  });
});

adminRoutes.use("/*", requireAdmin);

/** Dashboard metrics: totals + 30-day new-users and exports series. */
adminRoutes.get("/metrics", async (c) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [users, orgs, projects, exports] = await Promise.all([
    scalar(db.select({ value: count() }).from(schema.user)),
    scalar(db.select({ value: count() }).from(schema.organization)),
    scalar(db.select({ value: count() }).from(schema.projects)),
    scalar(
      db
        .select({ value: count() })
        .from(schema.exportJobs)
        .where(eq(schema.exportJobs.status, "done")),
    ),
  ]);

  const userDay = DAY(schema.user.createdAt);
  const newUsers = await db
    .select({ date: userDay, count: count() })
    .from(schema.user)
    .where(gte(schema.user.createdAt, since))
    .groupBy(userDay)
    .orderBy(userDay);

  const exportDay = DAY(schema.exportJobs.createdAt);
  const exportSeries = await db
    .select({ date: exportDay, count: count() })
    .from(schema.exportJobs)
    .where(
      and(gte(schema.exportJobs.createdAt, since), eq(schema.exportJobs.status, "done")),
    )
    .groupBy(exportDay)
    .orderBy(exportDay);

  return c.json({
    totals: { users, orgs, projects, exports },
    newUsers,
    exports: exportSeries,
  });
});

/** Organizations (paginated) with creator, effective plan and member/project counts. */
adminRoutes.get("/organizations", async (c) => {
  const cursor = parseCursor(c.req.query("cursor"));
  const keyset = cursor
    ? or(
        lt(schema.organization.createdAt, cursor.createdAt),
        and(
          eq(schema.organization.createdAt, cursor.createdAt),
          lt(schema.organization.id, cursor.id),
        ),
      )
    : undefined;

  const orgs = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      createdAt: schema.organization.createdAt,
    })
    .from(schema.organization)
    .where(keyset)
    .orderBy(desc(schema.organization.createdAt), desc(schema.organization.id))
    .limit(PAGE);

  const ids = orgs.map((o) => o.id);
  const [members, projects, plans, creators] = ids.length
    ? await Promise.all([
        db
          .select({ key: schema.member.organizationId, n: count() })
          .from(schema.member)
          .where(inArray(schema.member.organizationId, ids))
          .groupBy(schema.member.organizationId),
        db
          .select({ key: schema.projects.organizationId, n: count() })
          .from(schema.projects)
          .where(inArray(schema.projects.organizationId, ids))
          .groupBy(schema.projects.organizationId),
        plansFor(ids),
        creatorsFor(ids),
      ])
    : [[], [], new Map<string, PlanInfo>(), new Map<string, PersonRef>()];
  const memberBy = countMap(members);
  const projectBy = countMap(projects);

  return c.json({
    items: orgs.map((o) => ({
      ...o,
      ...(plans.get(o.id) ?? FREE),
      createdBy: creators.get(o.id) ?? null,
      memberCount: memberBy.get(o.id) ?? 0,
      projectCount: projectBy.get(o.id) ?? 0,
    })),
    nextCursor: nextCursor(orgs),
  });
});

/**
 * Primary organization for a page of users — their oldest membership, which is
 * the personal org `createDefaultOrg()` creates at signup. Users belonging to
 * several orgs show this one in the list; the detail view lists them all.
 */
async function primaryOrgFor(userIds: string[]) {
  if (!userIds.length) return new Map<string, { id: string; name: string }>();
  const rows = await db
    .selectDistinctOn([schema.member.userId], {
      userId: schema.member.userId,
      id: schema.organization.id,
      name: schema.organization.name,
    })
    .from(schema.member)
    .innerJoin(
      schema.organization,
      eq(schema.organization.id, schema.member.organizationId),
    )
    .where(inArray(schema.member.userId, userIds))
    .orderBy(schema.member.userId, asc(schema.member.createdAt));
  return new Map(rows.map(({ userId, ...org }) => [userId, org]));
}

/** Users (paginated, newest first) with their primary org, plan and project count. */
adminRoutes.get("/users", async (c) => {
  const cursor = parseCursor(c.req.query("cursor"));
  const keyset = cursor
    ? or(
        lt(schema.user.createdAt, cursor.createdAt),
        and(eq(schema.user.createdAt, cursor.createdAt), lt(schema.user.id, cursor.id)),
      )
    : undefined;

  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .where(keyset)
    .orderBy(desc(schema.user.createdAt), desc(schema.user.id))
    .limit(PAGE);

  const ids = users.map((u) => u.id);
  const [projects, orgs] = ids.length
    ? await Promise.all([
        db
          .select({ key: schema.projects.userId, n: count() })
          .from(schema.projects)
          .where(inArray(schema.projects.userId, ids))
          .groupBy(schema.projects.userId),
        primaryOrgFor(ids),
      ])
    : [[], new Map<string, { id: string; name: string }>()];
  const projectBy = countMap(projects);
  const plans = await plansFor([...new Set([...orgs.values()].map((o) => o.id))]);

  return c.json({
    items: users.map((u) => {
      const org = orgs.get(u.id);
      return {
        ...u,
        projectCount: projectBy.get(u.id) ?? 0,
        org: org ? { ...org, ...(plans.get(org.id) ?? FREE) } : null,
      };
    }),
    nextCursor: nextCursor(users),
  });
});

/**
 * Per-project aggregates for a page: timeline length, chat volume and how many
 * finished videos came out. All three are batched by project id — never per row.
 *
 * Duration is stored nowhere; it is the sum of the project's scene lengths, and
 * because `fps` varies per project the division happens after the group-by.
 */
async function projectStatsFor(projectIds: string[]) {
  if (!projectIds.length) {
    return { frames: new Map(), scenes: new Map(), messages: new Map(), exports: new Map() };
  }
  const [scenes, messages, exports] = await Promise.all([
    db
      .select({
        key: schema.scenes.projectId,
        n: count(),
        frames: sql<number>`coalesce(sum(${schema.scenes.durationInFrames}), 0)`.mapWith(Number),
      })
      .from(schema.scenes)
      .where(inArray(schema.scenes.projectId, projectIds))
      .groupBy(schema.scenes.projectId),
    db
      .select({ key: schema.chatMessages.projectId, n: count() })
      .from(schema.chatMessages)
      .where(inArray(schema.chatMessages.projectId, projectIds))
      .groupBy(schema.chatMessages.projectId),
    // Finished videos, not attempts — a queued or failed job produced nothing.
    db
      .select({ key: schema.exportJobs.projectId, n: count() })
      .from(schema.exportJobs)
      .where(
        and(
          inArray(schema.exportJobs.projectId, projectIds),
          eq(schema.exportJobs.status, "done"),
        ),
      )
      .groupBy(schema.exportJobs.projectId),
  ]);
  return {
    frames: new Map(scenes.map((s) => [s.key, s.frames])),
    scenes: countMap(scenes),
    messages: countMap(messages),
    exports: countMap(exports),
  };
}

/**
 * Projects (paginated, newest first) with duration, chat and export counts.
 * `?organizationId=` / `?userId=` narrow the list so the org and user detail
 * views can link into it.
 */
adminRoutes.get("/projects", async (c) => {
  const cursor = parseCursor(c.req.query("cursor"));
  const organizationId = c.req.query("organizationId");
  const userId = c.req.query("userId");

  const clauses = [];
  if (organizationId) {
    clauses.push(eq(schema.projects.organizationId, organizationId));
  }
  if (userId) clauses.push(eq(schema.projects.userId, userId));
  if (cursor) {
    clauses.push(
      or(
        lt(schema.projects.createdAt, cursor.createdAt),
        and(
          eq(schema.projects.createdAt, cursor.createdAt),
          lt(schema.projects.id, cursor.id),
        ),
      ),
    );
  }

  const rows = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      thumbnailUrl: schema.projects.thumbnailUrl,
      fps: schema.projects.fps,
      width: schema.projects.width,
      height: schema.projects.height,
      createdAt: schema.projects.createdAt,
      updatedAt: schema.projects.updatedAt,
      createdBy: personColumns,
      // organizationId is nullable, so the org join must be a leftJoin.
      orgId: schema.organization.id,
      orgName: schema.organization.name,
    })
    .from(schema.projects)
    .innerJoin(schema.user, eq(schema.user.id, schema.projects.userId))
    .leftJoin(
      schema.organization,
      eq(schema.organization.id, schema.projects.organizationId),
    )
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(schema.projects.createdAt), desc(schema.projects.id))
    .limit(PAGE);

  const stats = await projectStatsFor(rows.map((r) => r.id));
  const plans = await plansFor([
    ...new Set(rows.flatMap((r) => (r.orgId ? [r.orgId] : []))),
  ]);

  return c.json({
    items: rows.map(({ orgId, orgName, ...p }) => ({
      ...p,
      durationSeconds: (stats.frames.get(p.id) ?? 0) / p.fps,
      sceneCount: stats.scenes.get(p.id) ?? 0,
      messageCount: stats.messages.get(p.id) ?? 0,
      exportCount: stats.exports.get(p.id) ?? 0,
      organization: orgId
        ? { id: orgId, name: orgName!, ...(plans.get(orgId) ?? FREE) }
        : null,
    })),
    nextCursor: nextCursor(rows),
  });
});

/** Recently exported videos (paginated) with their project's thumbnail. */
adminRoutes.get("/videos", async (c) => {
  const cursor = parseCursor(c.req.query("cursor"));
  const keyset = cursor
    ? or(
        lt(schema.assets.createdAt, cursor.createdAt),
        and(eq(schema.assets.createdAt, cursor.createdAt), lt(schema.assets.id, cursor.id)),
      )
    : undefined;
  const where = keyset
    ? and(eq(schema.assets.kind, "export"), keyset)
    : eq(schema.assets.kind, "export");

  const rows = await db
    .select({
      id: schema.assets.id,
      url: schema.assets.url,
      filename: schema.assets.filename,
      createdAt: schema.assets.createdAt,
      durationSeconds: schema.assets.durationSeconds,
      projectId: schema.projects.id,
      projectName: schema.projects.name,
      thumbnailUrl: schema.projects.thumbnailUrl,
    })
    .from(schema.assets)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.assets.projectId))
    .where(where)
    .orderBy(desc(schema.assets.createdAt), desc(schema.assets.id))
    .limit(PAGE);
  return c.json({ items: rows, nextCursor: nextCursor(rows) });
});

/** Render queue (paginated): recent export jobs with status/progress. */
adminRoutes.get("/renders", async (c) => {
  const cursor = parseCursor(c.req.query("cursor"));
  const status = c.req.query("status");
  const clauses = [];
  if (status) {
    clauses.push(
      eq(schema.exportJobs.status, status as typeof schema.exportJobs.$inferSelect.status),
    );
  }
  if (cursor) {
    clauses.push(
      or(
        lt(schema.exportJobs.createdAt, cursor.createdAt),
        and(
          eq(schema.exportJobs.createdAt, cursor.createdAt),
          lt(schema.exportJobs.id, cursor.id),
        ),
      ),
    );
  }
  const where = clauses.length ? and(...clauses) : undefined;

  const rows = await db
    .select({
      id: schema.exportJobs.id,
      status: schema.exportJobs.status,
      progress: schema.exportJobs.progress,
      format: schema.exportJobs.format,
      error: schema.exportJobs.error,
      createdAt: schema.exportJobs.createdAt,
      completedAt: schema.exportJobs.completedAt,
      projectId: schema.projects.id,
      projectName: schema.projects.name,
      thumbnailUrl: schema.projects.thumbnailUrl,
    })
    .from(schema.exportJobs)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.exportJobs.projectId))
    .where(where)
    .orderBy(desc(schema.exportJobs.createdAt), desc(schema.exportJobs.id))
    .limit(PAGE);
  return c.json({ items: rows, nextCursor: nextCursor(rows) });
});

/* ---------------------------------------------------------------- details --
 * One record each, no pagination. The lists above answer "who and how many";
 * these answer "what exactly", and back the side panels in the console.
 * -------------------------------------------------------------------------*/

const RECENT_PROJECTS = 10;

/** A person's or org's latest projects, as shown in their detail panel. */
async function recentProjects(scope: { userId: string } | { organizationId: string }) {
  const rows = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      thumbnailUrl: schema.projects.thumbnailUrl,
      createdAt: schema.projects.createdAt,
      updatedAt: schema.projects.updatedAt,
    })
    .from(schema.projects)
    .where(
      "userId" in scope
        ? eq(schema.projects.userId, scope.userId)
        : eq(schema.projects.organizationId, scope.organizationId),
    )
    .orderBy(desc(schema.projects.createdAt), desc(schema.projects.id))
    .limit(RECENT_PROJECTS);
  return rows;
}

/**
 * How much a user or org has produced. Chat messages have no author column, so
 * they are counted across the scope's projects — the same basis as the
 * per-project `messageCount` in the list above.
 */
async function activityCounts(scope: { userId: string } | { organizationId: string }) {
  const projectWhere =
    "userId" in scope
      ? eq(schema.projects.userId, scope.userId)
      : eq(schema.projects.organizationId, scope.organizationId);

  const [projects, exports, messages] = await Promise.all([
    db.select({ value: count() }).from(schema.projects).where(projectWhere),
    db
      .select({ value: count() })
      .from(schema.exportJobs)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.exportJobs.projectId))
      .where(and(projectWhere, eq(schema.exportJobs.status, "done"))),
    db
      .select({ value: count() })
      .from(schema.chatMessages)
      .innerJoin(schema.projects, eq(schema.projects.id, schema.chatMessages.projectId))
      .where(projectWhere),
  ]);
  return {
    projectCount: projects[0]?.value ?? 0,
    exportCount: exports[0]?.value ?? 0,
    messageCount: messages[0]?.value ?? 0,
  };
}

/** A single user: every membership they hold, their output, their latest work. */
adminRoutes.get("/users/:id", async (c) => {
  const id = c.req.param("id");
  const [user] = await db
    .select({
      ...personColumns,
      emailVerified: schema.user.emailVerified,
      onboardingCompleted: schema.user.onboardingCompleted,
      jobRole: schema.user.jobRole,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .where(eq(schema.user.id, id));
  if (!user) return c.json({ error: "Not found" }, 404);

  const memberships = await db
    .select({
      organizationId: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      role: schema.member.role,
      joinedAt: schema.member.createdAt,
    })
    .from(schema.member)
    .innerJoin(
      schema.organization,
      eq(schema.organization.id, schema.member.organizationId),
    )
    .where(eq(schema.member.userId, id))
    .orderBy(asc(schema.member.createdAt));

  const [plans, counts, projects] = await Promise.all([
    plansFor(memberships.map((m) => m.organizationId)),
    activityCounts({ userId: id }),
    recentProjects({ userId: id }),
  ]);

  return c.json({
    ...user,
    ...counts,
    organizations: memberships.map((m) => ({
      ...m,
      ...(plans.get(m.organizationId) ?? FREE),
    })),
    projects,
  });
});

/** A single organization: subscription state, members, output, latest work. */
adminRoutes.get("/organizations/:id", async (c) => {
  const id = c.req.param("id");
  const [org] = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      logo: schema.organization.logo,
      createdAt: schema.organization.createdAt,
    })
    .from(schema.organization)
    .where(eq(schema.organization.id, id));
  if (!org) return c.json({ error: "Not found" }, 404);

  const [entitlements, creators, counts, projects, members] = await Promise.all([
    getEntitlements(id),
    creatorsFor([id]),
    activityCounts({ organizationId: id }),
    recentProjects({ organizationId: id }),
    db
      .select({
        ...personColumns,
        role: schema.member.role,
        joinedAt: schema.member.createdAt,
      })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(eq(schema.member.organizationId, id))
      .orderBy(asc(schema.member.createdAt)),
  ]);

  return c.json({
    ...org,
    ...counts,
    plan: entitlements.plan,
    planName: entitlements.planName,
    subscription: {
      status: entitlements.status,
      seats: entitlements.seats,
      paid: entitlements.paid,
      currentPeriodEnd: entitlements.currentPeriodEnd,
      cancelAtPeriodEnd: entitlements.cancelAtPeriodEnd,
    },
    createdBy: creators.get(id) ?? null,
    members,
    projects,
  });
});

/**
 * A single project, including every export attempt with the URL of the finished
 * file so the console can play it inline. Scene `code` is deliberately omitted —
 * it is large and of no use in a list.
 */
adminRoutes.get("/projects/:id", async (c) => {
  const id = c.req.param("id");
  const [project] = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      thumbnailUrl: schema.projects.thumbnailUrl,
      fps: schema.projects.fps,
      width: schema.projects.width,
      height: schema.projects.height,
      createdAt: schema.projects.createdAt,
      updatedAt: schema.projects.updatedAt,
      createdBy: personColumns,
      orgId: schema.organization.id,
      orgName: schema.organization.name,
    })
    .from(schema.projects)
    .innerJoin(schema.user, eq(schema.user.id, schema.projects.userId))
    .leftJoin(
      schema.organization,
      eq(schema.organization.id, schema.projects.organizationId),
    )
    .where(eq(schema.projects.id, id));
  if (!project) return c.json({ error: "Not found" }, 404);

  const [scenes, exports, messages, plans] = await Promise.all([
    db
      .select({
        id: schema.scenes.id,
        name: schema.scenes.name,
        order: schema.scenes.order,
        durationInFrames: schema.scenes.durationInFrames,
      })
      .from(schema.scenes)
      .where(eq(schema.scenes.projectId, id))
      .orderBy(asc(schema.scenes.order)),
    db
      .select({
        id: schema.exportJobs.id,
        status: schema.exportJobs.status,
        progress: schema.exportJobs.progress,
        format: schema.exportJobs.format,
        quality: schema.exportJobs.quality,
        watermark: schema.exportJobs.watermark,
        error: schema.exportJobs.error,
        createdAt: schema.exportJobs.createdAt,
        startedAt: schema.exportJobs.startedAt,
        completedAt: schema.exportJobs.completedAt,
        // Null until the render finishes and its asset row exists.
        url: schema.assets.url,
        filename: schema.assets.filename,
        sizeBytes: schema.assets.sizeBytes,
        durationSeconds: schema.assets.durationSeconds,
      })
      .from(schema.exportJobs)
      .leftJoin(schema.assets, eq(schema.assets.id, schema.exportJobs.outputAssetId))
      .where(eq(schema.exportJobs.projectId, id))
      .orderBy(desc(schema.exportJobs.createdAt)),
    db
      .select({ value: count() })
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.projectId, id)),
    project.orgId ? plansFor([project.orgId]) : new Map<string, PlanInfo>(),
  ]);

  const { orgId, orgName, ...rest } = project;
  const frames = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);

  return c.json({
    ...rest,
    durationSeconds: frames / project.fps,
    sceneCount: scenes.length,
    messageCount: messages[0]?.value ?? 0,
    exportCount: exports.filter((e) => e.status === "done").length,
    organization: orgId
      ? { id: orgId, name: orgName!, ...(plans.get(orgId) ?? FREE) }
      : null,
    scenes,
    exports,
  });
});
