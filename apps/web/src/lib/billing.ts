import type { PlanId, UpgradeReason } from "@genmotion/shared";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";

/**
 * Checkout and billing-portal redirects.
 *
 * Both hand off to the payment provider's hosted pages with a full navigation
 * rather than a popup — the provider owns card entry, and returning through a
 * redirect keeps the flow working on mobile.
 */

export type PurchasablePlan = Extract<PlanId, "pro" | "team">;

/** Start checkout and send the browser to the provider. Never returns. */
export async function startCheckout(
  plan: PurchasablePlan,
  reason?: UpgradeReason,
): Promise<void> {
  track("upgrade_checkout_started", { plan, reason });
  const { url } = await api<{ url: string }>("/api/billing/checkout", {
    json: { plan },
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
