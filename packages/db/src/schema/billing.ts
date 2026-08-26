import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

/**
 * What an organization has paid for. One row per org; the absence of a row
 * means Free, so existing orgs need no backfill.
 *
 * Only `plan` and `status` drive entitlement — seats, quotas and features are
 * looked up from the plan definition at read time, never stored here. `seats`
 * is kept purely as a record of what the provider said.
 */
export const organizationSubscriptions = pgTable(
  "organization_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    // Mirrors PlanId in @genmotion/shared. Enumerated so a malformed webhook
    // can't invent a plan; unmapped products are ignored rather than stored.
    plan: text("plan", { enum: ["free", "pro"] })
      .notNull()
      .default("free"),
    // The provider's lifecycle status, stored verbatim. Entitlement resolution
    // fails closed on anything it doesn't recognise, so a status the provider
    // adds later downgrades the org rather than silently granting access.
    status: text("status").notNull().default("none"),
    seats: integer("seats").notNull().default(1),

    dodoCustomerId: text("dodo_customer_id"),
    dodoSubscriptionId: text("dodo_subscription_id"),
    dodoProductId: text("dodo_product_id"),

    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),

    /**
     * Envelope timestamp of the webhook that last wrote this row. Deliveries
     * retry with backoff and can arrive out of order, so every write is a
     * compare-and-set against this column and an older event is dropped.
     */
    lastEventAt: timestamp("last_event_at"),
    lastWebhookId: text("last_webhook_id"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("org_subscriptions_org_idx").on(t.organizationId),
    // Renewals and dashboard-initiated changes carry no metadata, so the
    // subscription id is the only way back to the org.
    index("org_subscriptions_dodo_sub_idx").on(t.dodoSubscriptionId),
  ],
);

/**
 * Every webhook delivery we've seen. `id` is the provider's `webhook-id`
 * header used as the primary key — inserting it with ON CONFLICT DO NOTHING is
 * an atomic claim, which is what makes processing exactly-once even when two
 * redeliveries land at the same moment.
 */
export const billingWebhookEvents = pgTable(
  "billing_webhook_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    organizationId: text("organization_id"),
    dodoSubscriptionId: text("dodo_subscription_id"),
    /** Envelope timestamp — the ordering key. */
    eventAt: timestamp("event_at"),
    payload: jsonb("payload").notNull(),
    status: text("status", {
      enum: ["processed", "ignored", "stale", "failed"],
    }).notNull(),
    /** Why it was ignored or failed — kept for support triage. */
    detail: text("detail"),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
  },
  (t) => [index("billing_webhook_events_received_idx").on(t.receivedAt)],
);

/**
 * Checkout attempts. Not load-bearing for entitlement — the session metadata
 * is what links a subscription back to an org — but it makes "who tried to buy
 * what" answerable when a payment goes missing.
 */
export const billingCheckoutSessions = pgTable(
  "billing_checkout_sessions",
  {
    /** The provider's session id. */
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    plan: text("plan", { enum: ["pro", "team"] }).notNull(),
    productId: text("product_id").notNull(),
    checkoutUrl: text("checkout_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("billing_checkout_sessions_org_idx").on(t.organizationId)],
);
