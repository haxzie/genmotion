import { Hono } from "hono";
import { and, count, desc, eq, gte, sql, db, schema } from "@genmotion/db";
import { auth } from "../auth";
import { signAdminToken } from "../admin/token";
import { isAdminEmail } from "../admin/domains";
import { requireAdmin, type AdminEnv } from "../middleware/require-admin";

/**
 * Admin console API. `POST /session` is gated by the better-auth session and,
 * after an email-domain check, mints a short-lived admin token. Every other
 * route requires that Bearer token via `requireAdmin` — a normal user session
 * cannot reach the data below.
 */
export const adminRoutes = new Hono<AdminEnv>();

const DAY = (col: unknown) => sql<string>`to_char(${col}, 'YYYY-MM-DD')`;
const scalar = async (query: Promise<Array<{ value: number }>>) =>
  Number((await query)[0]?.value ?? 0);

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

/** Organizations with member + project counts (plan is a "Free" placeholder). */
adminRoutes.get("/organizations", async (c) => {
  const orgs = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      createdAt: schema.organization.createdAt,
    })
    .from(schema.organization)
    .orderBy(desc(schema.organization.createdAt));

  const [members, projects] = await Promise.all([
    db
      .select({ orgId: schema.member.organizationId, n: count() })
      .from(schema.member)
      .groupBy(schema.member.organizationId),
    db
      .select({ orgId: schema.projects.organizationId, n: count() })
      .from(schema.projects)
      .groupBy(schema.projects.organizationId),
  ]);
  const memberBy = new Map(members.map((m) => [m.orgId, m.n]));
  const projectBy = new Map(projects.map((p) => [p.orgId, p.n]));

  return c.json(
    orgs.map((o) => ({
      ...o,
      plan: "Free",
      memberCount: memberBy.get(o.id) ?? 0,
      projectCount: projectBy.get(o.id) ?? 0,
    })),
  );
});

/** All users (+ how many projects they created). */
adminRoutes.get("/users", async (c) => {
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(desc(schema.user.createdAt))
    .limit(1000);

  const projects = await db
    .select({ userId: schema.projects.userId, n: count() })
    .from(schema.projects)
    .groupBy(schema.projects.userId);
  const projectBy = new Map(projects.map((p) => [p.userId, p.n]));

  return c.json(
    users.map((u) => ({ ...u, projectCount: projectBy.get(u.id) ?? 0 })),
  );
});

/** Recently exported videos with their project's thumbnail. */
adminRoutes.get("/videos", async (c) => {
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
    .where(eq(schema.assets.kind, "export"))
    .orderBy(desc(schema.assets.createdAt))
    .limit(60);
  return c.json(rows);
});

/** Render queue: recent export jobs with status/progress for the live list. */
adminRoutes.get("/renders", async (c) => {
  const status = c.req.query("status");
  const where = status
    ? and(
        eq(schema.exportJobs.status, status as typeof schema.exportJobs.$inferSelect.status),
      )
    : undefined;
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
    .orderBy(desc(schema.exportJobs.createdAt))
    .limit(100);
  return c.json(rows);
});
