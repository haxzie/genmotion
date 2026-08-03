import { beforeEach, describe, expect, it } from "vitest";
import { and, db, eq, schema } from "@genmotion/db";
import { signAdminToken } from "../admin/token";
import { dbReady, truncateAll } from "./helpers/db";
import { createSession, requestJson } from "./helpers/http";
import {
  addMember,
  createChatMessage,
  createExportJob,
  createOrg,
  createProject,
  createUser,
  setSubscription,
} from "./helpers/factories";

/**
 * Admin console integration tests.
 *
 * The console reads across every org, so the two things worth pinning down are
 * the auth boundary (only an admin Bearer token gets in, and it must not work
 * as a product credential) and the derived columns — plan, org creator, primary
 * org, duration — none of which are stored as such.
 */

const DAY = 24 * 3600 * 1000;

/** An admin token for an allowlisted domain (ADMIN_EMAIL_DOMAINS default). */
async function adminAuth(): Promise<{ headers: Record<string, string> }> {
  const user = await createUser({ email: `admin-${Date.now()}@genmotion.dev` });
  const token = signAdminToken({ id: user.id, email: user.email });
  return { headers: { authorization: `Bearer ${token}` } };
}

describe.skipIf(!dbReady)("admin auth boundary", () => {
  beforeEach(truncateAll);

  it("rejects an unauthenticated request", async () => {
    const { status } = await requestJson("/api/admin/projects");
    expect(status).toBe(401);
  });

  it("rejects a plain product session cookie", async () => {
    const { orgId, ownerId } = await createOrg();
    const session = await createSession(ownerId, orgId);
    const { status } = await requestJson("/api/admin/projects", { as: session });
    expect(status).toBe(401);
  });

  it("rejects an admin token from a non-allowlisted domain", async () => {
    const user = await createUser({ email: "outsider@example.test" });
    const token = signAdminToken({ id: user.id, email: user.email });
    const { status } = await requestJson("/api/admin/projects", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(status).toBe(401);
  });

  it("refuses an admin token on a product route", async () => {
    const { status } = await requestJson("/api/projects", await adminAuth());
    expect(status).toBe(401);
  });

  it("accepts an allowlisted admin token", async () => {
    const { status } = await requestJson("/api/admin/projects", await adminAuth());
    expect(status).toBe(200);
  });
});

describe.skipIf(!dbReady)("POST /api/admin/session", () => {
  beforeEach(truncateAll);

  it("401s when there is no session", async () => {
    const { status } = await requestJson("/api/admin/session", { method: "POST" });
    expect(status).toBe(401);
  });

  it("mints a token for an allowlisted domain", async () => {
    const user = await createUser({ email: "someone@genmotion.dev" });
    const { orgId } = await createOrg({ ownerId: user.id });
    const session = await createSession(user.id, orgId);

    const { status, body } = await requestJson<{ token: string; user: { email: string } }>(
      "/api/admin/session",
      { method: "POST", as: session },
    );
    expect(status).toBe(200);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe("someone@genmotion.dev");
  });

  it("403s a signed-in user off the allowlist, echoing the email back", async () => {
    const user = await createUser({ email: "personal@gmail.com" });
    const { orgId } = await createOrg({ ownerId: user.id });
    const session = await createSession(user.id, orgId);

    const { status, body } = await requestJson<{ error: string; email: string }>(
      "/api/admin/session",
      { method: "POST", as: session },
    );
    expect(status).toBe(403);
    // The console renders this so the wrong-Google-account case is self-evident.
    expect(body.email).toBe("personal@gmail.com");
  });
});

describe.skipIf(!dbReady)("GET /api/admin/organizations", () => {
  beforeEach(truncateAll);

  it("reports the effective plan, not the raw subscription row", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "active" });

    const { body } = await requestJson<{ items: Array<{ planName: string }> }>(
      "/api/admin/organizations",
      await adminAuth(),
    );
    expect(body.items[0]!.planName).toBe("Pro");
  });

  it("falls back to Free once a paid subscription expires", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, { plan: "pro", status: "expired" });

    const { body } = await requestJson<{ items: Array<{ planName: string }> }>(
      "/api/admin/organizations",
      await adminAuth(),
    );
    expect(body.items[0]!.planName).toBe("Free");
  });

  it("keeps a cancelled plan for the rest of the paid period", async () => {
    const { orgId } = await createOrg();
    await setSubscription(orgId, {
      plan: "team",
      status: "cancelled",
      currentPeriodEnd: new Date(Date.now() + 10 * DAY),
    });

    const { body } = await requestJson<{ items: Array<{ planName: string }> }>(
      "/api/admin/organizations",
      await adminAuth(),
    );
    expect(body.items[0]!.planName).toBe("Team");
  });

  it("attributes the org to its owner, not its earliest member", async () => {
    const { orgId, ownerId } = await createOrg();
    // A member who joined *before* the owner row — creator must still be owner.
    const early = await addMember(orgId, "member");
    await db
      .update(schema.member)
      .set({ createdAt: new Date(Date.now() - 30 * DAY) })
      .where(
        and(
          eq(schema.member.organizationId, orgId),
          eq(schema.member.userId, early),
        ),
      );

    const { body } = await requestJson<{
      items: Array<{ createdBy: { id: string } | null; memberCount: number }>;
    }>("/api/admin/organizations", await adminAuth());

    expect(body.items[0]!.createdBy?.id).toBe(ownerId);
    expect(body.items[0]!.memberCount).toBe(2);
  });
});

describe.skipIf(!dbReady)("GET /api/admin/users", () => {
  beforeEach(truncateAll);

  it("shows the oldest membership as the primary org", async () => {
    const user = await createUser();
    const first = await createOrg({ ownerId: user.id, name: "Personal" });
    const second = await createOrg({ name: "Acme" });
    await addMember(second.orgId, "member", user.id);
    await setSubscription(second.orgId, { plan: "pro", status: "active" });

    const { body } = await requestJson<{
      items: Array<{ id: string; org: { name: string; planName: string } | null }>;
    }>("/api/admin/users", await adminAuth());

    const row = body.items.find((u) => u.id === user.id)!;
    expect(row.org?.name).toBe("Personal");
    expect(row.org?.planName).toBe("Free");
    expect(first.orgId).toBeTruthy();
  });

  it("returns users newest first", async () => {
    const older = await createUser({ name: "Older" });
    await db
      .update(schema.user)
      .set({ createdAt: new Date(Date.now() - 5 * DAY) })
      .where(eq(schema.user.id, older.id));
    const newer = await createUser({ name: "Newer" });

    const { body } = await requestJson<{ items: Array<{ id: string }> }>(
      "/api/admin/users",
      await adminAuth(),
    );
    const ids = body.items.map((u) => u.id);
    // Compare positions rather than the head: adminAuth() mints its own user,
    // which is itself the newest row.
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  });
});

describe.skipIf(!dbReady)("GET /api/admin/projects", () => {
  beforeEach(truncateAll);

  it("derives duration from scenes and the project's fps", async () => {
    const { orgId, ownerId } = await createOrg();
    const project = await createProject(orgId, { userId: ownerId });
    await db.insert(schema.scenes).values([
      { projectId: project.id, name: "a", code: "//", durationInFrames: 60, order: 0 },
      { projectId: project.id, name: "b", code: "//", durationInFrames: 30, order: 1 },
    ]);

    const { body } = await requestJson<{
      items: Array<{ durationSeconds: number; sceneCount: number }>;
    }>("/api/admin/projects", await adminAuth());

    // 90 frames at the default 30fps.
    expect(body.items[0]!.durationSeconds).toBe(3);
    expect(body.items[0]!.sceneCount).toBe(2);
  });

  it("counts messages and only finished exports", async () => {
    const { orgId, ownerId } = await createOrg();
    const project = await createProject(orgId, { userId: ownerId });
    await createChatMessage(project.id, { role: "user" });
    await createChatMessage(project.id, { role: "assistant" });
    await createExportJob(project.id, { userId: ownerId, status: "done" });
    await createExportJob(project.id, { userId: ownerId, status: "failed" });
    await createExportJob(project.id, { userId: ownerId, status: "queued" });

    const { body } = await requestJson<{
      items: Array<{ messageCount: number; exportCount: number }>;
    }>("/api/admin/projects", await adminAuth());

    expect(body.items[0]!.messageCount).toBe(2);
    expect(body.items[0]!.exportCount).toBe(1);
  });

  it("filters by organization", async () => {
    const a = await createOrg();
    const b = await createOrg();
    await createProject(a.orgId, { userId: a.ownerId, name: "Keep" });
    await createProject(b.orgId, { userId: b.ownerId, name: "Drop" });

    const { body } = await requestJson<{ items: Array<{ name: string }> }>(
      `/api/admin/projects?organizationId=${a.orgId}`,
      await adminAuth(),
    );
    expect(body.items.map((p) => p.name)).toEqual(["Keep"]);
  });
});

describe.skipIf(!dbReady)("admin detail endpoints", () => {
  beforeEach(truncateAll);

  it("returns every export attempt for a project", async () => {
    const { orgId, ownerId } = await createOrg();
    const project = await createProject(orgId, { userId: ownerId });
    await createExportJob(project.id, { userId: ownerId, status: "done" });
    await createExportJob(project.id, { userId: ownerId, status: "failed" });

    const { status, body } = await requestJson<{
      exports: Array<{ status: string; url: string | null }>;
      organization: { name: string } | null;
    }>(`/api/admin/projects/${project.id}`, await adminAuth());

    expect(status).toBe(200);
    expect(body.exports).toHaveLength(2);
    // No asset row was written, so there is nothing to play yet.
    expect(body.exports.every((e) => e.url === null)).toBe(true);
    expect(body.organization?.name).toBe("Test Org");
  });

  it("lists every organization a user belongs to", async () => {
    const user = await createUser();
    await createOrg({ ownerId: user.id, name: "Personal" });
    const other = await createOrg({ name: "Acme" });
    await addMember(other.orgId, "admin", user.id);

    const { body } = await requestJson<{
      organizations: Array<{ name: string; role: string }>;
    }>(`/api/admin/users/${user.id}`, await adminAuth());

    expect(body.organizations).toHaveLength(2);
    expect(body.organizations.map((o) => o.role)).toEqual(["owner", "admin"]);
  });

  it("returns the member list and subscription for an org", async () => {
    const { orgId, ownerId } = await createOrg();
    await addMember(orgId, "member");
    await setSubscription(orgId, { plan: "team", status: "active", seats: 10 });

    const { body } = await requestJson<{
      members: Array<{ id: string; role: string }>;
      planName: string;
      subscription: { status: string; paid: boolean };
      createdBy: { id: string } | null;
    }>(`/api/admin/organizations/${orgId}`, await adminAuth());

    expect(body.members).toHaveLength(2);
    expect(body.planName).toBe("Team");
    expect(body.subscription.paid).toBe(true);
    expect(body.createdBy?.id).toBe(ownerId);
  });

  it("404s on unknown ids", async () => {
    const auth = await adminAuth();
    expect((await requestJson("/api/admin/users/nope", auth)).status).toBe(404);
    expect((await requestJson("/api/admin/organizations/nope", auth)).status).toBe(404);
  });
});
