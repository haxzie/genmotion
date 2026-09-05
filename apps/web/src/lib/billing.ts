import type { UpgradeReason } from "@genmotion/shared";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";

/**
 * Checkout and billing-portal redirects.
 *
 * Both hand off to the payment provider's hosted pages with a full navigation
 * rather than a popup — the provider owns card entry, and returning through a
 * redirect keeps the flow working on mobile.
 */

/** The one paid plan. Free is the absence of a subscription, not a purchase. */
export type PurchasablePlan = "pro";

/**
 * Start checkout and send the browser to the provider. Never returns.
 *
 * `seats` is how many people the subscription should cover from day one. The
 * server never buys fewer than the org's headcount; this only raises it — the
 * upgrade modal opened for an invite passes the seat that invite needs.
 */
export async function startCheckout(
  plan: PurchasablePlan,
  reason?: UpgradeReason,
  seats?: number,
): Promise<void> {
  track("upgrade_checkout_started", { plan, reason });
  const { url } = await api<{ url: string }>("/api/billing/checkout", {
    json: { plan, ...(seats ? { seats } : {}) },
  });
  window.location.href = url;
}

export async function openBillingPortal(): Promise<void> {
  track("billing_portal_opened");
  const { url } = await api<{ url: string }>("/api/billing/portal", {
    method: "POST",
  });
  window.location.href = url;
}
