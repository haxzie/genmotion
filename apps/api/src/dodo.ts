import DodoPayments from "dodopayments";
import type { PlanId } from "@genmotion/shared";
import { env } from "./env";

/**
 * The only place the payment SDK is touched.
 *
 * Everything else in the codebase talks to these helpers, so the provider can
 * be swapped, and tests have exactly one module to stub.
 */

/** Checkout is available. */
export const dodoEnabled = Boolean(env.DODOPAYMENT_API_KEY);

/** Webhook deliveries can be verified. Without the key we refuse them. */
export const dodoWebhooksEnabled = Boolean(env.DODOPAYMENT_WEBHOOK_KEY);

let client: DodoPayments | null = null;

/**
 * Lazy so the API boots with billing unconfigured — local dev and CI run
 * without keys, and every route that needs one checks `dodoEnabled` first.
 */
export function dodoClient(): DodoPayments {
  if (!env.DODOPAYMENT_API_KEY) {
    throw new Error("DODOPAYMENT_API_KEY is not set");
  }
  client ??= new DodoPayments({
    bearerToken: env.DODOPAYMENT_API_KEY,
    environment: env.DODOPAYMENT_ENVIRONMENT,
    webhookKey: env.DODOPAYMENT_WEBHOOK_KEY,
  });
  return client;
}

/** Test seam: drop the memoised client so env changes take effect. */
export function resetDodoClient(): void {
  client = null;
}

/** Which provider product backs each purchasable plan. Only Pro is buyable. */
export function productForPlan(plan: PlanId): string | undefined {
  return plan === "pro" ? env.DODOPAYMENT_PRO_PRODUCT_ID : undefined;
}

/** The add-on that carries every seat past the one Pro includes. */
export function seatAddonId(): string | undefined {
  return env.DODOPAYMENT_SEAT_ADDON_ID;
}

/**
 * Add-on lines for a given headcount.
 *
 * Pro carries one seat, so the add-on quantity is everyone *else*. A solo org
 * buys no add-on at all — an empty array rather than a zero quantity, which is
 * also how Dodo wants seats removed.
 */
export function seatAddons(totalSeats: number): { addon_id: string; quantity: number }[] {
  const addonId = seatAddonId();
  const extra = Math.max(0, totalSeats - 1);
  return addonId && extra > 0 ? [{ addon_id: addonId, quantity: extra }] : [];
}

/**
 * Resize an active subscription to cover `totalSeats`.
 *
 * Prorated immediately: a teammate invited today should be paid for from
 * today, and the alternative — billing at renewal — means carrying unbilled
 * seats for up to a month.
 */
export async function changeSeats(
  subscriptionId: string,
  totalSeats: number,
): Promise<void> {
  const productId = env.DODOPAYMENT_PRO_PRODUCT_ID;
  if (!productId) throw new Error("DODOPAYMENT_PRO_PRODUCT_ID is not set");
  await dodoClient().subscriptions.changePlan(subscriptionId, {
    product_id: productId,
    quantity: 1,
    proration_billing_mode: "prorated_immediately",
    addons: seatAddons(totalSeats),
  });
}

/**
 * Reverse lookup used by the webhook. The product id is the only plan signal we
 * trust from a delivery — metadata is caller-supplied at checkout and a
 * dashboard-initiated change carries none at all.
 */
export function planForProduct(
  productId: string | null | undefined,
): PlanId | null {
  if (!productId) return null;
  if (productId === env.DODOPAYMENT_PRO_PRODUCT_ID) return "pro";
  return null;
}
