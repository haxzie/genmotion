import { PostHog } from "posthog-node";
import { env } from "./env";

/**
 * Server-side analytics — the single place the API talks to PostHog.
 *
 * The browser already tracks the product surface, and this deliberately does
 * not duplicate it. It exists for the handful of facts only the server knows
 * for certain, signup being the motivating one: with magic link and OAuth the
 * client cannot tell a new account from a returning login, because both land
 * on the same callback. The database can — a user row is created exactly once.
 *
 * Server events also survive ad blockers and a user closing the tab mid-redirect,
 * which is precisely when a browser-fired signup event goes missing.
 *
 * Inert until `POSTHOG_KEY` is set, so local and test runs never emit.
 */

let client: PostHog | null = null;

export const analyticsEnabled = !!env.POSTHOG_KEY;

function getClient(): PostHog | null {
  if (!analyticsEnabled) return null;
  if (!client) {
    client = new PostHog(env.POSTHOG_KEY!, {
      host: env.POSTHOG_HOST,
      // Send immediately rather than batching. These are low-volume lifecycle
      // events, and the API has no shutdown hook to flush a pending batch — a
      // queued signup would simply be lost on deploy.
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/** The server-side events. Kept small and lifecycle-shaped on purpose. */
export type ServerAnalyticsEvent = "user_signed_up";

/**
 * Every event a client is allowed to report is published under this prefix.
 *
 * The prefix is applied here, server-side, and the name is slugified before it
 * is used — so a caller cannot emit `user_signed_up`, cannot collide with any
 * future server event, and cannot invent a name containing whatever PostHog
 * treats as special. In a dashboard the origin of an event is then a property
 * of its name rather than something you have to remember.
 */
const CLIENT_EVENT_PREFIX = "desktop_";

/** Names are lowercase words joined by underscores; anything else is folded in. */
function slugifyEvent(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/** Reject values that would bloat the payload or nest without bound. */
function sanitizeProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!properties) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties).slice(0, MAX_PROPERTIES)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") clean[key] = value.slice(0, MAX_STRING_LENGTH);
    else if (typeof value === "number" || typeof value === "boolean") clean[key] = value;
    // Objects and arrays are dropped rather than serialised: nothing the app
    // reports needs them, and accepting them invites unbounded payloads.
  }
  return clean;
}

const MAX_PROPERTIES = 40;
const MAX_STRING_LENGTH = 500;

/**
 * Report an event a client asked us to record.
 *
 * `distinctId` is always taken from the caller's session, never from the
 * request body — otherwise anyone with an account could write events onto
 * someone else's timeline.
 *
 * Never throws, for the same reason `trackServer` does not: analytics must not
 * be able to fail a request.
 */
export function trackClientEvent({
  name,
  distinctId,
  properties,
  timestamp,
}: {
  name: string;
  distinctId: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}): void {
  const posthog = getClient();
  if (!posthog) return;
  const slug = slugifyEvent(name);
  if (!slug) return;
  try {
    posthog.capture({
      distinctId,
      event: `${CLIENT_EVENT_PREFIX}${slug}`,
      properties: sanitizeProperties(properties),
      ...(timestamp ? { timestamp } : {}),
    });
  } catch (err) {
    console.error(`[analytics] failed to capture ${slug}:`, err);
  }
}

/**
 * Capture an event against a user.
 *
 * `distinctId` is the user's id, which is also what the browser calls
 * `identify()` with — that is what stitches this event onto the same person as
 * their anonymous pre-signup activity.
 *
 * Never throws: analytics must not be able to fail a request.
 */
export function trackServer(
  event: ServerAnalyticsEvent,
  {
    distinctId,
    properties,
    person,
  }: {
    distinctId: string;
    properties?: Record<string, unknown>;
    /** Person properties to set on the PostHog profile (email, name, …). */
    person?: Record<string, unknown>;
  },
): void {
  const posthog = getClient();
  if (!posthog) return;
  try {
    posthog.capture({
      distinctId,
      event,
      properties: { ...properties, ...(person ? { $set: person } : {}) },
    });
  } catch (err) {
    console.error(`[analytics] failed to capture ${event}:`, err);
  }
}
