import { api } from "../api";

/**
 * Checkout, desktop-shaped.
 *
 * There is no checkout in this app and this window carries no session cookie,
 * so both of these end the same way: in the user's real browser, on the web
 * app's billing page. `plan` is accepted and ignored — there is one paid plan,
 * and the page decides what to sell.
 */
export type PurchasablePlan = "pro";

export async function startCheckout(_plan: PurchasablePlan): Promise<void> {
  await api.openWeb("/settings/billing");
}

export async function openBillingPortal(): Promise<void> {
  await api.openWeb("/settings/billing");
}
