/**
 * The renderer's half of analytics.
 *
 * Stands in for the web app's `@/lib/analytics` (see the alias in
 * vite.config.ts), so every component shared with the web app keeps calling
 * `track()` unchanged. There is no PostHog key here and there will not be one:
 * events go over IPC to the main process, which queues them and forwards them
 * to the hosted API. See electron/analytics.ts.
 *
 * The PostHog-specific exports stay inert — nothing in the desktop app reads
 * them beyond the `analyticsEnabled` guards, and there is no client to identify
 * against. Identity is the API's to assign: it takes the user from the caller's
 * session, never from anything sent here.
 */
export const POSTHOG_KEY = undefined;
export const POSTHOG_HOST = undefined;
export const analyticsEnabled = true;
export const GA_ID = undefined;
export const gaEnabled = false;

export function track(event: string, properties?: Record<string, unknown>): void {
  try {
    // Absent when the renderer runs outside Electron (`vite dev` in a browser).
    window.genmotion?.track(event, properties);
  } catch {
    /* never let analytics throw into the app */
  }
}

/** No-op: the API identifies events from the session the app is signed in as. */
export function identify(_id: string, _properties?: Record<string, unknown>): void {}
export function resetAnalytics(): void {}
