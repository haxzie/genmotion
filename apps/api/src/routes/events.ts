import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { trackClientEvent } from "../analytics";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

/**
 * Product analytics from the desktop app.
 *
 * The desktop app has no analytics pipeline of its own — bundling a PostHog
 * key into a distributable would ship a write credential to every user, and an
 * open-source one at that. So it reports here instead and the server, which
 * already holds the key, forwards to PostHog.
 *
 * Session-authed on purpose: the event's identity comes from the caller's
 * session, never from the body, so nobody can write events onto another
 * person's timeline. That also means anonymous, pre-sign-in events are simply
 * not collectable — an acceptable trade for not running an unauthenticated
 * write endpoint on the open internet.
 */
export const eventRoutes = new Hono<AuthEnv>();

eventRoutes.use(requireAuth);

/**
 * A batch is capped well below anything the app would send in a session. The
 * app buffers while offline, so the cap is what stops a long-disconnected
 * client (or a modified one) from arriving with an unbounded backlog.
 */
const MAX_BATCH = 50;

const eventSchema = z.object({
  /** Slugified and prefixed server-side; see `trackClientEvent`. */
  name: z.string().min(1).max(64),
  properties: z.record(z.string(), z.unknown()).optional(),
  /**
   * When the event actually happened, which is not when it arrived: the app
   * buffers events while offline. Ignored if it isn't a valid date.
   */
  timestamp: z.string().datetime().optional(),
});

const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(MAX_BATCH),
});

eventRoutes.post("/", zValidator("json", bodySchema), (c) => {
  const user = c.get("user");
  const organizationId = c.get("organizationId");
  const { events } = c.req.valid("json");

  for (const event of events) {
    trackClientEvent({
      name: event.name,
      distinctId: user.id,
      properties: {
        ...event.properties,
        // Stamped here rather than trusted from the body: which org a caller
        // belongs to is a server fact, and it is what makes team-level
        // reporting possible at all.
        organization_id: organizationId,
        source: "desktop",
      },
      ...(event.timestamp ? { timestamp: new Date(event.timestamp) } : {}),
    });
  }

  // 202: PostHog delivery is fire-and-forget and must never fail the caller.
  // The app treats any 2xx as "sent" and drops its buffered copy.
  return c.json({ accepted: events.length }, 202);
});
