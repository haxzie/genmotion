import { beforeEach, describe, expect, it } from "vitest";
import { db, schema } from "@genmotion/db";
import { FREE_EXPORTS_PER_MONTH, isPaywallBody } from "@genmotion/shared";
import { claimExportSlot, exportState } from "../limits";
import { dbReady, truncateAll } from "./helpers/db";
import { createOrg, setSubscription } from "./helpers/factories";

/**
 * The export meter, which is the whole of the Free tier's gate.
 *
 * Free does not expire, so none of this depends on a clock beyond the calendar
 * month. What it does depend on is the count being the organization's and not
 * the machine's, and on a claim being atomic — both of which are only really
 * testable against the database, which is why these are integration tests.
 */

const DAY = 86_400_000;

/** Spend one export, as the desktop app's claim endpoint does. */
function claim(orgId: string, userId: string) {
  return claimExportSlot(orgId, userId, { source: "desktop" });
}

/** Put `n` already-used exports on the org's current month. */
async function burn(orgId: string, userId: string, n: number) {
  for (let i = 0; i < n; i++) {
    const res = await claim(orgId, userId);
    expect(isPaywallBody(res)).toBe(false);
  }
}

describe.skipIf(!dbReady)("the Free export allowance", () => {
  beforeEach(truncateAll);

  it("lets a brand-new org export without paying anything", async () => {
    const { orgId, ownerId } = await createOrg();
    const res = await claim(orgId, ownerId);
    expect(isPaywallBody(res)).toBe(false);
  });

  it("allows exactly FREE_EXPORTS_PER_MONTH and refuses the next one", async () => {
    const { orgId, ownerId } = await createOrg();
    await burn(orgId, ownerId, FREE_EXPORTS_PER_MONTH);

    const blocked = await claim(orgId, ownerId);
    expect(isPaywallBody(blocked)).toBe(true);
    expect((blocked as { paywall: { reason: string } }).paywall.reason).toBe("exports");
  });

  it("counts each free export down as it goes", async () => {
    const { orgId, ownerId } = await createOrg();
    const first = await claim(orgId, ownerId);
    expect(isPaywallBody(first)).toBe(false);
    const claimed = first as Exclude<typeof first, { paywall: unknown }>;
    expect(claimed.usage.used).toBe(1);
    expect(claimed.usage.limit).toBe(FREE_EXPORTS_PER_MONTH);
    expect(claimed.usage.remaining).toBe(FREE_EXPORTS_PER_MONTH - 1);
  });

  it("tells the user when the allowance comes back, not just that it is gone", async () => {
    const { orgId, ownerId } = await createOrg();
    await burn(orgId, ownerId, FREE_EXPORTS_PER_MONTH);
    const blocked = await claim(orgId, ownerId);
    expect(isPaywallBody(blocked)).toBe(true);
    const { exports } = (blocked as { paywall: { exports?: { resetsAt: string } } }).paywall;
    // The first of next month, UTC — the same boundary the plugin meters use.
    expect(new Date(exports!.resetsAt).getUTCDate()).toBe(1);
  });

  it("does not let last month's exports count against this month", async () => {
    const { orgId, ownerId } = await createOrg();
    await burn(orgId, ownerId, FREE_EXPORTS_PER_MONTH);
    // Backdate every row past the start of the month. The gate counts rows
    // since the period start, so this is the same as waiting for the reset.
    await db
      .update(schema.exportEvents)
      .set({ createdAt: new Date(Date.now() - 45 * DAY) });

    const res = await claim(orgId, ownerId);
    expect(isPaywallBody(res)).toBe(false);
    expect((res as { usage: { used: number } }).usage.used).toBe(1);
  });

  it("counts per organization, so a second member shares the same five", async () => {
    const { orgId, ownerId } = await createOrg();
    const other = await createOrg();
    await burn(orgId, ownerId, FREE_EXPORTS_PER_MONTH);

    // The other org is untouched by the first one's spending.
    expect(isPaywallBody(await claim(other.orgId, other.ownerId))).toBe(false);
    // And the exhausted one stays exhausted, whoever asks.
    expect(isPaywallBody(await claim(orgId, ownerId))).toBe(true);
  });

  it("does not give the allowance away to simultaneous claims", async () => {
    const { orgId, ownerId } = await createOrg();
    await burn(orgId, ownerId, FREE_EXPORTS_PER_MONTH - 1);

    // Two exports started at the same instant with one slot left. Exactly one
    // may have it: the claim reads and writes inside a serializable
    // transaction, so the loser either gets the paywall or a serialization
    // failure, and never a sixth export.
    const results = await Promise.allSettled([
      claim(orgId, ownerId),
      claim(orgId, ownerId),
    ]);
    const allowed = results.filter(
      (r) => r.status === "fulfilled" && !isPaywallBody(r.value),
    );
    expect(allowed).toHaveLength(1);

    const usage = await exportState(orgId);
    expect(usage.used).toBe(FREE_EXPORTS_PER_MONTH);
    expect(usage.remaining).toBe(0);
  });
});

describe.skipIf(!dbReady)("paid plans", () => {
  beforeEach(truncateAll);

  it("never refuses a paying org, however much it exports", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active" });
    await burn(orgId, ownerId, FREE_EXPORTS_PER_MONTH * 3);
    expect(isPaywallBody(await claim(orgId, ownerId))).toBe(false);
  });

  it("still counts paid exports, so the meter can be read without enforcing one", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active" });
    await burn(orgId, ownerId, 3);

    const usage = await exportState(orgId);
    expect(usage.used).toBe(3);
    expect(usage.limit).toBeNull();
    expect(usage.remaining).toBeNull();
  });

  it("falls back to the free allowance once a subscription expires", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active" });
    await burn(orgId, ownerId, FREE_EXPORTS_PER_MONTH);

    await setSubscription(orgId, { plan: "pro", status: "expired" });
    const blocked = await claim(orgId, ownerId);
    expect(isPaywallBody(blocked)).toBe(true);
  });

  it("keeps a cancelled org exporting until its paid period runs out", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      plan: "pro",
      status: "cancelled",
      currentPeriodEnd: new Date(Date.now() + 5 * DAY),
    });
    await burn(orgId, ownerId, FREE_EXPORTS_PER_MONTH + 2);
    expect(isPaywallBody(await claim(orgId, ownerId))).toBe(false);
  });
});

describe.skipIf(!dbReady)("exportState", () => {
  beforeEach(truncateAll);

  it("reports a full allowance for an org that has exported nothing", async () => {
    const { orgId } = await createOrg();
    const usage = await exportState(orgId);
    expect(usage.used).toBe(0);
    expect(usage.remaining).toBe(FREE_EXPORTS_PER_MONTH);
  });

  it("never reports a negative remaining", async () => {
    // Belt and braces: an org can exceed the allowance by being downgraded
    // after spending it, and a meter that reads "-3 left" is a bug report.
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active" });
    await burn(orgId, ownerId, FREE_EXPORTS_PER_MONTH + 4);
    await setSubscription(orgId, { plan: "pro", status: "expired" });

    const usage = await exportState(orgId);
    expect(usage.used).toBe(FREE_EXPORTS_PER_MONTH + 4);
    expect(usage.remaining).toBe(0);
  });
});
