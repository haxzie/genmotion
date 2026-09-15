import { beforeEach, describe, expect, it } from "vitest";
import { eq, db, schema } from "@genmotion/db";
import { PLANS } from "@genmotion/shared";
import { app } from "../app";
import { dbReady, truncateAll } from "./helpers/db";
import {
  addMembers,
  createOrg,
  createPendingInvitation,
  createUser,
  setSubscription,
} from "./helpers/factories";
import { createSession } from "./helpers/http";

/**
 * The team policy, driven through better-auth's real organization endpoints
 * so the hooks are proven to be wired into the request path — including the
 * property that a refused invite writes nothing and sends nothing.
 *
 * The policy: Pro is one person, and an invite there is answered with Max.
 * Max is five seats; the sixth invite is refused (members plus pending
 * invitations), and the sixth person to try to join a full team is turned
 * away at the door. Nothing here buys seats.
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

async function accept(cookie: string, invitationId: string) {
  const res = await app.request("/api/auth/organization/accept-invitation", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ invitationId }),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as { message?: string } };
}

async function invitations(organizationId: string) {
  return db.select().from(schema.invitation).where(eq(schema.invitation.organizationId, organizationId));
}

async function members(organizationId: string) {
  return db.select().from(schema.member).where(eq(schema.member.organizationId, organizationId));
}

const inAMonth = () => new Date(Date.now() + 30 * 86_400_000);

beforeEach(truncateAll);

describe.skipIf(!dbReady)("inviting", () => {
  it("refuses on Free and writes no invitation", async () => {
    const { orgId, ownerId } = await createOrg();
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    expect(body.code).toBe("PLAN_REQUIRES_UPGRADE");
    expect(await invitations(orgId)).toHaveLength(0);
  });

  it("refuses on Pro — one seat — and points at Max", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", currentPeriodEnd: inAMonth() });
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    expect(body.code).toBe("PLAN_REQUIRES_UPGRADE");
    expect(String(body.message)).toContain(PLANS.max.name);
    expect(String(body.message)).toContain(`$${PLANS.max.priceUsd}`);
    expect(await invitations(orgId)).toHaveLength(0);
  });

  it("allows on Max with a seat free", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active", currentPeriodEnd: inAMonth() });
    const session = await createSession(ownerId, orgId);

    const { status } = await invite(session.cookie, orgId);

    expect(status).toBe(200);
    expect(await invitations(orgId)).toHaveLength(1);
  });

  it("refuses the sixth on Max, counting pending invitations, and says to contact us", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active", currentPeriodEnd: inAMonth() });
    await addMembers(orgId, 2); // owner + 2 = 3 members
    await createPendingInvitation(orgId, { inviterId: ownerId, email: "a@example.test" });
    await createPendingInvitation(orgId, { inviterId: ownerId, email: "b@example.test" }); // 5 seats spoken for
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId, "sixth@example.test");

    expect(status).toBe(403);
    expect(body.code).toBe("SEAT_LIMIT_REACHED");
    expect(String(body.message)).toMatch(/contact us/i);
    expect(await invitations(orgId)).toHaveLength(2);
  });

  it("does not let expired invitations hold a seat", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active", currentPeriodEnd: inAMonth() });
    await addMembers(orgId, 3); // owner + 3 = 4 seats taken
    await createPendingInvitation(orgId, {
      inviterId: ownerId,
      email: "stale@example.test",
      expiresAt: new Date(Date.now() - 1000),
    });
    const session = await createSession(ownerId, orgId);

    // The stale one does not count, so the fifth seat is free…
    expect((await invite(session.cookie, orgId, "fifth@example.test")).status).toBe(200);
    // …and now it is not.
    expect((await invite(session.cookie, orgId, "sixth@example.test")).status).toBe(403);
  });

  it("still allows inviting during a cancellation grace period", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      plan: "max",
      status: "cancelled",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: inAMonth(),
    });
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(200);
  });

  it("refuses once the subscription has lapsed", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      plan: "max",
      status: "expired",
      currentPeriodEnd: new Date(Date.now() - 1000),
    });
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(403);
  });
});

describe.skipIf(!dbReady)("joining", () => {
  it("allows acceptance while a seat is free", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active", currentPeriodEnd: inAMonth() });
    const invitee = await createUser({ email: "welcome@example.test" });
    const invitation = await createPendingInvitation(orgId, { inviterId: ownerId, email: invitee.email });

    const session = await createSession(invitee.id);
    expect((await accept(session.cookie, invitation.id)).status).toBe(200);
    expect(await members(orgId)).toHaveLength(2);
  });

  /**
   * Any number of invitations may be out; the seats decide who gets in. Two
   * people racing for the last one: the second is told the team is full.
   */
  it("turns the sixth person away at the door once five are in", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active", currentPeriodEnd: inAMonth() });
    const invitee = await createUser({ email: "late@example.test" });
    const invitation = await createPendingInvitation(orgId, { inviterId: ownerId, email: invitee.email });
    await addMembers(orgId, 4); // owner + 4 = 5: full, after the invitation went out

    const session = await createSession(invitee.id);
    const { status, body } = await accept(session.cookie, invitation.id);

    expect(status).toBe(403);
    expect(body.message).toMatch(/already full/i);
    expect(await members(orgId)).toHaveLength(5);
  });

  it("refuses acceptance once the plan has lapsed", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active", currentPeriodEnd: inAMonth() });
    const invitee = await createUser({ email: "late@example.test" });
    const invitation = await createPendingInvitation(orgId, { inviterId: ownerId, email: invitee.email });
    await db
      .update(schema.organizationSubscriptions)
      .set({ status: "expired", currentPeriodEnd: new Date(Date.now() - 1000) })
      .where(eq(schema.organizationSubscriptions.organizationId, orgId));

    const session = await createSession(invitee.id);
    expect((await accept(session.cookie, invitation.id)).status).toBe(403);
    expect(await members(orgId)).toHaveLength(1);
  });
});

describe.skipIf(!dbReady)("the policy on /limits", () => {
  async function team(cookie: string) {
    const res = await app.request("/api/billing/limits", { headers: { cookie } });
    return ((await res.json()) as { team: Record<string, unknown> }).team;
  }

  it("tells a Pro org to upgrade, with the plan to pitch", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active", currentPeriodEnd: inAMonth() });
    const session = await createSession(ownerId, orgId);

    expect(await team(session.cookie)).toMatchObject({
      canInvite: false,
      code: "PLAN_REQUIRES_UPGRADE",
      upgrade: "max",
      seats: { used: 1, max: 1 },
    });
  });

  it("tells a full Max org the team is full, with no upgrade to offer", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active", currentPeriodEnd: inAMonth() });
    await addMembers(orgId, 4);
    const session = await createSession(ownerId, orgId);

    const policy = await team(session.cookie);
    expect(policy).toMatchObject({ canInvite: false, full: true, code: "SEAT_LIMIT_REACHED", seats: { used: 5, max: 5 } });
    expect(policy.upgrade).toBeUndefined();
    expect(String(policy.message)).toMatch(/contact us/i);
  });

  it("says how many seats are left when inviting is fine", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "max", status: "active", currentPeriodEnd: inAMonth() });
    const session = await createSession(ownerId, orgId);

    expect(await team(session.cookie)).toMatchObject({ canInvite: true, full: false, seats: { used: 1, max: 5 } });
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
