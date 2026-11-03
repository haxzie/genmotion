import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, schema, eq } from "@genmotion/db";
import { dbReady, truncateAll } from "./helpers/db";
import { addMember, createOrg, setSubscription } from "./helpers/factories";

/**
 * The mailing-list transport, in isolation.
 *
 * `../mails` reads its key from `../env` at import, so each case resets the
 * module registry and re-imports after stubbing the environment. `fetch` is
 * stubbed globally — nothing here may reach the list.
 */

const fetchMock = vi.fn();

async function loadMails(key?: string) {
  vi.resetModules();
  if (key) vi.stubEnv("MAILS_API_KEY", key);
  else delete process.env.MAILS_API_KEY;
  delete process.env.MAILS_LIST_ID;
  return import("../mails");
}

/** The transport does not await the request, so the test has to. */
async function settle() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url, init, body: JSON.parse(init.body as string) };
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "ok" });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("addContact", () => {
  it("is inert when no key is configured", async () => {
    const { addContact, mailsEnabled } = await loadMails();
    expect(mailsEnabled).toBe(false);
    addContact({ email: "ada@example.com", name: "Ada Lovelace" });
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the contact on the free plan, authorized with the key", async () => {
    const { addContact } = await loadMails("mls_test");
    addContact({
      email: "ada@example.com",
      name: "Ada Lovelace",
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
    });
    await settle();

    const { url, init, body } = lastCall();
    expect(url).toBe("https://mails-api.haxzie.com/v1/contacts");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer mls_test");
    expect(body).toEqual({
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      properties: { plan: "free", signed_up_at: "2026-01-02T03:04:05.000Z" },
    });
  });

  it("sends a one-word name as the first name, and omits a missing one", async () => {
    const { addContact } = await loadMails("mls_test");
    addContact({ email: "a@example.com", name: "Ada" });
    await settle();
    expect(lastCall().body.firstName).toBe("Ada");
    expect(lastCall().body).not.toHaveProperty("lastName");

    addContact({ email: "b@example.com", name: null });
    await settle();
    expect(lastCall().body).not.toHaveProperty("firstName");
  });

  it("subscribes to the configured list when one is set", async () => {
    vi.stubEnv("MAILS_LIST_ID", "lst_42");
    vi.resetModules();
    vi.stubEnv("MAILS_API_KEY", "mls_test");
    const { addContact } = await import("../mails");
    addContact({ email: "ada@example.com" });
    await settle();
    expect(lastCall().body.lists).toEqual(["lst_42"]);
  });

  it("logs a rejection rather than throwing it at the signup", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("network down"));
    const { addContact } = await loadMails("mls_test");
    expect(() => addContact({ email: "ada@example.com" })).not.toThrow();
    await settle();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe("updateContact", () => {
  it("patches, so properties merge instead of replacing", async () => {
    const { updateContact } = await loadMails("mls_test");
    updateContact("ada+plus@example.com", { plan: "pro", mrr: 19 });
    await settle();

    const { url, init, body } = lastCall();
    // The address is a path segment — a `+` in it must not become a space.
    expect(url).toBe("https://mails-api.haxzie.com/v1/contacts/ada%2Bplus%40example.com");
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ properties: { plan: "pro", mrr: 19 } });
  });
});

describe("syncSubscription", () => {
  /**
   * DB-backed: the plan it sends is `getEntitlements`' answer, so the cases
   * worth pinning are the ones where the row's plan and the entitled plan
   * differ — a cancellation inside its paid period, and an expiry.
   */
  beforeEach(async () => {
    if (dbReady) await truncateAll();
  });

  /** Every PATCH, keyed by the contact it was for. */
  function patches(): Record<string, Record<string, unknown>> {
    const out: Record<string, Record<string, unknown>> = {};
    for (const [url, init] of fetchMock.mock.calls) {
      const email = decodeURIComponent(String(url).split("/v1/contacts/")[1]!);
      out[email] = JSON.parse((init as RequestInit).body as string).properties;
    }
    return out;
  }

  async function emailOf(userId: string): Promise<string> {
    const [row] = await db
      .select({ email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, userId));
    return row!.email;
  }

  it.skipIf(!dbReady)("gives every member the plan and the owner the mrr", async () => {
    const { orgId, ownerId } = await createOrg();
    const teammateId = await addMember(orgId);
    await setSubscription(orgId, { plan: "max", status: "active" });

    const { syncSubscription } = await loadMails("mls_test");
    await syncSubscription(orgId);
    await settle();

    const byEmail = patches();
    expect(byEmail[await emailOf(ownerId)]).toMatchObject({ plan: "max", mrr: 199 });
    expect(byEmail[await emailOf(teammateId)]).toMatchObject({ plan: "max" });
    expect(byEmail[await emailOf(teammateId)]).not.toHaveProperty("mrr");
  });

  it.skipIf(!dbReady)("keeps a cancelled subscription on its plan until the period ends", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      plan: "pro",
      status: "cancelled",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() + 7 * 86_400_000),
    });

    const { syncSubscription } = await loadMails("mls_test");
    await syncSubscription(orgId);
    await settle();

    expect(patches()[await emailOf(ownerId)]).toEqual({
      plan: "pro",
      plan_status: "cancelled",
      cancels_at_period_end: true,
      mrr: 19,
    });
  });

  it.skipIf(!dbReady)("takes an expired subscription back to free, with no mrr", async () => {
    const { orgId, ownerId } = await createOrg();
    await setSubscription(orgId, {
      plan: "pro",
      status: "expired",
      currentPeriodEnd: new Date(Date.now() - 86_400_000),
    });

    const { syncSubscription } = await loadMails("mls_test");
    await syncSubscription(orgId);
    await settle();

    expect(patches()[await emailOf(ownerId)]).toMatchObject({
      plan: "free",
      plan_status: "expired",
      mrr: 0,
    });
  });

  it.skipIf(!dbReady)("writes nothing for an org that never bought anything", async () => {
    const { orgId } = await createOrg();
    const { syncSubscription } = await loadMails("mls_test");
    await syncSubscription(orgId);
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
