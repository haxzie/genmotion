import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq, db, schema } from "@genmotion/db";

/**
 * The SDK is stubbed at its single boundary (`../dodo`) rather than at the
 * package, so these tests exercise the real route logic — role checks, plan
 * conflicts, metadata construction and the DB record — without network access.
 */
const create = vi.fn();
const portalCreate = vi.fn();
let enabled = true;

vi.mock("../dodo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../dodo")>();
  return {
    ...actual,
    get dodoEnabled() {
      return enabled;
    },
    dodoClient: () => ({
      checkoutSessions: { create },
      customers: { customerPortal: { create: portalCreate } },
    }),
  };
});

const { dbReady, truncateAll } = await import("./helpers/db");
const { createOrg, addMember, setSubscription, createUser } = await import(
  "./helpers/factories"
);
const { createSession, requestJson } = await import("./helpers/http");

beforeEach(async () => {
  await truncateAll();
  create.mockReset();
  portalCreate.mockReset();
  enabled = true;
  create.mockResolvedValue({
    session_id: "cks_test_1",
    checkout_url: "https://checkout.test/session/cks_test_1",
  });
  portalCreate.mockResolvedValue({ link: "https://portal.test/cus_1" });
});

async function ownerSession() {
  const { orgId, ownerId } = await createOrg();
  return { orgId, ownerId, session: await createSession(ownerId, orgId) };
}

describe.skipIf(!dbReady)("POST /api/billing/checkout", () => {
  it("requires authentication", async () => {
    const { status } = await requestJson("/api/billing/checkout", {
      json: { plan: "pro" },
    });
    expect(status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns a checkout url for Pro", async () => {
    const { session } = await ownerSession();
    const { status, body } = await requestJson<{ url: string; sessionId: string }>(
      "/api/billing/checkout",
      { as: session, json: { plan: "pro" } },
    );
    expect(status).toBe(200);
    expect(body.url).toBe("https://checkout.test/session/cks_test_1");
    expect(body.sessionId).toBe("cks_test_1");

    const [args] = create.mock.calls[0]!;
    expect(args.product_cart).toEqual([
      { product_id: "pdt_test_pro", quantity: 1 },
    ]);
  });

  it("uses the Team product for Team", async () => {
    const { session } = await ownerSession();
    await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "team" },
    });
    const [args] = create.mock.calls[0]!;
    expect(args.product_cart[0].product_id).toBe("pdt_test_team");
  });

  /**
   * The metadata is the only link from a subscription back to an organization,
   * so its exact contents — and their conformance to the provider's key/value
   * limits — are load-bearing.
   */
  it("carries the organization in metadata within provider limits", async () => {
    const { orgId, ownerId, session } = await ownerSession();
    await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "pro" },
    });

    const [args] = create.mock.calls[0]!;
    expect(args.metadata.organizationId).toBe(orgId);
    expect(args.metadata.plan).toBe("pro");
    expect(args.metadata.userId).toBe(ownerId);

    const entries = Object.entries(args.metadata as Record<string, unknown>);
    expect(entries.length).toBeLessThanOrEqual(50);
    for (const [key, value] of entries) {
      expect(key.length).toBeLessThanOrEqual(40);
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeLessThanOrEqual(500);
    }
  });

  it("passes the customer and a return url back to the app", async () => {
    const { ownerId, session } = await ownerSession();
    const user = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, ownerId));
    await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "pro" },
    });

    const [args] = create.mock.calls[0]!;
    expect(args.customer.email).toBe(user[0]!.email);
    expect(args.return_url).toContain("/settings/billing");
    expect(args.return_url).toContain("checkout=success");
  });

  it("records the attempt", async () => {
    const { orgId, ownerId, session } = await ownerSession();
    await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "team" },
    });

    const [row] = await db
      .select()
      .from(schema.billingCheckoutSessions)
      .where(eq(schema.billingCheckoutSessions.id, "cks_test_1"));
    expect(row).toMatchObject({
      organizationId: orgId,
      userId: ownerId,
      plan: "team",
      productId: "pdt_test_team",
      checkoutUrl: "https://checkout.test/session/cks_test_1",
    });
  });

  it("rejects an unknown plan", async () => {
    const { session } = await ownerSession();
    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "enterprise" },
    });
    expect(status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a missing plan", async () => {
    const { session } = await ownerSession();
    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: {},
    });
    expect(status).toBe(400);
  });

  // A plain member must not be able to commit the org to a recurring charge.
  it("refuses a member who isn't an owner or admin", async () => {
    const { orgId } = await createOrg();
    const memberId = await addMember(orgId, "member");
    const session = await createSession(memberId, orgId);

    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "pro" },
    });
    expect(status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("allows an admin", async () => {
    const { orgId } = await createOrg();
    const adminId = await addMember(orgId, "admin");
    const session = await createSession(adminId, orgId);
    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "pro" },
    });
    expect(status).toBe(200);
  });

  it("refuses when the org is already on that plan", async () => {
    const { orgId, session } = await ownerSession();
    await setSubscription(orgId, { plan: "team", status: "active" });
    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "team" },
    });
    expect(status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it("allows upgrading from Pro to Team", async () => {
    const { orgId, session } = await ownerSession();
    await setSubscription(orgId, { plan: "pro", status: "active" });
    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "team" },
    });
    expect(status).toBe(200);
  });

  it("reports 503 when billing isn't configured", async () => {
    enabled = false;
    const { session } = await ownerSession();
    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "pro" },
    });
    expect(status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("surfaces a provider failure without recording an attempt", async () => {
    create.mockRejectedValue(new Error("provider down"));
    const { session } = await ownerSession();
    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "pro" },
    });
    expect(status).toBe(502);
    expect(await db.select().from(schema.billingCheckoutSessions)).toEqual([]);
  });

  // A session with no url is unusable; treat it as a provider failure rather
  // than handing the client an undefined redirect.
  it("treats a missing checkout url as a failure", async () => {
    create.mockResolvedValue({ session_id: "cks_no_url", checkout_url: null });
    const { session } = await ownerSession();
    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "pro" },
    });
    expect(status).toBe(502);
    expect(await db.select().from(schema.billingCheckoutSessions)).toEqual([]);
  });
});

describe.skipIf(!dbReady)("POST /api/billing/portal", () => {
  it("refuses when there's no billing account yet", async () => {
    const { session } = await ownerSession();
    const { status } = await requestJson("/api/billing/portal", {
      as: session,
      method: "POST",
    });
    expect(status).toBe(409);
  });

  it("returns a portal link once a customer exists", async () => {
    const { orgId, session } = await ownerSession();
    await setSubscription(orgId, {
      plan: "pro",
      status: "active",
      dodoCustomerId: "cus_1",
    });
    const { status, body } = await requestJson<{ url: string }>(
      "/api/billing/portal",
      { as: session, method: "POST" },
    );
    expect(status).toBe(200);
    expect(body.url).toBe("https://portal.test/cus_1");
    expect(portalCreate).toHaveBeenCalledWith("cus_1");
  });

  it("refuses a plain member", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, {
      plan: "pro",
      status: "active",
      dodoCustomerId: "cus_1",
    });
    const memberId = await addMember(orgId, "member");
    const { status } = await requestJson("/api/billing/portal", {
      as: await createSession(memberId, orgId),
      method: "POST",
    });
    expect(status).toBe(403);
    expect(portalCreate).not.toHaveBeenCalled();
  });
});

describe.skipIf(!dbReady)("GET /api/billing/limits", () => {
  it("reports the Free plan with finite caps", async () => {
    const { session } = await ownerSession();
    const { status, body } = await requestJson<{
      plan: { id: string; seats: number; canInvite: boolean };
      limits: { projects: { unlimited: boolean; max: number | null } };
      seats: { used: number; max: number };
      subscription: { manageable: boolean; paid: boolean };
    }>("/api/billing/limits", { as: session });

    expect(status).toBe(200);
    expect(body.plan.id).toBe("free");
    expect(body.plan.canInvite).toBe(false);
    expect(body.limits.projects.unlimited).toBe(false);
    expect(body.seats).toEqual({ used: 1, max: 1 });
    expect(body.subscription.paid).toBe(false);
    expect(body.subscription.manageable).toBe(false);
  });

  it("reports Team with seat usage including pending invites", async () => {
    const { orgId, ownerId, session } = await ownerSession();
    await setSubscription(orgId, { plan: "team", status: "active" });
    await addMember(orgId, "member");
    const { createPendingInvitation } = await import("./helpers/factories");
    await createPendingInvitation(orgId, { inviterId: ownerId });

    const { body } = await requestJson<{
      plan: { id: string; canInvite: boolean; seats: number };
      limits: { projects: { unlimited: boolean } };
      seats: { used: number; max: number };
    }>("/api/billing/limits", { as: session });

    expect(body.plan.id).toBe("team");
    expect(body.plan.canInvite).toBe(true);
    expect(body.limits.projects.unlimited).toBe(true);
    expect(body.seats).toEqual({ used: 3, max: 10 });
  });

  // Locks the single-source-of-truth property the whole design rests on.
  it("agrees with /usage about the plan", async () => {
    const { orgId, session } = await ownerSession();
    await setSubscription(orgId, { plan: "pro", status: "active" });

    const limits = await requestJson<{ plan: unknown }>("/api/billing/limits", {
      as: session,
    });
    const usage = await requestJson<{ plan: unknown }>("/api/billing/usage", {
      as: session,
    });
    expect(usage.body.plan).toEqual(limits.body.plan);
  });

  it("falls back to Free for a user with no subscription row", async () => {
    const user = await createUser();
    const { orgId } = await createOrg({ ownerId: user.id });
    const { body } = await requestJson<{ plan: { id: string } }>(
      "/api/billing/limits",
      { as: await createSession(user.id, orgId) },
    );
    expect(body.plan.id).toBe("free");
  });
});
