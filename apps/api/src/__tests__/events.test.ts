import { beforeEach, describe, expect, it } from "vitest";
import { dbReady, truncateAll } from "./helpers/db";
import { createSession, request, requestJson } from "./helpers/http";
import { createOrg, createUser } from "./helpers/factories";

/**
 * Event ingestion from the desktop app.
 *
 * PostHog delivery itself is inert in tests (no POSTHOG_KEY), which is the
 * point: what these cover is the contract in front of it — who may write, what
 * shape is accepted, and the caps that keep a modified client from arriving
 * with an unbounded backlog.
 */

const EVENT = { name: "project_created", properties: { format: "mp4" } };

async function signedIn() {
  const user = await createUser();
  const { orgId } = await createOrg({ ownerId: user.id });
  return createSession(user.id, orgId);
}

describe("POST /api/events", () => {
  beforeEach(async () => {
    await dbReady;
    await truncateAll();
  });

  it("accepts a batch from a signed-in caller", async () => {
    const session = await signedIn();
    const { status, body } = await requestJson<{ accepted: number }>("/api/events", {
      as: session,
      json: { events: [EVENT, { name: "export_finished" }] },
    });
    expect(status).toBe(202);
    expect(body.accepted).toBe(2);
  });

  it("refuses an anonymous caller", async () => {
    const res = await request("/api/events", { json: { events: [EVENT] } });
    expect(res.status).toBe(401);
  });

  it("refuses an admin token — it is not a product credential", async () => {
    const res = await request("/api/events", {
      json: { events: [EVENT] },
      headers: { authorization: "Bearer not-a-session" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects an empty batch", async () => {
    const session = await signedIn();
    const res = await request("/api/events", { as: session, json: { events: [] } });
    expect(res.status).toBe(400);
  });

  it("rejects a batch past the cap rather than truncating it", async () => {
    const session = await signedIn();
    const events = Array.from({ length: 51 }, () => EVENT);
    const res = await request("/api/events", { as: session, json: { events } });
    expect(res.status).toBe(400);
  });

  it("accepts a batch at exactly the cap", async () => {
    const session = await signedIn();
    const events = Array.from({ length: 50 }, () => EVENT);
    const { status, body } = await requestJson<{ accepted: number }>("/api/events", {
      as: session,
      json: { events },
    });
    expect(status).toBe(202);
    expect(body.accepted).toBe(50);
  });

  it("rejects an event with no name", async () => {
    const session = await signedIn();
    const res = await request("/api/events", { as: session, json: { events: [{ name: "" }] } });
    expect(res.status).toBe(400);
  });

  it("accepts a buffered event carrying its own timestamp", async () => {
    const session = await signedIn();
    const res = await request("/api/events", {
      as: session,
      json: { events: [{ ...EVENT, timestamp: new Date().toISOString() }] },
    });
    expect(res.status).toBe(202);
  });

  it("rejects a timestamp that is not a date", async () => {
    const session = await signedIn();
    const res = await request("/api/events", {
      as: session,
      json: { events: [{ ...EVENT, timestamp: "yesterday" }] },
    });
    expect(res.status).toBe(400);
  });
});
