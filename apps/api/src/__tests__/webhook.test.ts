import { beforeEach, describe, expect, it } from "vitest";
import { eq, db, schema } from "@genmotion/db";
import { FREE_LIMITS } from "@genmotion/shared";
import { getEntitlements } from "../entitlements";
import { checkLimit } from "../limits";
import { dbReady, truncateAll } from "./helpers/db";
import { createOrg, createProject } from "./helpers/factories";
import { postWebhook, signWebhook, subscriptionEvent } from "./helpers/dodo";

const PRO = "pdt_test_pro";
const TEAM = "pdt_test_team";

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
      { tamper: (b) => b.replace(PRO, TEAM) },
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

  it("activates Team with ten seats", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: TEAM,
        }),
      ),
    );
    const row = await subscriptionRow(orgId);
    expect(row).toMatchObject({ plan: "team", seats: 10 });
    expect((await getEntitlements(orgId)).canInvite).toBe(true);
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
          productId: TEAM,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    const row = await subscriptionRow(orgId);
    expect(row).toMatchObject({ plan: "team", seats: 10, dodoProductId: TEAM });
  });

  // Cancellation is not immediate: the org keeps what it paid for.
  it("keeps entitlement through a cancellation grace period", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: TEAM }),
      ),
    );
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.cancelled", {
          organizationId: orgId,
          productId: TEAM,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    const row = await subscriptionRow(orgId);
    expect(row!.status).toBe("cancelled");
    expect(row!.cancelAtPeriodEnd).toBe(true);
    // Period end is still in the future, so the plan is still in force.
    expect((await getEntitlements(orgId)).plan).toBe("team");
  });

  it("drops to Free on expiry and re-applies quotas", async () => {
    const { orgId, ownerId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: PRO }),
      ),
    );

    // Well past the free cap — allowed only while the plan is unlimited.
    for (let i = 0; i < FREE_LIMITS.projects + 2; i++) {
      await createProject(orgId, {
        userId: ownerId,
        createdAt: new Date("2027-01-01T00:00:00Z"),
      });
    }
    expect(await checkLimit(orgId, "projects")).toBeNull();

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
    expect(await checkLimit(orgId, "projects")).not.toBeNull();
  });

  it("keeps entitlement while a payment is being retried", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", { organizationId: orgId, productId: TEAM }),
      ),
    );
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.on_hold", {
          organizationId: orgId,
          productId: TEAM,
          timestamp: new Date(Date.now() + 1000),
        }),
      ),
    );

    expect((await subscriptionRow(orgId))!.status).toBe("on_hold");
    expect((await getEntitlements(orgId)).plan).toBe("team");
  });

  it("takes the status from the payload on a generic update", async () => {
    const { orgId } = await createOrg();
    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.updated", {
          organizationId: orgId,
          productId: TEAM,
          status: "on_hold",
        }),
      ),
    );
    expect((await subscriptionRow(orgId))!.status).toBe("on_hold");
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
    const { orgId, ownerId } = await createOrg();

    for (let i = 0; i < FREE_LIMITS.projects; i++) {
      await createProject(orgId, {
        userId: ownerId,
        createdAt: new Date("2027-01-01T00:00:00Z"),
      });
    }
    expect(await checkLimit(orgId, "projects")).not.toBeNull();

    await postWebhook(
      signWebhook(
        subscriptionEvent("subscription.active", {
          organizationId: orgId,
          productId: PRO,
        }),
      ),
    );

    expect(await checkLimit(orgId, "projects")).toBeNull();
  });
});
