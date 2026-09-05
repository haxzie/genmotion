import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { eq, db, schema } from "@genmotion/db";
import { getEntitlements } from "../entitlements";
import { dbReady, truncateAll } from "./helpers/db";
import { createOrg } from "./helpers/factories";
import { postWebhook, signWebhook } from "./helpers/dodo";

/**
 * Replays deliveries recorded from a real Dodo test-mode purchase (checkout,
 * seat add-on bought and removed, cancellation scheduled, revoked, then
 * immediate) — see fixtures/dodo. The other webhook tests use a hand-built
 * envelope; these pin the handler to the shapes the provider actually sends,
 * so a field we assumed (`addons` always present, `cancel_at_next_billing_date`
 * on `cancelled`) is checked against the record rather than the guess.
 */

const FIXTURES = join(import.meta.dirname, "fixtures/dodo");

type Envelope = {
  type: string;
  timestamp: string;
  data: Record<string, unknown> & {
    metadata?: Record<string, unknown>;
    addons?: { addon_id: string; quantity: number }[] | null;
  };
};

/** A recorded delivery, re-pointed at this org and this environment's catalog. */
function fixture(
  name: string,
  organizationId: string,
  at: Date,
  overrides: Partial<Envelope["data"]> = {},
): Envelope {
  const event = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8")) as Envelope;
  event.timestamp = at.toISOString();
  event.data.metadata = { ...(event.data.metadata ?? {}), organizationId };
  event.data.product_id = process.env.DODOPAYMENT_PRO_PRODUCT_ID;
  if (Array.isArray(event.data.addons)) {
    event.data.addons = event.data.addons.map((a) => ({
      ...a,
      addon_id: process.env.DODOPAYMENT_SEAT_ADDON_ID!,
    }));
  }
  Object.assign(event.data, overrides);
  return event;
}

async function row(organizationId: string) {
  const [r] = await db
    .select()
    .from(schema.organizationSubscriptions)
    .where(eq(schema.organizationSubscriptions.organizationId, organizationId));
  return r!;
}

beforeEach(truncateAll);

describe("recorded fixtures", () => {
  it("cover every event type the handler acts on", () => {
    const names = readdirSync(FIXTURES).map((f) => f.replace(/\.json$/, ""));
    for (const type of [
      "subscription.active",
      "subscription.renewed",
      "subscription.updated",
      "subscription.plan_changed.addons",
      "subscription.cancelled",
      "payment.succeeded",
    ]) {
      expect(names, type).toContain(type);
    }
  });

  it("carry no personal data", () => {
    for (const f of readdirSync(FIXTURES)) {
      const text = readFileSync(join(FIXTURES, f), "utf8");
      expect(text, f).not.toMatch(/@genmotion\.dev|Market St|94105/);
    }
  });
});

describe.skipIf(!dbReady)("replaying a real purchase", () => {
  /**
   * What Dodo actually sends on checkout: `active`, `renewed` and `updated`
   * within the same second, all carrying `addons: []`.
   */
  it("activates from the checkout burst", async () => {
    const { orgId } = await createOrg();
    const t = new Date();
    for (const name of ["subscription.active", "subscription.renewed", "subscription.updated"]) {
      const { status, body } = await postWebhook(signWebhook(fixture(name, orgId, t)));
      expect(status, name).toBe(200);
      expect(body.status, name).toBe("processed");
    }
    const r = await row(orgId);
    expect(r).toMatchObject({ plan: "pro", status: "active", seats: 1, cancelAtPeriodEnd: false });
    expect(r.dodoSubscriptionId).toMatch(/^sub_/);
    expect(r.dodoCustomerId).toMatch(/^cus_/);
    expect(r.currentPeriodEnd).not.toBeNull();
    expect((await getEntitlements(orgId)).paid).toBe(true);
  });

  it("records the payment without touching entitlement", async () => {
    const { orgId } = await createOrg();
    const { status, body } = await postWebhook(
      signWebhook(fixture("payment.succeeded", orgId, new Date())),
    );
    expect(status).toBe(200);
    expect(body.status).toBe("ignored");
  });

  // A seat bought by inviting: `plan_changed` + `updated` with one add-on line.
  it("grows and shrinks seats from the add-on lines", async () => {
    const { orgId } = await createOrg();
    const t0 = new Date(Date.now() - 10_000);
    await postWebhook(signWebhook(fixture("subscription.active", orgId, t0)));

    await postWebhook(
      signWebhook(fixture("subscription.plan_changed.addons", orgId, new Date(t0.getTime() + 1000))),
    );
    await postWebhook(
      signWebhook(fixture("subscription.updated.addons", orgId, new Date(t0.getTime() + 1100))),
    );
    expect((await row(orgId)).seats).toBe(2);

    await postWebhook(
      signWebhook(fixture("subscription.plan_changed.removed", orgId, new Date(t0.getTime() + 2000))),
    );
    expect((await row(orgId)).seats).toBe(1);
  });

  /**
   * Cancelling at the period end is not a `cancelled` event: it is an
   * `updated` snapshot with `cancel_at_next_billing_date: true` and the status
   * still `active`. Revoking is the same snapshot with the flag off.
   */
  it("marks a scheduled cancellation as ending, and revokes it", async () => {
    const { orgId } = await createOrg();
    const t0 = new Date(Date.now() - 10_000);
    await postWebhook(signWebhook(fixture("subscription.active", orgId, t0)));
    await postWebhook(
      signWebhook(
        fixture("subscription.updated.cancel-scheduled", orgId, new Date(t0.getTime() + 1000)),
      ),
    );
    let r = await row(orgId);
    expect(r).toMatchObject({ status: "active", cancelAtPeriodEnd: true });
    expect((await getEntitlements(orgId)).paid).toBe(true);

    await postWebhook(
      signWebhook(fixture("subscription.updated", orgId, new Date(t0.getTime() + 2000))),
    );
    r = await row(orgId);
    expect(r).toMatchObject({ status: "active", cancelAtPeriodEnd: false });
  });

  /**
   * "Cancel now" sends `cancelled` then an `updated` snapshot whose
   * `cancel_at_next_billing_date` is false and whose `next_billing_date` is the
   * end of the period already paid for. The org keeps what it paid for until
   * then, and drops to Free after.
   */
  it("keeps a cancelled org entitled until the paid period ends", async () => {
    const { orgId } = await createOrg();
    const t0 = new Date(Date.now() - 10_000);
    const periodEnd = new Date(Date.now() + 20 * 86_400_000).toISOString();
    await postWebhook(
      signWebhook(fixture("subscription.active", orgId, t0, { next_billing_date: periodEnd })),
    );
    await postWebhook(
      signWebhook(
        fixture("subscription.cancelled", orgId, new Date(t0.getTime() + 1000), {
          next_billing_date: periodEnd,
        }),
      ),
    );
    await postWebhook(
      signWebhook(
        fixture("subscription.updated.cancelled", orgId, new Date(t0.getTime() + 1100), {
          next_billing_date: periodEnd,
        }),
      ),
    );
    const r = await row(orgId);
    expect(r.status).toBe("cancelled");
    expect(r.currentPeriodEnd?.toISOString()).toBe(periodEnd);
    expect((await getEntitlements(orgId)).paid).toBe(true);

    // The same delivery, once the period has passed.
    const past = new Date(Date.now() - 1000).toISOString();
    await postWebhook(
      signWebhook(
        fixture("subscription.updated.cancelled", orgId, new Date(t0.getTime() + 1200), {
          next_billing_date: past,
        }),
      ),
    );
    expect((await getEntitlements(orgId)).paid).toBe(false);
  });
});
