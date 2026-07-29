import { beforeEach, describe, expect, it } from "vitest";
import { eq, schema, db } from "@genmotion/db";
import { app } from "../app";
import { dbReady, truncateAll } from "./helpers/db";
import { databaseName } from "./helpers/test-env";
import { createOrg } from "./helpers/factories";
import { createSession, requestJson } from "./helpers/http";

/**
 * Proves the test harness itself before any feature depends on it: the suite
 * is pointed at an isolated database, the schema is migrated, truncation works,
 * and Hono routes are reachable through `app.request`.
 */
beforeEach(async () => {
  await truncateAll();
});

describe("test harness", () => {
  it("runs against an isolated _test database, never the dev one", () => {
    const name = databaseName(process.env.DATABASE_URL!);
    expect(name).toMatch(/_test$/);
    expect(name).not.toBe("genmotion");
  });

  it.skipIf(!dbReady)("has the billing schema migrated", async () => {
    // Reaching these tables at all proves globalSetup ran the migrations.
    await expect(db.select().from(schema.organizationSubscriptions)).resolves.toEqual([]);
    await expect(db.select().from(schema.billingWebhookEvents)).resolves.toEqual([]);
    await expect(db.select().from(schema.billingCheckoutSessions)).resolves.toEqual([]);
  });

  it.skipIf(!dbReady)("truncates between tests", async () => {
    await db.insert(schema.organization).values({
      id: "org-truncate-check",
      name: "Truncate check",
      slug: "truncate-check",
      createdAt: new Date(),
    });
    const before = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, "org-truncate-check"));
    expect(before).toHaveLength(1);

    await truncateAll();

    const after = await db.select().from(schema.organization);
    expect(after).toEqual([]);
  });

  it("serves HTTP through app.request", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("rejects an unauthenticated billing request", async () => {
    const res = await app.request("/api/billing/limits");
    expect(res.status).toBe(401);
  });

  it.skipIf(!dbReady)("authenticates a minted session end to end", async () => {
    const { orgId, ownerId } = await createOrg();
    const session = await createSession(ownerId, orgId);

    // Travels the real path: requireAuth → auth.api.getSession → cookie verify.
    const { status, body } = await requestJson<{ plan: { id: string } }>(
      "/api/billing/limits",
      { as: session },
    );
    expect(status).toBe(200);
    expect(body.plan.id).toBe("free");
  });

  it.skipIf(!dbReady)("resolves the org when the session has no active org", async () => {
    // requireAuth falls back to the user's earliest membership.
    const { orgId, ownerId } = await createOrg();
    const session = await createSession(ownerId);
    const { status } = await requestJson("/api/billing/limits", { as: session });
    expect(status).toBe(200);
    expect(orgId).toBeTruthy();
  });
});
