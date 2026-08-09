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
