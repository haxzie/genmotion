import { eq, sql, db, schema } from "@genmotion/db";
import { PLANS, type PlanId } from "@genmotion/shared";
import { planForProduct } from "../dodo";

/**
 * Turns a verified webhook delivery into subscription state.
 *
 * Three properties the provider's delivery model forces on us:
 *  - deliveries retry up to 8 times, so processing must be idempotent;
 *  - they can arrive out of order, so every write is a compare-and-set on the
 *    envelope timestamp;
 *  - anything we don't handle must still be acknowledged, or it is retried
 *    for hours.
 */

/** The subset of the envelope we rely on. */
/**
 * How many people the subscription covers.
 *
 * Pro carries one seat and every teammate past that is a quantity on the seat
 * add-on, so the total is base + add-on. Read from the payload rather than
 * from our plan table: the provider is the authority on what was actually
 * bought, including a change made in their dashboard that we never initiated.
 */
function seatsFromPayload(
  data: { addons?: { addon_id?: string; quantity?: number }[] | null },
  plan: PlanId,
): number {
  const included = PLANS[plan].includedSeats;
  const extra = (data.addons ?? []).reduce(
    (total, addon) => total + (addon.quantity ?? 0),
    0,
  );
  return included + extra;
}

export interface WebhookEnvelope {
  type: string;
  timestamp: string;
  data?: {
    subscription_id?: string;
    product_id?: string;
    status?: string;
    metadata?: Record<string, unknown> | null;
    customer?: { customer_id?: string } | null;
    next_billing_date?: string | null;
    cancel_at_next_billing_date?: boolean | null;
    /** Seat add-on lines; their quantities are the teammates past the first. */
    addons?: { addon_id?: string; quantity?: number }[] | null;
  } | null;
}

export type WebhookOutcome =
  | { status: "processed" }
  | { status: "deduped" }
  | { status: "stale" }
  | { status: "ignored"; detail: string };

/** Fields a transition writes. Omitted keys keep their existing value. */
type Patch = Partial<typeof schema.organizationSubscriptions.$inferInsert>;

/**
 * Events that carry a plan: we must be able to name the product, otherwise we
 * don't know what was bought and refuse to guess.
 */
const PLAN_BEARING = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.plan_changed",
  "subscription.updated",
]);

/** Events that only move the lifecycle forward and need no product mapping. */
const STATUS_ONLY: Record<string, string> = {
  "subscription.on_hold": "on_hold",
  "subscription.cancelled": "cancelled",
  "subscription.failed": "failed",
  "subscription.expired": "expired",
};

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Build the state change for an event, or a reason to ignore it.
 * Pure — the whole event→state policy is testable without a database.
 */
export function transitionFor(
  event: WebhookEnvelope,
): { patch: Patch } | { ignore: string } {
  const data = event.data ?? {};
  const common: Patch = {
    ...(data.subscription_id ? { dodoSubscriptionId: data.subscription_id } : {}),
    ...(data.customer?.customer_id
      ? { dodoCustomerId: data.customer.customer_id }
      : {}),
  };

  if (PLAN_BEARING.has(event.type)) {
    const plan = planForProduct(data.product_id);
    if (!plan) return { ignore: `unmapped product ${data.product_id ?? "(none)"}` };

    // `subscription.updated` is a full snapshot — the provider sends the latest
    // state at delivery time — so its status is taken from the payload rather
    // than inferred from the event name.
    const status =
      event.type === "subscription.updated" ? (data.status ?? "active") : "active";

    return {
      patch: {
        ...common,
        plan,
        status,
        seats: seatsFromPayload(data, plan),
        dodoProductId: data.product_id ?? null,
        currentPeriodEnd: toDate(data.next_billing_date),
        cancelAtPeriodEnd: Boolean(data.cancel_at_next_billing_date),
      },
    };
  }

  const status = STATUS_ONLY[event.type];
  if (status) {
    const patch: Patch = { ...common, status };
    // Expiry is the end of the road: drop the plan outright rather than relying
    // on a grace window that has, by definition, closed.
    if (status === "expired") patch.plan = "free";
    if (status === "cancelled") patch.cancelAtPeriodEnd = true;
    const periodEnd = toDate(data.next_billing_date);
    if (periodEnd) patch.currentPeriodEnd = periodEnd;
    return { patch };
  }

  return { ignore: `unhandled event ${event.type}` };
}

/** Resolve the org: checkout metadata first, then the subscription we stored. */
async function resolveOrganizationId(
  event: WebhookEnvelope,
): Promise<string | null> {
  const fromMetadata = event.data?.metadata?.organizationId;
  if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata;

  const subscriptionId = event.data?.subscription_id;
  if (!subscriptionId) return null;

  const [row] = await db
    .select({ organizationId: schema.organizationSubscriptions.organizationId })
    .from(schema.organizationSubscriptions)
    .where(eq(schema.organizationSubscriptions.dodoSubscriptionId, subscriptionId));
  return row?.organizationId ?? null;
}

async function finish(
  webhookId: string,
  status: "processed" | "ignored" | "stale" | "failed",
  detail?: string,
  organizationId?: string | null,
): Promise<void> {
  await db
    .update(schema.billingWebhookEvents)
    .set({ status, detail: detail ?? null, organizationId: organizationId ?? null })
    .where(eq(schema.billingWebhookEvents.id, webhookId));
}

/**
 * Process one verified delivery. Callers must have already checked the
 * signature — this function trusts its input.
 */
export async function handleWebhookEvent(
  webhookId: string,
  event: WebhookEnvelope,
): Promise<WebhookOutcome> {
  const eventAt = toDate(event.timestamp) ?? new Date();

  // Atomic claim. The webhook id is the primary key, so two concurrent
  // redeliveries of the same event cannot both get past this insert.
  const claimed = await db
    .insert(schema.billingWebhookEvents)
    .values({
      id: webhookId,
      type: event.type,
      dodoSubscriptionId: event.data?.subscription_id ?? null,
      eventAt,
      payload: event as unknown as Record<string, unknown>,
      status: "processed",
    })
    .onConflictDoNothing({ target: schema.billingWebhookEvents.id })
    .returning({ id: schema.billingWebhookEvents.id });

  if (claimed.length === 0) return { status: "deduped" };

  const organizationId = await resolveOrganizationId(event);
  if (!organizationId) {
    // Never retryable: an unattributable event will not become attributable.
    await finish(webhookId, "ignored", "no organization");
    return { status: "ignored", detail: "no organization" };
  }

  const transition = transitionFor(event);
  if ("ignore" in transition) {
    await finish(webhookId, "ignored", transition.ignore, organizationId);
    return { status: "ignored", detail: transition.ignore };
  }

  const values = {
    organizationId,
    ...transition.patch,
    lastEventAt: eventAt,
    lastWebhookId: webhookId,
  };

  const applied = await db
    .insert(schema.organizationSubscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: schema.organizationSubscriptions.organizationId,
      set: { ...transition.patch, lastEventAt: eventAt, lastWebhookId: webhookId, updatedAt: new Date() },
      // The out-of-order defence, in the WHERE clause rather than application
      // code so concurrent deliveries can't interleave around it. `<=` keeps
      // same-timestamp deliveries working; exact duplicates are already gone.
      //
      // The bound value is an ISO string, NOT a Date. Drizzle's column mapper
      // writes timestamps as UTC ISO strings, but a Date interpolated into a
      // raw `sql` fragment is serialised by the driver in local time — and
      // because the column is `timestamp` without time zone, Postgres silently
      // drops the offset. The two would then be compared across a timezone
      // shift, which quietly lets stale deliveries through.
      setWhere: sql`${schema.organizationSubscriptions.lastEventAt} is null or ${schema.organizationSubscriptions.lastEventAt} <= ${eventAt.toISOString()}`,
    })
    .returning({ id: schema.organizationSubscriptions.id });

  if (applied.length === 0) {
    await finish(webhookId, "stale", "older than applied state", organizationId);
    return { status: "stale" };
  }

  await finish(webhookId, "processed", undefined, organizationId);
  return { status: "processed" };
}

export type { PlanId };
