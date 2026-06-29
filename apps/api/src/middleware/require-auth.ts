import { createMiddleware } from "hono/factory";
import { auth, type AuthSession } from "../auth";

export type AuthEnv = {
  Variables: {
    user: AuthSession["user"];
    session: AuthSession["session"];
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
