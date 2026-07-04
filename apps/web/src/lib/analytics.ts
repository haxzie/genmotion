import posthog from "posthog-js";

/**
 * Analytics — a thin, typed wrapper over PostHog for the web app.
 *
 * PostHog is initialized once by `PostHogProvider` (components/posthog-provider).
 * Autocapture handles generic clicks / inputs / pageviews automatically; use the
 * `track()` helper below for the business events we care about, with a typed
 * event name so they stay consistent across the app.
 *
 * Everything is a no-op until NEXT_PUBLIC_POSTHOG_KEY is set, so it's safe to
 * call anywhere (including before init / in dev without a key).
 */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
export const analyticsEnabled = !!POSTHOG_KEY;

export { posthog };

/** The custom events we deliberately track (in addition to autocapture). */
export type AnalyticsEvent =
  // Auth
  | "signin_started" // { provider }
  | "signup_started" // { provider }
  // Projects
  | "project_created" // { fromPrompt }
  | "project_opened"
  // Editor / chat
  | "chat_message_sent" // { hasSelection, length }
  | "scene_selected"
  | "audio_clip_added"
  // Export
  | "export_started" // { format }
  | "export_downloaded" // { format }
  | "export_cancelled"
  // Marketing
  | "cta_clicked" // { location, label }
  | "showcase_video_opened"; // { slug }

/** Capture a typed custom event. Safe to call when analytics is disabled. */
export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): void {
  if (!analyticsEnabled) return;
  try {
    posthog.capture(event, properties);
  } catch {
    /* never let analytics throw into the app */
  }
}

/** Associate subsequent events with a known user (call after sign-in). */
export function identify(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (!analyticsEnabled) return;
  try {
    posthog.identify(userId, properties);
  } catch {
    /* ignore */
  }
}

/** Clear identity (call on sign-out). */
export function resetAnalytics(): void {
  if (!analyticsEnabled) return;
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}
