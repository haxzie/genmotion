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
 *
 * And one our own failure modes force: the claim and the state change happen
 * in ONE transaction. A delivery that was claimed and then failed to apply
 * must be re-processable by the retry, otherwise the retry is "deduped" and the
 * org that just paid never becomes entitled.
 */

/** The transaction handle every step below runs on. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * How many people the subscription covers, or `undefined` when the payload
 * does not say.
 *
 * Pro carries one seat and every teammate past that is a quantity on the seat
 * add-on, so the total is base + add-on. Read from the payload rather than
 * from our plan table: the provider is the authority on what was actually
 * bought, including a change made in their dashboard that we never initiated.
 *
 * A payload with no `addons` array at all is not "zero add-ons" — a snapshot
 * that omits the lines must leave the stored count alone, or a routine
 * `subscription.updated` would silently shrink a ten-seat team to one.
 */
function seatsFromPayload(
  data: { addons?: { addon_id?: string; quantity?: number }[] | null },
  plan: PlanId,
): number | undefined {
  if (!Array.isArray(data.addons)) return undefined;
  const included = PLANS[plan].includedSeats;
  const extra = data.addons.reduce(
    (total, addon) => total + (addon.quantity ?? 0),
    0,
  );
  return included + extra;
}

/** The subset of the envelope we rely on. */
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
  "subscription.paused": "paused",
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
    const seats = seatsFromPayload(data, plan);

    return {
      patch: {
        ...common,
        plan,
        status,
        ...(seats !== undefined ? { seats } : {}),
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

/**
 * Resolve the org: checkout metadata first, then the subscription we stored.
 *
 * The metadata org is checked for existence rather than trusted: an org deleted
 * after it paid would otherwise fail the foreign key on insert, and a delivery
 * that can never succeed must be acknowledged, not retried.
 */
async function resolveOrganizationId(
  tx: Tx,
  event: WebhookEnvelope,
): Promise<string | null> {
  const fromMetadata = event.data?.metadata?.organizationId;
  if (typeof fromMetadata === "string" && fromMetadata) {
    const [org] = await tx
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.id, fromMetadata));
    if (org) return org.id;
  }

  const subscriptionId = event.data?.subscription_id;
  if (!subscriptionId) return null;

  const [row] = await tx
    .select({ organizationId: schema.organizationSubscriptions.organizationId })
    .from(schema.organizationSubscriptions)
    .where(eq(schema.organizationSubscriptions.dodoSubscriptionId, subscriptionId));
  return row?.organizationId ?? null;
}

async function finish(
  tx: Tx,
  webhookId: string,
  status: "processed" | "ignored" | "stale",
  detail?: string,
  organizationId?: string | null,
): Promise<void> {
  await tx
    .update(schema.billingWebhookEvents)
    .set({ status, detail: detail ?? null, organizationId: organizationId ?? null })
    .where(eq(schema.billingWebhookEvents.id, webhookId));
}

/**
 * Record a delivery that blew up mid-way, so the retry can re-claim it.
 *
 * Runs outside the (rolled-back) transaction and swallows its own errors: if
 * the database is the thing that is down, there is nothing left to record
 * with, and the route's 500 already buys us the retry.
 */
async function recordFailure(
  webhookId: string,
  event: WebhookEnvelope,
  eventAt: Date,
  err: unknown,
): Promise<void> {
  const detail = (err instanceof Error ? err.message : String(err)).slice(0, 500);
  await db
    .insert(schema.billingWebhookEvents)
    .values({
      id: webhookId,
      type: event.type,
      dodoSubscriptionId: event.data?.subscription_id ?? null,
      eventAt,
      payload: event as unknown as Record<string, unknown>,
      status: "failed",
      detail,
    })
    .onConflictDoUpdate({
      target: schema.billingWebhookEvents.id,
      set: { status: "failed", detail },
    })
    .catch((recordErr) => {
      console.error("[billing] could not record failed webhook:", recordErr);
    });
}

/**
 * Process one verified delivery. Callers must have already checked the
 * signature — this function trusts its input.
 *
 * Throws when the state change could not be applied; the route turns that into
 * a 500 and the provider redelivers, at which point the `failed` row lets the
 * same webhook id through the claim again.
 */
export async function handleWebhookEvent(
  webhookId: string,
  event: WebhookEnvelope,
): Promise<WebhookOutcome> {
  const eventAt = toDate(event.timestamp) ?? new Date();

  try {
    return await db.transaction(async (tx) => {
      // Atomic claim. The webhook id is the primary key, so two concurrent
      // deliveries of the same event cannot both get past this insert: the
      // second blocks on the first's row lock, then finds the conflict. The
      // one row that may be claimed twice is a `failed` one — that is a retry
      // of a delivery whose first attempt rolled back, and it must re-run.
      const claimed = await tx
        .insert(schema.billingWebhookEvents)
        .values({
          id: webhookId,
          type: event.type,
          dodoSubscriptionId: event.data?.subscription_id ?? null,
          eventAt,
          payload: event as unknown as Record<string, unknown>,
          status: "processed",
        })
        .onConflictDoUpdate({
          target: schema.billingWebhookEvents.id,
          set: { status: "processed", detail: null, receivedAt: new Date() },
          setWhere: sql`${schema.billingWebhookEvents.status} = 'failed'`,
        })
        .returning({ id: schema.billingWebhookEvents.id });

      if (claimed.length === 0) return { status: "deduped" } as const;

      const organizationId = await resolveOrganizationId(tx, event);
      if (!organizationId) {
        // Never retryable: an unattributable event will not become attributable.
        await finish(tx, webhookId, "ignored", "no organization");
        return { status: "ignored", detail: "no organization" } as const;
      }

      // An org has one subscription. Once it is on a newer one — it lapsed and
      // bought again — the old subscription's trailing events (its eventual
      // `expired`, say) still carry this org in their checkout metadata and a
      // newer timestamp, and would downgrade the org that just paid. Only a
      // fresh `subscription.active` may move the org to a different
      // subscription; everything else about another subscription is history.
      const incomingSubscription = event.data?.subscription_id;
      if (incomingSubscription && event.type !== "subscription.active") {
        const [current] = await tx
          .select({ dodoSubscriptionId: schema.organizationSubscriptions.dodoSubscriptionId })
          .from(schema.organizationSubscriptions)
          .where(eq(schema.organizationSubscriptions.organizationId, organizationId));
        if (
          current?.dodoSubscriptionId &&
          current.dodoSubscriptionId !== incomingSubscription
        ) {
          const detail = `superseded subscription ${incomingSubscription}`;
          await finish(tx, webhookId, "ignored", detail, organizationId);
          return { status: "ignored", detail } as const;
        }
      }

      const transition = transitionFor(event);
      if ("ignore" in transition) {
        await finish(tx, webhookId, "ignored", transition.ignore, organizationId);
        return { status: "ignored", detail: transition.ignore } as const;
      }

      const values = {
        organizationId,
        ...transition.patch,
        lastEventAt: eventAt,
        lastWebhookId: webhookId,
      };

      const applied = await tx
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
        await finish(tx, webhookId, "stale", "older than applied state", organizationId);
        return { status: "stale" } as const;
      }

      await finish(tx, webhookId, "processed", undefined, organizationId);
      return { status: "processed" } as const;
    });
  } catch (err) {
    await recordFailure(webhookId, event, eventAt, err);
    throw err;
  }
}

export type { PlanId };
