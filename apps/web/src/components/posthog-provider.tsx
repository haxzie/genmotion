"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import {
  posthog,
  POSTHOG_KEY,
  POSTHOG_HOST,
  analyticsEnabled,
} from "@/lib/analytics";

/**
 * Initialize at module scope, not in an effect.
 *
 * React flushes effects bottom-up, so every `useEffect` in the tree below this
 * provider — the pageview tracker here, `identify()` in the app shell, the
 * onboarding events — ran BEFORE the provider's own init effect could call
 * `posthog.init()`. posthog-js drops any `capture()` made before init, so on a
 * hard page load the first event of the session was silently thrown away. That
 * is every landing pageview, and every `identify()` after an OAuth or magic-link
 * callback, since both arrive as full page loads. Only client-side navigations
 * survived, because init had already run by then.
 *
 * Running it on import means init is done before React renders anything at all.
 */
if (typeof window !== "undefined" && analyticsEnabled && !posthog.__loaded) {
  posthog.init(POSTHOG_KEY!, {
    api_host: POSTHOG_HOST,
    // We fire pageviews ourselves (App Router doesn't do full navigations).
    capture_pageview: false,
    capture_pageleave: true,
    // Only create person profiles once a user is identified (cheaper).
    person_profiles: "identified_only",
    // autocapture is on by default — clicks/inputs are tracked automatically.
  });
}

/** Capture a SPA pageview on every route change (init disables auto pageviews). */
function PageviewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!analyticsEnabled) return;
    posthog.capture("$pageview", {
      $current_url: window.location.origin + pathname,
    });
  }, [pathname]);
  return null;
}

/**
 * Provides the initialized PostHog client via context. Autocapture (clicks /
 * inputs / form submits) works out of the box; pageviews are captured manually
 * per route change. A no-op passthrough when there's no key.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!analyticsEnabled) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PageviewTracker />
      {children}
    </PHProvider>
  );
}
