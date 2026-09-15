import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq, db, schema } from "@genmotion/db";

/**
 * What reaches the Slack feeds, and from where.
 *
 * The feeds are pointed at fake URLs and `fetch` is intercepted for them, so
 * the message builders and the hooks that call them run for real — through
 * the checkout route, the signed webhook, better-auth's organization endpoints
 * and the magic-link sign-up — and the assertions are on the exact lines that
 * would have been posted. Everything else `fetch` is asked for passes through.
 */
const FEEDS = {
  events: "https://hooks.slack.test/events",
  signups: "https://hooks.slack.test/signups",
} as const;

// Before `../env` is first evaluated, which the imports below trigger.
process.env.SLACK_EVENTS_WEBHOOK_URL = FEEDS.events;
process.env.SLACK_SIGNUPS_WEBHOOK_URL = FEEDS.signups;

const posts = vi.fn<(feed: keyof typeof FEEDS, text: string) => void>();
const realFetch = globalThis.fetch;
vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const feed = (Object.keys(FEEDS) as (keyof typeof FEEDS)[]).find((f) => FEEDS[f] === url);
  if (!feed) return realFetch(input, init);
  posts(feed, (JSON.parse(String(init?.body)) as { text: string }).text);
  return new Response("ok", { status: 200 });
});

// The provider is stubbed as in checkout.test.ts / invites.test.ts — except
// signature verification, which stays the SDK's so the webhook path is real.
const create = vi.fn();
const changeSeats = vi.fn();
vi.mock("../dodo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../dodo")>();
  return {
    ...actual,
    changeSeats,
    dodoClient: () => ({
      webhooks: actual.dodoClient().webhooks,
      checkoutSessions: { create },
    }),
  };
});

const { app } = await import("../app");
const { dbReady, truncateAll } = await import("./helpers/db");
const { createOrg, createPendingInvitation, createUser, setSubscription } =
  await import("./helpers/factories");
const { createSession, requestJson } = await import("./helpers/http");
const { postWebhook, signWebhook, subscriptionEvent } = await import("./helpers/dodo");

/** The transport does not await its post, so give it a tick to be captured. */
async function feed(name: keyof typeof FEEDS): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 0));
  return posts.mock.calls.filter(([f]) => f === name).map(([, text]) => text);
}

beforeEach(async () => {
  await truncateAll();
  posts.mockReset();
  create.mockReset();
  changeSeats.mockReset();
  changeSeats.mockResolvedValue(undefined);
  create.mockResolvedValue({
    session_id: "cks_test_1",
    checkout_url: "https://checkout.test/session/cks_test_1",
  });
});

describe.skipIf(!dbReady)("events feed", () => {
  it("announces a checkout with the buyer, plan, seats and org", async () => {
    const owner = await createUser({ name: "Ada Lovelace", email: "ada@example.test" });
    const { orgId } = await createOrg({ ownerId: owner.id, name: "Analytical Engines" });
    const session = await createSession(owner.id, orgId);

    const { status } = await requestJson("/api/billing/checkout", {
      as: session,
      json: { plan: "pro" },
    });
    expect(status).toBe(200);

    expect(await feed("events")).toEqual([
      '🛒 *Ada Lovelace* (ada@example.test) started checkout for Pro (1 seat) · "Analytical Engines"',
    ]);
    expect(await feed("signups")).toEqual([]);
  });

  it("announces subscription lifecycle events once the webhook has applied them", async () => {
    const { orgId } = await createOrg({ name: "Analytical Engines" });

    const active = signWebhook(
      subscriptionEvent("subscription.active", { organizationId: orgId, extraSeats: 2 }),
    );
    expect((await postWebhook(active)).status).toBe(200);
    expect(await feed("events")).toEqual([
      '✅ Subscription started · "Analytical Engines" · Pro, 1 seat · buyer@example.test',
    ]);

    // A redelivery changed nothing, so it says nothing.
    expect((await postWebhook(active)).body.status).toBe("deduped");
    expect(await feed("events")).toHaveLength(1);

    // The snapshot event is skipped: it accompanies the ones already posted.
    const updated = signWebhook(
      subscriptionEvent("subscription.updated", {
        organizationId: orgId,
        withAddons: false,
        timestamp: new Date(Date.now() + 1000),
      }),
    );
    expect((await postWebhook(updated)).body.status).toBe("processed");
    expect(await feed("events")).toHaveLength(1);

    const periodEnd = new Date("2026-10-14T00:00:00Z");
    const cancelled = signWebhook(
      subscriptionEvent("subscription.cancelled", {
        organizationId: orgId,
        nextBillingDate: periodEnd,
        timestamp: new Date(Date.now() + 2000),
      }),
    );
    expect((await postWebhook(cancelled)).body.status).toBe("processed");
    expect((await feed("events"))[1]).toBe(
      '❌ Subscription cancelled · "Analytical Engines" · Pro, 1 seat · buyer@example.test · ends 2026-10-14',
    );
  });

  it("says nothing for a delivery that could not be attributed", async () => {
    const delivery = signWebhook(subscriptionEvent("subscription.active", { withMetadata: false }));
    expect((await postWebhook(delivery)).body.status).toBe("ignored");
    expect(await feed("events")).toEqual([]);
  });

  it("announces invitations sent, accepted, and members removed", async () => {
    const owner = await createUser({ name: "Ada Lovelace", email: "ada@example.test" });
    const { orgId } = await createOrg({ ownerId: owner.id, name: "Analytical Engines" });
    await setSubscription(orgId, { plan: "max", status: "active" });
    const ownerSession = await createSession(owner.id, orgId);

    const invite = await app.request("/api/auth/organization/invite-member", {
      method: "POST",
      headers: { cookie: ownerSession.cookie, "content-type": "application/json" },
      body: JSON.stringify({ email: "charles@example.test", role: "member", organizationId: orgId }),
    });
    expect(invite.status).toBe(200);
    expect(await feed("events")).toEqual([
      '✉️ *Ada Lovelace* (ada@example.test) invited charles@example.test to "Analytical Engines" as member',
    ]);

    const invitee = await createUser({ name: "Charles Babbage", email: "babbage@example.test" });
    const invitation = await createPendingInvitation(orgId, {
      inviterId: owner.id,
      email: invitee.email,
    });
    const inviteeSession = await createSession(invitee.id);
    const accept = await app.request("/api/auth/organization/accept-invitation", {
      method: "POST",
      headers: { cookie: inviteeSession.cookie, "content-type": "application/json" },
      body: JSON.stringify({ invitationId: invitation.id }),
    });
    expect(accept.status).toBe(200);
    expect((await feed("events"))[1]).toBe(
      '🤝 *Charles Babbage* (babbage@example.test) joined "Analytical Engines"',
    );

    const remove = await app.request("/api/auth/organization/remove-member", {
      method: "POST",
      headers: { cookie: ownerSession.cookie, "content-type": "application/json" },
      body: JSON.stringify({ memberIdOrEmail: invitee.email, organizationId: orgId }),
    });
    expect(remove.status).toBe(200);
    expect((await feed("events"))[2]).toBe(
      '👋 *Charles Babbage* (babbage@example.test) was removed from "Analytical Engines"',
    );
  });
});

describe.skipIf(!dbReady)("signups feed", () => {
  const ORIGIN = process.env.WEB_URL ?? "http://localhost:4000";

  /** A real magic-link sign-up: request the link, pull its token, verify. */
  async function signUp(email: string): Promise<string> {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const requested = await app.request("/api/auth/sign-in/magic-link", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    log.mockRestore();
    expect(requested.status).toBe(200);

    const [row] = await db
      .select({ token: schema.verification.identifier })
      .from(schema.verification)
      .where(eq(schema.verification.value, JSON.stringify({ email, name: "" })));
    const token = row?.token ?? (await latestToken());
    const verified = await app.request(
      `/api/auth/magic-link/verify?token=${encodeURIComponent(token)}&callbackURL=/`,
      { headers: { origin: ORIGIN }, redirect: "manual" },
    );
    expect([200, 302]).toContain(verified.status);
    return verified.headers.get("set-cookie") ?? "";
  }

  async function latestToken(): Promise<string> {
    const [row] = await db.select().from(schema.verification);
    if (!row) throw new Error("no verification row was written");
    return row.identifier;
  }

  it("announces a new account, and nothing for a returning one", async () => {
    await signUp("grace@example.test");
    expect(await feed("signups")).toEqual(["🎉 New signup: *grace@example.test* via magic link"]);
    expect(await feed("events")).toEqual([]);

    await signUp("grace@example.test");
    expect(await feed("signups")).toHaveLength(1);
  });

  it("announces onboarding with the role, once", async () => {
    const user = await createUser({
      name: "Grace Hopper",
      email: "grace@example.test",
      onboardingCompleted: false,
    });
    const { orgId } = await createOrg({ ownerId: user.id });
    const session = await createSession(user.id, orgId);

    const onboard = (body: Record<string, unknown>) =>
      app.request("/api/auth/update-user", {
        method: "POST",
        headers: { cookie: session.cookie, origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify(body),
      });

    expect((await onboard({ jobRole: "Designer", onboardingCompleted: true })).status).toBe(200);
    expect(await feed("signups")).toEqual([
      "📝 *Grace Hopper* (grace@example.test) finished onboarding · role: Designer",
    ]);

    // A later profile edit is not onboarding.
    expect((await onboard({ name: "Rear Admiral Hopper" })).status).toBe(200);
    expect(await feed("signups")).toHaveLength(1);
  });
});
