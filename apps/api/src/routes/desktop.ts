import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, db, schema } from "@genmotion/db";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

/**
 * What the desktop app needs the moment it has a token: who it is signed in
 * as, and which organization its requests will be scoped to.
 *
 * The app calls this once right after the device grant (POST, to name the
 * session) and again on every launch (GET, to check the stored token is still
 * good). A 401 from either is the signal to wipe the token and show the login
 * screen — there is no refresh token to fall back on.
 */
export const desktopRoutes = new Hono<AuthEnv>();

desktopRoutes.use(requireAuth);

interface DesktopSessionPayload {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    onboardingCompleted: boolean;
  };
  organization: { id: string; name: string; slug: string } | null;
  expiresAt: string;
}

async function payload(c: Context<AuthEnv>): Promise<DesktopSessionPayload> {
  const user = c.get("user");
  const session = c.get("session");
  const organizationId = c.get("organizationId");

  const [org] = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
    })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      onboardingCompleted: Boolean(user.onboardingCompleted),
    },
    organization: org ?? null,
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

desktopRoutes.get("/session", async (c) => c.json(await payload(c)));

/**
 * Same payload, plus a name for the session row.
 *
 * The device grant mints its session with no request attached, so better-auth
 * writes neither `ipAddress` nor `userAgent` — every desktop login would show
 * up unlabelled in the account's session list. The app sends a device name on
 * first contact and we stamp it here, which is the only chance to do so.
 */
desktopRoutes.post(
  "/session",
  zValidator("json", z.object({ deviceName: z.string().trim().min(1).max(120).optional() })),
  async (c) => {
    const { deviceName } = c.req.valid("json");
    if (deviceName) {
      await db
        .update(schema.session)
        .set({ userAgent: deviceName })
        .where(eq(schema.session.id, c.get("session").id));
    }
    return c.json(await payload(c));
  },
);
