import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";

/**
 * Analytics — a thin, typed wrapper over PostHog and Google Analytics 4.
 *
 * PostHog is initialized once by `PostHogProvider` (components/posthog-provider);
 * GA4 is loaded by the `<GoogleAnalytics>` tag in the root layout. Autocapture
 * (PostHog) and enhanced measurement (GA4) handle generic clicks / pageviews;
 * use the `track()` helper below for the business events we care about, with a
 * typed event name so they stay consistent across the app.
 *
 * Each destination is independently gated on its env var, so this is safe to
 * call anywhere — with neither key set, everything is a no-op.
 */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
export const analyticsEnabled = !!POSTHOG_KEY;

/** GA4 measurement ID (`G-XXXXXXXXXX`). GA is a no-op when unset. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
export const gaEnabled = !!GA_ID;

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

/**
 * Capture a typed custom event, fanned out to every enabled destination.
 * Safe to call when analytics is disabled.
 */
export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): void {
  if (analyticsEnabled) {
    try {
      posthog.capture(event, properties);
    } catch {
      /* never let analytics throw into the app */
    }
  }
  if (gaEnabled) {
    try {
      // Our event names are already GA4-shaped (snake_case, <= 40 chars).
      sendGAEvent("event", event, properties ?? {});
    } catch {
      /* ignore */
    }
  }
}

/** Associate subsequent events with a known user (call after sign-in). */
export function identify(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (analyticsEnabled) {
    try {
      posthog.identify(userId, properties);
    } catch {
      /* ignore */
    }
  }
  if (gaEnabled) {
    try {
      // GA4 stitches sessions across devices via user_id.
      sendGAEvent("set", { user_id: userId });
    } catch {
      /* ignore */
    }
  }
}

/** Clear identity (call on sign-out). */
export function resetAnalytics(): void {
  if (analyticsEnabled) {
    try {
      posthog.reset();
    } catch {
      /* ignore */
    }
  }
  if (gaEnabled) {
    try {
      sendGAEvent("set", { user_id: null });
    } catch {
      /* ignore */
    }
  }
}
