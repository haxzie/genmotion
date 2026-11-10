import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getTemplate } from "@genmotion/templates";
import { trackClientEvent } from "../analytics";
import { notifyProjectCreated, notifyTemplateRemixed, notifyVideoExported } from "../slack";
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
    void relayToSlack(user, event);
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

type Reporter = { name?: string | null; email: string };
type ClientEvent = { properties?: Record<string, unknown>; timestamp?: string };

/**
 * The client events that also go to Slack: the three product moments worth
 * hearing about live — a project started, a video finished, and a template
 * made into one of someone's own.
 *
 * An allowlist on purpose: this endpoint takes whatever the app reports, and a
 * feed that relayed everything would be an open tap into a team channel.
 * Anything else worth hearing about gets added here explicitly.
 */
const SLACK_RELAYS: Record<string, (user: Reporter, event: ClientEvent) => Promise<void>> = {
  template_remixed: relayRemix,
  project_created: relayProjectCreated,
  video_exported: relayVideoExported,
};

/**
 * Post an event to the ops feed, if it is one of the few that go there. Never
 * awaited by the handler and never allowed to throw — the same rule the rest
 * of `slack.ts` follows, extended over the catalog read a message may need.
 */
async function relayToSlack(user: Reporter, event: ClientEvent & { name: string }): Promise<void> {
  const relay = SLACK_RELAYS[event.name];
  if (!relay) return;
  try {
    await relay(user, event);
  } catch (err) {
    console.error("[events] slack relay failed:", err instanceof Error ? err.message : err);
  }
}

/** When it happened, which is not when it arrived — the app buffers offline. */
function happenedAt(event: ClientEvent): { at?: Date } {
  if (!event.timestamp) return {};
  const at = new Date(event.timestamp);
  return Number.isNaN(at.getTime()) ? {} : { at };
}

async function relayRemix(user: Reporter, event: ClientEvent): Promise<void> {
  const templateId = event.properties?.templateId;
  if (typeof templateId !== "string" || !templateId) return;
  const record = await getTemplate(templateId).catch(() => null);
  notifyTemplateRemixed({
    user,
    templateId,
    templateName: record?.meta.title,
    ...happenedAt(event),
  });
}

async function relayProjectCreated(user: Reporter, event: ClientEvent): Promise<void> {
  const engine = event.properties?.engine;
  notifyProjectCreated({
    user,
    project: projectName(event),
    engine: typeof engine === "string" ? engine : null,
    ...happenedAt(event),
  });
}

async function relayVideoExported(user: Reporter, event: ClientEvent): Promise<void> {
  const format = event.properties?.format;
  const duration = event.properties?.durationSeconds;
  notifyVideoExported({
    user,
    project: projectName(event),
    format: typeof format === "string" ? format : null,
    durationSeconds: typeof duration === "number" ? duration : null,
    ...happenedAt(event),
  });
}

/**
 * What the project is called, as the app reported it. Absent from builds older
 * than the one that started sending it, which is why every message that uses
 * it reads without it too.
 */
function projectName(event: ClientEvent): string | null {
  const name = event.properties?.name;
  return typeof name === "string" ? name : null;
}
