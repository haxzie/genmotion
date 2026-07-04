import { Hono } from "hono";
import {
  and,
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
import { auth } from "../auth";
import { signAdminToken } from "../admin/token";
import { isAdminEmail } from "../admin/domains";
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

/** Organizations (paginated) with member + project counts (plan = "Free"). */
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
  const [members, projects] = ids.length
    ? await Promise.all([
        db
          .select({ orgId: schema.member.organizationId, n: count() })
          .from(schema.member)
          .where(inArray(schema.member.organizationId, ids))
          .groupBy(schema.member.organizationId),
        db
          .select({ orgId: schema.projects.organizationId, n: count() })
          .from(schema.projects)
          .where(inArray(schema.projects.organizationId, ids))
          .groupBy(schema.projects.organizationId),
      ])
    : [[], []];
  const memberBy = new Map(members.map((m) => [m.orgId, m.n]));
  const projectBy = new Map(projects.map((p) => [p.orgId, p.n]));

  return c.json({
    items: orgs.map((o) => ({
      ...o,
      plan: "Free",
      memberCount: memberBy.get(o.id) ?? 0,
      projectCount: projectBy.get(o.id) ?? 0,
    })),
    nextCursor: nextCursor(orgs),
  });
});

/** Users (paginated) + how many projects each created. */
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
  const projects = ids.length
    ? await db
        .select({ userId: schema.projects.userId, n: count() })
        .from(schema.projects)
        .where(inArray(schema.projects.userId, ids))
        .groupBy(schema.projects.userId)
    : [];
  const projectBy = new Map(projects.map((p) => [p.userId, p.n]));

  return c.json({
    items: users.map((u) => ({ ...u, projectCount: projectBy.get(u.id) ?? 0 })),
    nextCursor: nextCursor(users),
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
