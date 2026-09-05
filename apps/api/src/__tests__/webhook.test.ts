import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq, db, schema } from "@genmotion/db";

/**
 * `planForProduct` is the one step of processing that can be made to throw on
 * demand, so it stands in for "the database fell over half-way" in the
 * failure-and-retry tests. Everything else on the `../dodo` seam is real.
 */
let failNext: Error | null = null;

vi.mock("../dodo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../dodo")>();
  return {
    ...actual,
    planForProduct: (productId: string | null | undefined) => {
      if (failNext) {
        const err = failNext;
        failNext = null;
        throw err;
      }
      return actual.planForProduct(productId);
    },
  };
});

const { getEntitlements } = await import("../entitlements");
const { checkPaywall } = await import("../limits");
const { dbReady, truncateAll } = await import("./helpers/db");
const { createOrg } = await import("./helpers/factories");
const { postWebhook, signWebhook, subscriptionEvent } = await import("./helpers/dodo");

const PRO = "pdt_test_pro";

/**
 * Backdate an org past its trial.
 *
 * Entitlement is only observable once the free week is over — before that
 * every org may work regardless of what the webhook wrote, which would make
 * these assertions pass for the wrong reason.
 */
async function pastTrial(orgId: string) {
  await db
    .update(schema.organization)
    .set({ createdAt: new Date(Date.now() - 60 * 86_400_000) })
    .where(eq(schema.organization.id, orgId));
}
const OTHER_PRODUCT = "pdt_not_ours";

async function subscriptionRow(organizationId: string) {
  const [row] = await db
    .select()
    .from(schema.organizationSubscriptions)
    .where(eq(schema.organizationSubscriptions.organizationId, organizationId));
  return row ?? null;
}

async function eventRows() {
  return db.select().from(schema.billingWebhookEvents);
}

beforeEach(truncateAll);

describe.skipIf(!dbReady)("webhook signature verification", () => {
  it("rejects a delivery with no signature headers", async () => {
    const { app } = await import("../app");
    const res = await app.request("/api/webhooks/dodo", {
      method: "POST",
      body: JSON.stringify(subscriptionEvent("subscription.active")),
    });
    expect(res.status).toBe(401);
    expect(await eventRows()).toEqual([]);
  });

  it("rejects a body tampered with after signing", async () => {
    const { orgId } = await createOrg();
    const delivery = signWebhook(
      subscriptionEvent("subscription.active", { organizationId: orgId }),
      { tamper: (b) => b.replace(PRO, OTHER_PRODUCT) },
    );
    const { status } = await postWebhook(delivery);
    expect(status).toBe(401);
    expect(await eventRows()).toEqual([]);
  });

  it("rejects a signature made with the wrong secret", async () => {
    const { orgId } = await createOrg();
    const delivery = signWebhook(
      subscriptionEvent("subscription.active", { organizationId: orgId }),
      { secret: "whsec_d3Jvbmdfc2VjcmV0X2hlcmU=" },
    );
    const { status } = await postWebhook(delivery);
    expect(status).toBe(401);
    expect(await eventRows()).toEqual([]);
  });

  // Standard Webhooks bounds the timestamp to stop replay of old captures.
  it("rejects a delivery outside the timestamp tolerance", async () => {
    const { orgId } = await createOrg();
    const delivery = signWebhook(
      subscriptionEvent("subscription.active", { organizationId: orgId }),
      { timestamp: new Date(Date.now() - 24 * 3600 * 1000) },
    );
    const { status } = await postWebhook(delivery);
    expect(status).toBe(401);
    expect(await eventRows()).toEqual([]);
  });
});

describe.skipIf(!dbReady)("subscription lifecycle", () => {
  it("activates a Pro subscription", async () => {
    const { orgId } = await createOrg();
    const periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const { status, body } = await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: PRO,
          nextBillingDate: periodEnd,
        }),
      ),
    );

    expect(status).toBe(200);
    expect(body.status).toBe("processed");

    const row = await subscriptionRow(orgId);
    expect(row).toMatchObject({
      plan: "pro",
      status: "active",
      seats: 1,
      dodoCustomerId: "cus_test_1",
      dodoSubscriptionId: "sub_test_1",
      dodoProductId: PRO,
      cancelAtPeriodEnd: false,
    });
    expect(row!.currentPeriodEnd?.toISOString()).toBe(periodEnd.toISOString());
    expect(row!.lastEventAt).not.toBeNull();
    expect(row!.lastWebhookId).not.toBeNull();

    expect((await getEntitlements(orgId)).plan).toBe("pro");
  });

  it("derives seats from the add-on quantity, not from the plan", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: PRO,
          extraSeats: 9,
        }),
      ),
    );
    const row = await subscriptionRow(orgId);
    // One included seat plus nine add-on seats.
    expect(row).toMatchObject({ plan: "pro", seats: 10 });
    expect((await getEntitlements(orgId)).canInvite).toBe(true);
  });

  it("activates a solo subscription with the one included seat", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
      ),
    );
    expect(await subscriptionRow(orgId)).toMatchObject({ plan: "pro", seats: 1 });
  });

  it("advances the period on renewal", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(subscriptionEvent("subscription.active", { organizationId: orgId })),
    );

    const later = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.renewed", {
          organizationId: orgId,
          nextBillingDate: later,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    const row = await subscriptionRow(orgId);
    expect(row!.status).toBe("active");
    expect(row!.currentPeriodEnd?.toISOString()).toBe(later.toISOString());
  });

  it("moves the org onto the new plan when it changes", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
      ),
    );
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.plan_changed", {
          organizationId: orgId,
          productId: PRO,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    const row = await subscriptionRow(orgId);
    expect(row).toMatchObject({ plan: "pro", dodoProductId: PRO });
  });

  // Cancellation is not immediate: the org keeps what it paid for.
  it("keeps entitlement through a cancellation grace period", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
      ),
    );
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.cancelled", {
          organizationId: orgId,
          productId: PRO,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    const row = await subscriptionRow(orgId);
    expect(row!.status).toBe("cancelled");
    expect(row!.cancelAtPeriodEnd).toBe(true);
    // Period end is still in the future, so the plan is still in force.
    expect((await getEntitlements(orgId)).plan).toBe("pro");
  });

  it("drops to Free on expiry and paywalls again", async () => {
    const { orgId } = await createOrg();
    await pastTrial(orgId);
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
      ),
    );
    // Paying, so the spent trial does not matter.
    expect(await checkPaywall(orgId)).toBeNull();

    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.expired", {
          organizationId: orgId,
          productId: PRO,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    expect((await subscriptionRow(orgId))!.plan).toBe("free");
    expect((await getEntitlements(orgId)).plan).toBe("free");
    expect(await checkPaywall(orgId)).not.toBeNull();
  });

  it("keeps entitlement while a payment is being retried", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
      ),
    );
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.on_hold", {
          organizationId: orgId,
          productId: PRO,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    expect((await subscriptionRow(orgId))!.status).toBe("on_hold");
    expect((await getEntitlements(orgId)).plan).toBe("pro");
  });

  it("takes the status from the payload on a generic update", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.updated", {
          organizationId: orgId,
          productId: PRO,
          status: "on_hold",
        }),
      ),
    );
    expect((await subscriptionRow(orgId))!.status).toBe("on_hold");
  });

  /**
   * A snapshot that does not carry the add-on lines says nothing about seats.
   * Treating "no array" as "no add-ons" would shrink every team to one seat on
   * the next routine update.
   */
  it("leaves the seat count alone when an update carries no add-on lines", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: PRO,
          extraSeats: 3,
        }),
      ),
    );
    expect((await subscriptionRow(orgId))!.seats).toBe(4);

    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.updated", {
          organizationId: orgId,
          productId: PRO,
          withAddons: false,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );
    expect((await subscriptionRow(orgId))!.seats).toBe(4);
  });

  it("does shrink the seats when the add-on lines say so", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: PRO,
          extraSeats: 3,
        }),
      ),
    );
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.plan_changed", {
          organizationId: orgId,
          productId: PRO,
          extraSeats: 0, // an empty array: the add-ons were removed
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );
    expect((await subscriptionRow(orgId))!.seats).toBe(1);
  });

  it("keeps entitlement through a pause until the paid period ends", async () => {
    const { orgId } = await createOrg();
    await pastTrial(orgId);
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
      ),
    );
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.paused", {
          organizationId: orgId,
          productId: PRO,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    expect((await subscriptionRow(orgId))!.status).toBe("paused");
    expect((await getEntitlements(orgId)).plan).toBe("pro");
    expect(await checkPaywall(orgId)).toBeNull();
  });
});

describe.skipIf(!dbReady)("delivery semantics", () => {
  it("processes a redelivery exactly once", async () => {
    const { orgId } = await createOrg();
    const delivery = signWebhook(
      subscriptionEvent("subscription.active", { organizationId: orgId }),
    );

    const first = await postWebhook(delivery);
    const before = await subscriptionRow(orgId);

    const second = await postWebhook(delivery);
    const after = await subscriptionRow(orgId);

    expect(first.body.status).toBe("processed");
    expect(second.status).toBe(200);
    expect(second.body.status).toBe("deduped");
    expect(await eventRows()).toHaveLength(1);
    expect(after!.updatedAt.toISOString()).toBe(before!.updatedAt.toISOString());
  });

  /**
   * Deliveries can arrive in any order. An older event must not resurrect a
   * plan that a newer one already ended.
   */
  it("ignores a delivery older than the state already applied", async () => {
    const { orgId } = await createOrg();
    const t1 = new Date(Date.now() - 60_000);
    const t2 = new Date();

    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.expired", {
          organizationId: orgId,
          timestamp: t2,
        }),
        { timestamp: t2 },
      ),
    );

    const late = await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          timestamp: t1,
        }),
        { timestamp: t2 },
      ),
    );

    expect(late.status).toBe(200);
    expect(late.body.status).toBe("stale");
    expect((await subscriptionRow(orgId))!.status).toBe("expired");
    expect((await getEntitlements(orgId)).plan).toBe("free");
  });

  it("acknowledges an event type it doesn't handle", async () => {
    const { orgId } = await createOrg();
    const { status, body } = await postWebhook(
      signWebhook({
        business_id: "biz",
        type: "widget.exploded",
        timestamp: new Date().toISOString(),
        data: { metadata: { organizationId: orgId } },
      }),
    );
    // Must be 2xx: a non-2xx would be retried for hours for an event we will
    // never act on.
    expect(status).toBe(200);
    expect(body.status).toBe("ignored");
    expect(await subscriptionRow(orgId)).toBeNull();
    expect((await eventRows())[0]!.status).toBe("ignored");
  });

  it("records a payment event without touching entitlement", async () => {
    const { orgId } = await createOrg();
    const { status } = await postWebhook(
      signWebhook({
        business_id: "biz",
        type: "payment.succeeded",
        timestamp: new Date().toISOString(),
        data: { payload_type: "Payment", metadata: { organizationId: orgId } },
      }),
    );
    expect(status).toBe(200);
    expect(await subscriptionRow(orgId)).toBeNull();
    expect(await eventRows()).toHaveLength(1);
  });

  it("ignores an event it cannot attribute to an organization", async () => {
    const { status, body } = await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          withMetadata: false,
          subscriptionId: "sub_unknown",
        }),
      ),
    );
    expect(status).toBe(200);
    expect(body.status).toBe("ignored");
    expect((await eventRows())[0]!.detail).toBe("no organization");
  });

  // Renewals carry no checkout metadata, so the subscription id is the link.
  it("attributes a later event by subscription id when metadata is absent", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          subscriptionId: "sub_link_1",
        }),
      ),
    );

    const later = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const { body } = await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.renewed", {
          withMetadata: false,
          subscriptionId: "sub_link_1",
          nextBillingDate: later,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    expect(body.status).toBe("processed");
    expect((await subscriptionRow(orgId))!.currentPeriodEnd?.toISOString()).toBe(
      later.toISOString(),
    );
  });

  /**
   * The failure that would otherwise be silent and permanent: a delivery is
   * claimed, processing blows up, the provider retries — and the retry must
   * NOT be waved through as a duplicate of the attempt that never applied.
   */
  it("lets a retry re-process a delivery that failed half-way", async () => {
    const { orgId } = await createOrg();
    const delivery = signWebhook(
      subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
    );

    failNext = new Error("connection reset");
    const first = await postWebhook(delivery);
    expect(first.status).toBe(500);
    expect(await subscriptionRow(orgId)).toBeNull();
    const [failed] = await eventRows();
    expect(failed).toMatchObject({ status: "failed", detail: "connection reset" });

    const retry = await postWebhook(delivery);
    expect(retry.status).toBe(200);
    expect(retry.body.status).toBe("processed");
    expect((await subscriptionRow(orgId))!.plan).toBe("pro");
    const rows = await eventRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("processed");
  });

  it("still dedupes a redelivery of a successfully processed event", async () => {
    const { orgId } = await createOrg();
    const delivery = signWebhook(
      subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
    );
    await postWebhook(delivery);
    expect((await postWebhook(delivery)).body.status).toBe("deduped");
  });

  // An org that no longer exists can never be entitled; retrying is pointless.
  it("acknowledges an event for an organization that has been deleted", async () => {
    const { orgId } = await createOrg();
    await db.delete(schema.organization).where(eq(schema.organization.id, orgId));

    const { status, body } = await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
      ),
    );
    expect(status).toBe(200);
    expect(body.status).toBe("ignored");
    expect((await eventRows())[0]!.detail).toBe("no organization");
  });

  /**
   * An org that lapsed and bought again has two subscriptions at the provider.
   * The old one keeps emitting — its eventual `expired` carries the org's
   * checkout metadata and a fresh timestamp — and must not touch the new one.
   */
  it("ignores trailing events from a subscription the org has moved on from", async () => {
    const { orgId } = await createOrg();
    await pastTrial(orgId);
    const t0 = new Date(Date.now() - 3000);
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: PRO,
          subscriptionId: "sub_old",
          timestamp: t0,
        }),
      ),
    );
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: PRO,
          subscriptionId: "sub_new",
          timestamp: new Date(t0.getTime() + 1000),
        }),
      ),
    );

    const { body } = await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.expired", {
          organizationId: orgId,
          productId: PRO,
          subscriptionId: "sub_old",
          timestamp: new Date(t0.getTime() + 2000),
        }),
      ),
    );

    expect(body.status).toBe("ignored");
    expect(String(body.detail)).toContain("superseded");
    const row = await subscriptionRow(orgId);
    expect(row).toMatchObject({ plan: "pro", status: "active", dodoSubscriptionId: "sub_new" });
    expect(await checkPaywall(orgId)).toBeNull();
  });

  it("ignores a product it can't map to a plan", async () => {
    const { orgId } = await createOrg();
    const { status, body } = await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: "pdt_someone_elses_product",
        }),
      ),
    );
    expect(status).toBe(200);
    expect(body.status).toBe("ignored");
    expect(String((await eventRows())[0]!.detail)).toContain("unmapped product");
    expect(await subscriptionRow(orgId)).toBeNull();
  });
});

describe.skipIf(!dbReady)("checkout to entitlement", () => {
  /**
   * The path a real purchase takes: the metadata written at checkout is what
   * the webhook reads back to decide who just paid.
   */
  it("upgrades the org that started the checkout", async () => {
    const { orgId } = await createOrg();
    await pastTrial(orgId);
    expect(await checkPaywall(orgId)).not.toBeNull();

    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: PRO,
        }),
      ),
    );

    expect(await checkPaywall(orgId)).toBeNull();
  });
});
