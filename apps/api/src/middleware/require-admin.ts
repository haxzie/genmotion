import { createMiddleware } from "hono/factory";
import { verifyAdminToken } from "../admin/token";
import { isAdminEmail } from "../admin/domains";

export type AdminEnv = {
  Variables: {
    adminUser: { userId: string; email: string };
  };
};

/**
 * Gate for the admin data APIs. Authorizes ONLY via a Bearer admin token (minted
 * by POST /api/admin/session after a domain check) — a regular user session is
 * NOT accepted here. Re-checks the token's email against the allowlist so
 * revoking a domain takes effect immediately, before the token expires.
 */
export const requireAdmin = createMiddleware<AdminEnv>(async (c, next) => {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const claims = token ? verifyAdminToken(token) : null;
  if (!claims || !isAdminEmail(claims.email)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("adminUser", claims);
  await next();
});
