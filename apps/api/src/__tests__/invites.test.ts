import { beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, db, schema } from "@genmotion/db";
import { PLANS } from "@genmotion/shared";

/**
 * The provider is stubbed at its single boundary (`../dodo`), as in
 * checkout.test.ts: the seat purchase the invite hook makes must be observable
 * without a network, and must never reach a real account from the suite.
 */
const changeSeats = vi.fn();

vi.mock("../dodo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../dodo")>();
  return { ...actual, changeSeats };
});

const { app } = await import("../app");
const { dbReady, truncateAll } = await import("./helpers/db");
const {
  addMember,
  addMembers,
  createOrg,
  createPendingInvitation,
  createUser,
  setSubscription,
} = await import("./helpers/factories");
const { createSession } = await import("./helpers/http");

/**
 * These drive better-auth's real organization endpoints rather than calling the
 * gate directly, so they prove the hook is actually wired into the request path
 * — including the property that a refused invite writes nothing and sends
 * nothing.
 */

async function invite(
  cookie: string,
  organizationId: string,
  email = "invitee@example.test",
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await app.request("/api/auth/organization/invite-member", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ email, role: "member", organizationId }),
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body: body as Record<string, unknown> };
}

async function invitations(organizationId: string) {
  return db
    .select()
    .from(schema.invitation)
    .where(eq(schema.invitation.organizationId, organizationId));
}

async function subscriptionRow(organizationId: string) {
  const [row] = await db
    .select()
    .from(schema.organizationSubscriptions)
    .where(eq(schema.organizationSubscriptions.organizationId, organizationId));
  return row!;
}

beforeEach(async () => {
  await truncateAll();
  changeSeats.mockReset();
  changeSeats.mockResolvedValue(undefined);
});

describe.skipIf(!dbReady)("invite gating by plan", () => {
  it("refuses on Free and writes no invitation", async () => {
    const { orgId, ownerId } = await createOrg();
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    expect(String(body.message)).toContain("Pro");
    // The property that would break if better-auth stopped awaiting the hook
    // before writing the row.
    expect(await invitations(orgId)).toEqual([]);
  });

  /**
   * A Pro org with no subscription to resize — a row set by hand, or billing
   * switched off — cannot buy a seat, so a full plan still refuses.
   */
  it("refuses on Pro when the seats are used up and nothing can be resized", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", seats: 1 });
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    // The owner already occupies the only seat that was bought.
    expect(body.code).toBe("SEAT_LIMIT_REACHED");
    expect(changeSeats).not.toHaveBeenCalled();
    expect(await invitations(orgId)).toEqual([]);
  });

  it("allows on Pro with a seat free", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", seats: 10 });
    const session = await createSession(ownerId, orgId);

    const { status } = await invite(session.cookie, orgId);

    expect(status).toBe(200);
    const rows = await invitations(orgId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: "invitee@example.test",
      status: "pending",
    });
  });

  it("refuses once a Pro subscription has lapsed", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      plan: "pro",
      seats: 10,
      status: "expired",
      currentPeriodEnd: new Date(Date.now() - 1000),
    });
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(403);
    expect(await invitations(orgId)).toEqual([]);
  });

  it("still allows inviting during a cancellation grace period", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      plan: "pro",
      seats: 10,
      status: "cancelled",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(200);
  });
});

/**
 * Seats are bought by inviting. With a live subscription to resize, a full
 * plan does not refuse — it grows by one and the invite goes ahead.
 */
describe.skipIf(!dbReady)("buying a seat by inviting", () => {
  const LIVE = { plan: "pro", status: "active", dodoSubscriptionId: "sub_live" } as const;

  it("buys a seat when Pro is full", async () => {
    const { orgId, ownerId } = await createOrg();
    const before = await setSubscription(orgId, {
      ...LIVE,
      seats: 1,
      lastEventAt: new Date(Date.now() - 60_000),
    });
    const session = await createSession(ownerId, orgId);

    const { status } = await invite(session.cookie, orgId);

    expect(status).toBe(200);
    // Owner + the invitee = two people, so the subscription grows to two.
    expect(changeSeats).toHaveBeenCalledWith("sub_live", 2, "grow");
    expect(await invitations(orgId)).toHaveLength(1);

    const after = await subscriptionRow(orgId);
    expect(after.seats).toBe(2);
    // The provider's own delivery for this change must still apply, so the
    // ordering key is left alone.
    expect(after.lastEventAt?.toISOString()).toBe(before.lastEventAt?.toISOString());
  });

  it("buys the eleventh seat when ten are taken", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { ...LIVE, seats: 10 });
    await addMembers(orgId, 9); // owner + 9 = 10, the seats bought above
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(200);
    expect(changeSeats).toHaveBeenCalledWith("sub_live", 11, "grow");
    expect((await subscriptionRow(orgId)).seats).toBe(11);
  });

  // Pending invitations will become members, so they are paid for too.
  it("counts pending invitations when sizing the purchase", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { ...LIVE, seats: 10 });
    await addMembers(orgId, 7); // owner + 7 = 8
    await createPendingInvitation(orgId, { inviterId: ownerId });
    await createPendingInvitation(orgId, { inviterId: ownerId }); // = 10
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(200);
    expect(changeSeats).toHaveBeenCalledWith("sub_live", 11, "grow");
  });

  it("does not touch the provider while a bought seat is free", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { ...LIVE, seats: 3 });
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(200);
    expect(changeSeats).not.toHaveBeenCalled();
  });

  /**
   * The property that matters most: a refused purchase leaves nothing behind.
   * The hook runs before the invitation row exists, so a provider failure
   * means no row, no email and no seat.
   */
  it("writes nothing when the provider refuses the seat", async () => {
    changeSeats.mockRejectedValue(new Error("card declined"));
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { ...LIVE, seats: 1 });
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(502);
    expect(body.code).toBe("SEAT_PURCHASE_FAILED");
    expect(await invitations(orgId)).toEqual([]);
    expect((await subscriptionRow(orgId)).seats).toBe(1);
  });

  // Dunning and cancellation are fixed at the provider, not by buying more.
  it("refuses without a provider call while the subscription is on hold", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      ...LIVE,
      status: "on_hold",
      seats: 1,
      currentPeriodEnd: new Date(Date.now() + 7 * 86_400_000),
    });
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    expect(body.code).toBe("SEAT_LIMIT_REACHED");
    expect(String(body.message)).toContain("payment");
    expect(changeSeats).not.toHaveBeenCalled();
    expect(await invitations(orgId)).toEqual([]);
  });

  // Dodo refuses a plan change once a cancellation is scheduled, even though
  // the subscription is still active — so don't ask, and say what to do.
  it("refuses without a provider call once cancellation is scheduled", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      ...LIVE,
      cancelAtPeriodEnd: true,
      seats: 1,
      currentPeriodEnd: new Date(Date.now() + 7 * 86_400_000),
    });
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    expect(body.code).toBe("SEAT_LIMIT_REACHED");
    expect(String(body.message)).toContain("Revoke the cancellation");
    expect(changeSeats).not.toHaveBeenCalled();
  });

  it("refuses without a provider call while the subscription is ending", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      ...LIVE,
      status: "cancelled",
      cancelAtPeriodEnd: true,
      seats: 1,
      currentPeriodEnd: new Date(Date.now() + 7 * 86_400_000),
    });
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(403);
    expect(changeSeats).not.toHaveBeenCalled();
  });
});

describe.skipIf(!dbReady)("releasing seats", () => {
  const LIVE = { plan: "pro", status: "active", dodoSubscriptionId: "sub_live" } as const;

  /** better-auth addresses members by member id (or email), not user id. */
  async function removeMember(cookie: string, organizationId: string, userId: string) {
    const [member] = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, userId)));
    const res = await app.request("/api/auth/organization/remove-member", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ memberIdOrEmail: member!.id, organizationId }),
    });
    if (res.status !== 200) console.error("remove-member:", await res.text());
    return res.status;
  }

  it("shrinks the subscription when a member is removed", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { ...LIVE, seats: 3 });
    await addMember(orgId, "member");
    const leaver = await addMember(orgId, "member"); // 3 people, 3 seats
    const session = await createSession(ownerId, orgId);

    expect(await removeMember(session.cookie, orgId, leaver)).toBe(200);
    // Shrinking is not billed: the seat comes off at the next renewal.
    expect(changeSeats).toHaveBeenCalledWith("sub_live", 2, "shrink");
    expect((await subscriptionRow(orgId)).seats).toBe(2);
  });

  // The person is already gone; billing trouble must not undo that.
  it("does not fail the removal when the provider refuses to shrink", async () => {
    changeSeats.mockRejectedValue(new Error("provider down"));
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { ...LIVE, seats: 2 });
    const leaver = await addMember(orgId, "member");
    const session = await createSession(ownerId, orgId);

    expect(await removeMember(session.cookie, orgId, leaver)).toBe(200);
    const members = await db
      .select()
      .from(schema.member)
      .where(eq(schema.member.organizationId, orgId));
    expect(members).toHaveLength(1);
    expect((await subscriptionRow(orgId)).seats).toBe(2); // corrected next time
  });

  it("shrinks when a pending invitation is cancelled", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { ...LIVE, seats: 2 });
    const invitation = await createPendingInvitation(orgId, { inviterId: ownerId });
    const session = await createSession(ownerId, orgId);

    const res = await app.request("/api/auth/organization/cancel-invitation", {
      method: "POST",
      headers: { cookie: session.cookie, "content-type": "application/json" },
      body: JSON.stringify({ invitationId: invitation.id }),
    });
    expect(res.status).toBe(200);
    expect(changeSeats).toHaveBeenCalledWith("sub_live", 1, "shrink");
    expect((await subscriptionRow(orgId)).seats).toBe(1);
  });
});

describe.skipIf(!dbReady)("seat cap without a resizable subscription", () => {
  it("refuses when every seat is taken", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", seats: 10 });
    await addMembers(orgId, 9); // owner + 9 = 10, the seats bought above
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    expect(body.code).toBe("SEAT_LIMIT_REACHED");
    expect(await invitations(orgId)).toEqual([]);
  });

  it("counts pending invitations against the cap", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", seats: 10 });
    await addMembers(orgId, 7); // owner + 7 = 8
    await createPendingInvitation(orgId, { inviterId: ownerId });
    await createPendingInvitation(orgId, { inviterId: ownerId });
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(403);
  });

  it("does not let expired invitations hold a seat", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", seats: 10 });
    await addMembers(orgId, 7);
    for (let i = 0; i < 2; i++) {
      await createPendingInvitation(orgId, {
        inviterId: ownerId,
        expiresAt: new Date(Date.now() - 1000),
      });
    }
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(200);
  });

  it("allows the last free seat", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", seats: 10 });
    await addMembers(orgId, 8); // owner + 8 = 9, one seat spare
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(200);
  });
});

describe.skipIf(!dbReady)("accepting an invitation", () => {
  async function accept(cookie: string, invitationId: string) {
    const res = await app.request("/api/auth/organization/accept-invitation", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    return res.status;
  }

  /**
   * An invitation issued while the org was on Team can be accepted after the
   * plan lapses. The accept-time hook is what stops that seat being taken.
   */
  it("refuses acceptance once the plan has lapsed", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", seats: 10 });

    const invitee = await createUser({ email: "late@example.test" });
    const invitation = await createPendingInvitation(orgId, {
      inviterId: ownerId,
      email: invitee.email,
    });

    await db
      .update(schema.organizationSubscriptions)
      .set({ status: "expired", currentPeriodEnd: new Date(Date.now() - 1000) })
      .where(eq(schema.organizationSubscriptions.organizationId, orgId));

    const session = await createSession(invitee.id);
    const status = await accept(session.cookie, invitation.id);

    expect(status).toBe(403);
    const members = await db
      .select()
      .from(schema.member)
      .where(eq(schema.member.organizationId, orgId));
    expect(members).toHaveLength(1); // still just the owner
  });

  it("allows acceptance while the plan is active", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", seats: 10 });

    const invitee = await createUser({ email: "welcome@example.test" });
    const invitation = await createPendingInvitation(orgId, {
      inviterId: ownerId,
      email: invitee.email,
    });

    const session = await createSession(invitee.id);
    expect(await accept(session.cookie, invitation.id)).toBe(200);

    const members = await db
      .select()
      .from(schema.member)
      .where(eq(schema.member.organizationId, orgId));
    expect(members).toHaveLength(2);
  });
});

describe.skipIf(!dbReady)("membershipLimit regression", () => {
  /**
   * membershipLimit doubles as the members-list page size in better-auth. If it
   * were ever derived from the org's plan, a Free org that already has
   * teammates would show a truncated members list — this locks that it isn't.
   */
  it("lists every member of a Free org with several members", async () => {
    const { orgId, ownerId } = await createOrg();
    await addMembers(orgId, 3);
    const session = await createSession(ownerId, orgId);

    const res = await app.request(
      `/api/auth/organization/get-full-organization?organizationId=${orgId}`,
      { headers: { cookie: session.cookie } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { members: unknown[] };
    expect(body.members).toHaveLength(4); // owner + 3
  });
});
