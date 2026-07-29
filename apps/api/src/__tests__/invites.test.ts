import { beforeEach, describe, expect, it } from "vitest";
import { eq, db, schema } from "@genmotion/db";
import { PLANS } from "@genmotion/shared";
import { app } from "../app";
import { dbReady, truncateAll } from "./helpers/db";
import {
  addMember,
  addMembers,
  createOrg,
  createPendingInvitation,
  createUser,
  setSubscription,
} from "./helpers/factories";
import { createSession } from "./helpers/http";

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

beforeEach(truncateAll);

describe.skipIf(!dbReady)("invite gating by plan", () => {
  it("refuses on Free and writes no invitation", async () => {
    const { orgId, ownerId } = await createOrg();
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    expect(String(body.message)).toContain("Team");
    // The property that would break if better-auth stopped awaiting the hook
    // before writing the row.
    expect(await invitations(orgId)).toEqual([]);
  });

  /**
   * The case most likely to regress: Pro is paid and unlimited, but it is a
   * single seat, so it still cannot invite.
   */
  it("refuses on Pro", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active" });
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    expect(body.code).toBe("PLAN_REQUIRES_TEAM");
    expect(await invitations(orgId)).toEqual([]);
  });

  it("allows on Team", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });
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

  it("refuses once a Team subscription has lapsed", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      plan: "team",
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
      plan: "team",
      status: "cancelled",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(200);
  });
});

describe.skipIf(!dbReady)("seat cap", () => {
  it("refuses when every seat is taken", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });
    await addMembers(orgId, PLANS.team.seats - 1); // owner + 9 = 10
    const session = await createSession(ownerId, orgId);

    const { status, body } = await invite(session.cookie, orgId);

    expect(status).toBe(403);
    expect(body.code).toBe("SEAT_LIMIT_REACHED");
    expect(await invitations(orgId)).toEqual([]);
  });

  it("counts pending invitations against the cap", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });
    await addMembers(orgId, 7); // owner + 7 = 8
    await createPendingInvitation(orgId, { inviterId: ownerId });
    await createPendingInvitation(orgId, { inviterId: ownerId });
    const session = await createSession(ownerId, orgId);

    expect((await invite(session.cookie, orgId)).status).toBe(403);
  });

  it("does not let expired invitations hold a seat", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, { plan: "team", status: "active" });
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
    await setSubscription(orgId, { plan: "team", status: "active" });
    await addMembers(orgId, PLANS.team.seats - 2); // owner + 8 = 9
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
    await setSubscription(orgId, { plan: "team", status: "active" });

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
    await setSubscription(orgId, { plan: "team", status: "active" });

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
