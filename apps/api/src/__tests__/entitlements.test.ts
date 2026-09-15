import { beforeEach, describe, expect, it } from "vitest";
import { PLANS } from "@genmotion/shared";
import { schema } from "@genmotion/db";
import {
  assertCanInvite,
  countSeats,
  entitlementsFromRow,
  getEntitlements,
} from "../entitlements";
import { dbReady, truncateAll } from "./helpers/db";
import {
  addMembers,
  createOrg,
  createPendingInvitation,
  setSubscription,
} from "./helpers/factories";

type Row = typeof schema.organizationSubscriptions.$inferSelect;

const NOW = new Date("2026-09-15T00:00:00.000Z");
const FUTURE = new Date("2026-10-01T00:00:00.000Z");
const PAST = new Date("2026-09-01T00:00:00.000Z");

/** Minimal row builder — only the fields the resolver reads. */
function row(overrides: Partial<Row>): Row {
  return {
    id: "sub-1",
    organizationId: "org-1",
    plan: "free",
    status: "none",
    seats: 1,
    dodoCustomerId: null,
    dodoSubscriptionId: null,
    dodoProductId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    lastEventAt: null,
    lastWebhookId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Row;
}

describe("entitlementsFromRow", () => {
  it("treats a missing subscription as Free", () => {
    const ent = entitlementsFromRow("org-1", null, NOW);
    expect(ent.plan).toBe("free");
    expect(ent.paid).toBe(false);
    expect(ent.canInvite).toBe(false);
    expect(ent.seats).toBe(1);
    expect(ent.manageable).toBe(false);
  });

  it("grants Pro on an active subscription — one seat, no invites", () => {
    const ent = entitlementsFromRow("org-1", row({ plan: "pro", status: "active" }), NOW);
    expect(ent.plan).toBe("pro");
    expect(ent.paid).toBe(true);
    expect(ent.seats).toBe(1);
    expect(ent.canInvite).toBe(false);
  });

  it("grants Max five seats and invites", () => {
    const ent = entitlementsFromRow("org-1", row({ plan: "max", status: "active" }), NOW);
    expect(ent.plan).toBe("max");
    expect(ent.seats).toBe(PLANS.max.includedSeats);
    expect(ent.canInvite).toBe(true);
  });

  it("reports the plan's seats, not a count left over from add-ons", () => {
    const ent = entitlementsFromRow("org-1", row({ plan: "pro", status: "active", seats: 6 }), NOW);
    expect(ent.seats).toBe(1);
  });

  it("keeps a cancelled plan until the period ends", () => {
    const ent = entitlementsFromRow(
      "org-1",
      row({ plan: "pro", status: "cancelled", currentPeriodEnd: FUTURE, cancelAtPeriodEnd: true }),
      NOW,
    );
    expect(ent.plan).toBe("pro");
    expect(ent.cancelAtPeriodEnd).toBe(true);
  });

  it("drops a cancelled plan once the period has passed", () => {
    const ent = entitlementsFromRow(
      "org-1",
      row({ plan: "pro", status: "cancelled", currentPeriodEnd: PAST }),
      NOW,
    );
    expect(ent.plan).toBe("free");
  });

  it("keeps an on-hold plan during dunning, then drops it", () => {
    expect(
      entitlementsFromRow("o", row({ plan: "pro", status: "on_hold", currentPeriodEnd: FUTURE }), NOW).plan,
    ).toBe("pro");
    expect(
      entitlementsFromRow("o", row({ plan: "pro", status: "on_hold", currentPeriodEnd: PAST }), NOW).plan,
    ).toBe("free");
  });

  it("keeps a paused plan until the paid period ends", () => {
    expect(
      entitlementsFromRow("o", row({ plan: "pro", status: "paused", currentPeriodEnd: FUTURE }), NOW).plan,
    ).toBe("pro");
    expect(
      entitlementsFromRow("o", row({ plan: "pro", status: "paused", currentPeriodEnd: PAST }), NOW).plan,
    ).toBe("free");
  });

  it("drops terminal and pre-activation statuses immediately", () => {
    for (const status of ["expired", "failed", "pending", "none"]) {
      const ent = entitlementsFromRow(
        "o",
        row({ plan: "pro", status, currentPeriodEnd: FUTURE }),
        NOW,
      );
      expect(ent.plan, `status ${status}`).toBe("free");
    }
  });

  // Fail-closed: a status the provider introduces later must not entitle.
  it("falls back to Free on an unrecognised status", () => {
    const ent = entitlementsFromRow(
      "o",
      row({ plan: "pro", status: "quantum_superposition", currentPeriodEnd: FUTURE }),
      NOW,
    );
    expect(ent.plan).toBe("free");
  });

  it("ignores a stored plan with no active status", () => {
    expect(entitlementsFromRow("o", row({ plan: "pro", status: "none" }), NOW).plan).toBe("free");
  });

  it("reports manageable once a customer exists", () => {
    expect(
      entitlementsFromRow("o", row({ plan: "pro", status: "active", dodoCustomerId: "cus_1" }), NOW)
        .manageable,
    ).toBe(true);
  });

  // Seats now come from the row, because the add-on quantity is what was
  // actually bought — the plan table only supplies the base when there is no
  // subscription to read.
  it("falls back to the plan's included seats when the row has none", () => {
    const ent = entitlementsFromRow("o", null, NOW);
    expect(ent.seats).toBe(PLANS.free.includedSeats);
  });
});

describe.skipIf(!dbReady)("countSeats", () => {
  beforeEach(truncateAll);

  it("counts members plus unexpired pending invitations", async () => {
    const { orgId, ownerId } = await createOrg();
    await addMembers(orgId, 2);
    await createPendingInvitation(orgId, { inviterId: ownerId });
    expect(await countSeats(orgId)).toBe(4); // owner + 2 + 1 pending
  });

  it("ignores expired invitations", async () => {
    const { orgId, ownerId } = await createOrg();
    await createPendingInvitation(orgId, {
      inviterId: ownerId,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await countSeats(orgId)).toBe(1);
  });

  it("ignores already-accepted invitations", async () => {
    const { orgId, ownerId } = await createOrg();
    await createPendingInvitation(orgId, { inviterId: ownerId, status: "accepted" });
    expect(await countSeats(orgId)).toBe(1);
  });

  it("can exclude pending invitations", async () => {
    const { orgId, ownerId } = await createOrg();
    await createPendingInvitation(orgId, { inviterId: ownerId });
    expect(await countSeats(orgId, { includePendingInvitations: false })).toBe(1);
  });
});

describe.skipIf(!dbReady)("assertCanInvite", () => {
  beforeEach(truncateAll);

  it("refuses on Free, pointing at Max", async () => {
    const { orgId } = await createOrg();
    const gate = await assertCanInvite(orgId);
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.code).toBe("PLAN_REQUIRES_UPGRADE");
      expect(gate.upgrade).toBe("max");
      expect(gate.message).toContain("Max");
    }
  });

  it("refuses on Pro — it is one person — pointing at Max", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active" });
    const gate = await assertCanInvite(orgId);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("PLAN_REQUIRES_UPGRADE");
  });

  it("allows on Max while a seat is free", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active" });
    expect((await assertCanInvite(orgId)).ok).toBe(true);
  });

  it("refuses once every one of Max's five seats is taken", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active" });
    await addMembers(orgId, 4); // owner + 4 = 5
    const gate = await assertCanInvite(orgId);
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.code).toBe("SEAT_LIMIT_REACHED");
      expect(gate.seats).toEqual({ used: 5, max: 5 });
      expect(gate.upgrade).toBeUndefined();
      expect(gate.message).toMatch(/contact us/i);
    }
  });

  it("counts pending invitations toward the cap", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active" });
    await addMembers(orgId, 2); // owner + 2 = 3
    await createPendingInvitation(orgId, { inviterId: ownerId });
    await createPendingInvitation(orgId, { inviterId: ownerId });
    expect((await assertCanInvite(orgId)).ok).toBe(false); // 3 + 2 = 5
  });

  it("does not let expired invitations hold seats", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active" });
    await addMembers(orgId, 2);
    for (let i = 0; i < 2; i++) {
      await createPendingInvitation(orgId, {
        inviterId: ownerId,
        expiresAt: new Date(Date.now() - 1000),
      });
    }
    expect((await assertCanInvite(orgId)).ok).toBe(true);
  });

  it("reads the invitee's side as a full team, without counting their own invitation", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active" });
    await addMembers(orgId, 4); // 5 in
    await createPendingInvitation(orgId, { inviterId: ownerId });
    const gate = await assertCanInvite(orgId, { includePendingInvitations: false });
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.code).toBe("TEAM_FULL");
      expect(gate.message).toMatch(/already full/i);
    }
  });

  it("refuses once a subscription has expired", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, {
      plan: "max",
      status: "expired",
      currentPeriodEnd: new Date(Date.now() - 1000),
    });
    const gate = await assertCanInvite(orgId);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("PLAN_REQUIRES_UPGRADE");
  });
});

describe.skipIf(!dbReady)("getEntitlements", () => {
  beforeEach(truncateAll);

  it("reads the stored subscription", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, {
      plan: "pro",
      status: "active",
      dodoCustomerId: "cus_abc",
    });
    const ent = await getEntitlements(orgId);
    expect(ent.plan).toBe("pro");
    expect(ent.manageable).toBe(true);
    expect(ent.organizationId).toBe(orgId);
  });
});
