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
export type PurchasablePlan = "pro" | "max";

/**
 * Start checkout and send the browser to the provider. Never returns. A plan
 * is the whole of its seats — Pro one, Max five — so there is nothing to
 * size; the server refuses a plan too small for the org.
 */
export async function startCheckout(
  plan: PurchasablePlan,
  reason?: UpgradeReason,
): Promise<"redirected" | "changed"> {
  track("upgrade_checkout_started", { plan, reason });
  const res = await api<{ url?: string; changed?: boolean }>("/api/billing/checkout", {
    json: { plan },
  });
  // A live subscription changes plan in place — nothing to pay at now.
  if (res.changed) return "changed";
  window.location.href = res.url!;
  return "redirected";
}

export async function openBillingPortal(): Promise<void> {
  track("billing_portal_opened");
  const { url } = await api<{ url: string }>("/api/billing/portal", {
    method: "POST",
  });
  window.location.href = url;
}
