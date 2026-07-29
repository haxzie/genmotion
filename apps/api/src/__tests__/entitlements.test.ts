import { beforeEach, describe, expect, it } from "vitest";
import { FREE_LIMITS, PLANS } from "@genmotion/shared";
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
    expect(ent.limits.projects).toBe(FREE_LIMITS.projects);
    expect(ent.manageable).toBe(false);
  });

  it("grants Pro on an active subscription", () => {
    const ent = entitlementsFromRow("org-1", row({ plan: "pro", status: "active" }), NOW);
    expect(ent.plan).toBe("pro");
    expect(ent.paid).toBe(true);
    expect(ent.limits.projects).toBeNull();
    expect(ent.limits.exports).toBeNull();
    expect(ent.limits.aiTurns).toBeNull();
    // Pro is single-seat and cannot invite — the distinguishing rule.
    expect(ent.seats).toBe(1);
    expect(ent.canInvite).toBe(false);
  });

  it("grants Team with ten seats and invites", () => {
    const ent = entitlementsFromRow("org-1", row({ plan: "team", status: "active" }), NOW);
    expect(ent.plan).toBe("team");
    expect(ent.seats).toBe(PLANS.team.seats);
    expect(ent.canInvite).toBe(true);
    expect(ent.prioritySupport).toBe(true);
  });

  it("keeps a cancelled plan until the period ends", () => {
    const ent = entitlementsFromRow(
      "org-1",
      row({ plan: "team", status: "cancelled", currentPeriodEnd: FUTURE, cancelAtPeriodEnd: true }),
      NOW,
    );
    expect(ent.plan).toBe("team");
    expect(ent.cancelAtPeriodEnd).toBe(true);
  });

  it("drops a cancelled plan once the period has passed", () => {
    const ent = entitlementsFromRow(
      "org-1",
      row({ plan: "team", status: "cancelled", currentPeriodEnd: PAST }),
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

  it("drops terminal and pre-activation statuses immediately", () => {
    for (const status of ["expired", "failed", "pending", "none"]) {
      const ent = entitlementsFromRow(
        "o",
        row({ plan: "team", status, currentPeriodEnd: FUTURE }),
        NOW,
      );
      expect(ent.plan, `status ${status}`).toBe("free");
    }
  });

  // Fail-closed: a status the provider introduces later must not entitle.
  it("falls back to Free on an unrecognised status", () => {
    const ent = entitlementsFromRow(
      "o",
      row({ plan: "team", status: "quantum_superposition", currentPeriodEnd: FUTURE }),
      NOW,
    );
    expect(ent.plan).toBe("free");
  });

  it("ignores a stored plan with no active status", () => {
    expect(entitlementsFromRow("o", row({ plan: "team", status: "none" }), NOW).plan).toBe("free");
  });

  it("reports manageable once a customer exists", () => {
    expect(
      entitlementsFromRow("o", row({ plan: "pro", status: "active", dodoCustomerId: "cus_1" }), NOW)
        .manageable,
    ).toBe(true);
  });

  // Seats and limits are read from PLANS, never from the row, so a stale seat
  // count written by a webhook can't inflate what the org may do.
  it("ignores the row's stored seat count", () => {
    const ent = entitlementsFromRow("o", row({ plan: "pro", status: "active", seats: 99 }), NOW);
    expect(ent.seats).toBe(PLANS.pro.seats);
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

  it("refuses on Free", async () => {
    const { orgId } = await createOrg();
    const gate = await assertCanInvite(orgId);
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.code).toBe("PLAN_REQUIRES_TEAM");
      expect(gate.message).toContain("Team");
    }
  });

  it("refuses on Pro — a single seat has nobody to invite", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active" });
    const gate = await assertCanInvite(orgId);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("PLAN_REQUIRES_TEAM");
  });

  it("allows on Team with seats free", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });
    expect((await assertCanInvite(orgId)).ok).toBe(true);
  });

  it("refuses on Team once every seat is taken", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });
    await addMembers(orgId, PLANS.team.seats - 1); // owner + 9 = 10
    const gate = await assertCanInvite(orgId);
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.code).toBe("SEAT_LIMIT_REACHED");
      expect(gate.seats).toEqual({ used: 10, max: 10 });
    }
  });

  it("counts pending invitations toward the cap", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });
    await addMembers(orgId, 7); // owner + 7 = 8
    await createPendingInvitation(orgId, { inviterId: ownerId });
    await createPendingInvitation(orgId, { inviterId: ownerId });
    const gate = await assertCanInvite(orgId); // 8 + 2 = 10
    expect(gate.ok).toBe(false);
  });

  it("does not let expired invitations hold seats", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });
    await addMembers(orgId, 7);
    for (let i = 0; i < 2; i++) {
      await createPendingInvitation(orgId, {
        inviterId: ownerId,
        expiresAt: new Date(Date.now() - 1000),
      });
    }
    expect((await assertCanInvite(orgId)).ok).toBe(true);
  });

  it("refuses once a Team subscription has expired", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, {
      plan: "team",
      status: "expired",
      currentPeriodEnd: new Date(Date.now() - 1000),
    });
    const gate = await assertCanInvite(orgId);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("PLAN_REQUIRES_TEAM");
  });
});

describe.skipIf(!dbReady)("getEntitlements", () => {
  beforeEach(truncateAll);

  it("reads the stored subscription", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, {
      plan: "team",
      status: "active",
      dodoCustomerId: "cus_abc",
    });
    const ent = await getEntitlements(orgId);
    expect(ent.plan).toBe("team");
    expect(ent.manageable).toBe(true);
    expect(ent.organizationId).toBe(orgId);
  });
});
