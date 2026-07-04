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
 * Initializes PostHog once on the client and provides it via context. Enables
 * autocapture (clicks / inputs / form submits) out of the box; pageviews are
 * captured manually per route change. A no-op passthrough when there's no key.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!analyticsEnabled || posthog.__loaded) return;
    posthog.init(POSTHOG_KEY!, {
      api_host: POSTHOG_HOST,
      // We fire pageviews ourselves (App Router doesn't do full navigations).
      capture_pageview: false,
      capture_pageleave: true,
      // Only create person profiles once a user is identified (cheaper).
      person_profiles: "identified_only",
      // autocapture is on by default — clicks/inputs are tracked automatically.
    });
  }, []);

  if (!analyticsEnabled) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PageviewTracker />
      {children}
    </PHProvider>
  );
}
