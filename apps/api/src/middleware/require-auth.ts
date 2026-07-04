import { createMiddleware } from "hono/factory";
import { asc, eq, db, schema } from "@genmotion/db";
import { auth, type AuthSession } from "../auth";
import { verifyAdminToken } from "../admin/token";

export type AuthEnv = {
  Variables: {
    user: AuthSession["user"];
    session: AuthSession["session"];
    /** The caller's active organization — every project request scopes to it. */
    organizationId: string;
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  // Hard boundary: an admin token is NOT a product credential. Reject it up
  // front so it can never be treated as a session (belt-and-braces — product
  // auth is cookie-based and never reads Bearer, but this makes it explicit).
  const authz = c.req.header("authorization") ?? "";
  if (authz.startsWith("Bearer ") && verifyAdminToken(authz.slice(7))) {
    return c.json({ error: "Admin credentials cannot be used on product APIs." }, 401);
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Prefer the session's active org; fall back to the user's first membership
  // (older sessions / edge cases) so requests always have an org to scope by.
  let organizationId = session.session.activeOrganizationId ?? null;
  if (!organizationId) {
    const [m] = await db
      .select({ organizationId: schema.member.organizationId })
      .from(schema.member)
      .where(eq(schema.member.userId, session.user.id))
      .orderBy(asc(schema.member.createdAt))
      .limit(1);
    organizationId = m?.organizationId ?? null;
  }
  if (!organizationId) {
    return c.json({ error: "No active organization" }, 403);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  c.set("organizationId", organizationId);
  await next();
});
