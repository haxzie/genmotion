import { randomUUID } from "node:crypto";
import { Webhook } from "standardwebhooks";
import { app } from "../../app";

/**
 * Signs webhook deliveries with the same library the SDK verifies them with,
 * so the signature check under test is the real one rather than a
 * reimplementation that could drift from it.
 */

const WEBHOOK_PATH = "/api/webhooks/dodo";

function signer(secret = process.env.DODOPAYMENT_WEBHOOK_KEY!): Webhook {
  return new Webhook(secret.replace(/^whsec_/, ""));
}

export interface SignedDelivery {
  body: string;
  headers: Record<string, string>;
  webhookId: string;
}

export function signWebhook(
  payload: unknown,
  opts: {
    webhookId?: string;
    timestamp?: Date;
    secret?: string;
    /** Mutate the body after signing, to test tamper detection. */
    tamper?: (body: string) => string;
  } = {},
): SignedDelivery {
  const webhookId = opts.webhookId ?? `whid_${randomUUID()}`;
  const timestamp = opts.timestamp ?? new Date();
  const body = JSON.stringify(payload);
  const signature = signer(opts.secret).sign(webhookId, timestamp, body);

  return {
    body: opts.tamper ? opts.tamper(body) : body,
    webhookId,
    headers: {
      "webhook-id": webhookId,
      "webhook-signature": signature,
      "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "content-type": "application/json",
    },
  };
}

/**
 * POST a signed delivery at the webhook route.
 *
 * Goes to `app.request` directly rather than the shared `request` helper: the
 * signature covers an exact byte sequence, so the body must be sent verbatim
 * rather than re-serialised from an object.
 */
export async function postWebhook(
  delivery: SignedDelivery,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await app.request(WEBHOOK_PATH, {
    method: "POST",
    headers: delivery.headers,
    body: delivery.body,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed as Record<string, unknown> };
}

/** A subscription event envelope shaped like the provider's. */
export function subscriptionEvent(
  type: string,
  opts: {
    organizationId?: string;
    productId?: string;
    subscriptionId?: string;
    customerId?: string;
    status?: string;
    nextBillingDate?: Date | null;
    cancelAtNextBillingDate?: boolean;
    timestamp?: Date;
    withMetadata?: boolean;
    /** Extra seats bought as add-on quantity, on top of the one Pro includes. */
    extraSeats?: number;
  } = {},
) {
  const {
    organizationId,
    productId = process.env.DODOPAYMENT_PRO_PRODUCT_ID,
    subscriptionId = "sub_test_1",
    customerId = "cus_test_1",
    status,
    nextBillingDate = new Date(Date.now() + 30 * 24 * 3600 * 1000),
    cancelAtNextBillingDate = false,
    timestamp = new Date(),
    withMetadata = true,
    extraSeats = 0,
  } = opts;

  return {
    business_id: "biz_test",
    type,
    timestamp: timestamp.toISOString(),
    data: {
      payload_type: "Subscription",
      subscription_id: subscriptionId,
      product_id: productId,
      status: status ?? "active",
      customer: { customer_id: customerId, email: "buyer@example.test" },
      metadata:
        withMetadata && organizationId ? { organizationId, plan: "pro" } : {},
      next_billing_date: nextBillingDate?.toISOString() ?? null,
      cancel_at_next_billing_date: cancelAtNextBillingDate,
      addons:
        extraSeats > 0
          ? [
              {
                addon_id: process.env.DODOPAYMENT_SEAT_ADDON_ID ?? "adn_test_seat",
                quantity: extraSeats,
              },
            ]
          : [],
    },
  };
}
