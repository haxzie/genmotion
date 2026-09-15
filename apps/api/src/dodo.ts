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

/** Which provider product backs each purchasable plan. */
export function productForPlan(plan: PlanId): string | undefined {
  if (plan === "pro") return env.DODOPAYMENT_PRO_PRODUCT_ID;
  if (plan === "max") return env.DODOPAYMENT_MAX_PRODUCT_ID;
  return undefined;
}

/**
 * Move a live subscription to another plan — Pro to Max, or back.
 *
 * Up is prorated from today: the team gets its seats and allowance now and
 * pays the difference for the rest of the period. Down is `do_not_bill`: the
 * smaller plan takes effect at the next renewal, with nothing to refund (the
 * period was paid for) — a prorated shrink observed in test mode restarted
 * the cycle and produced an extra full charge. Note that Dodo also moves the
 * billing date to the day of the change for every prorated mode.
 */
export async function changePlan(
  subscriptionId: string,
  plan: PlanId,
  direction: "up" | "down",
): Promise<void> {
  const productId = productForPlan(plan);
  if (!productId) throw new Error(`No product for plan ${plan}`);
  await dodoClient().subscriptions.changePlan(subscriptionId, {
    product_id: productId,
    quantity: 1,
    proration_billing_mode: direction === "up" ? "prorated_immediately" : "do_not_bill",
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
  if (productId === env.DODOPAYMENT_MAX_PRODUCT_ID) return "max";
  return null;
}
