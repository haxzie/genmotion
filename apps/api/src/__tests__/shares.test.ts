import { beforeEach, describe, expect, it } from "vitest";
import { db, eq, schema } from "@genmotion/db";
import { getObject } from "@genmotion/storage";
import { dbReady, truncateAll } from "./helpers/db";
import { createOrg, createUser } from "./helpers/factories";
import { asUser, createSession, request, requestJson } from "./helpers/http";

/**
 * Sharing a rendered video, end to end against Postgres and the object store.
 *
 * The parts worth testing here are the ones that only exist when both are
 * real: bytes uploaded on a presigned URL and then confirmed by the server,
 * range requests answered out of the store, and a withdrawal that has to stop
 * every public route at once.
 */

/** A tiny stand-in for an MP4. Nothing here parses it; it only has to be bytes. */
const VIDEO = Buffer.from("fake-mp4-bytes-".repeat(64));
const POSTER = Buffer.from("fake-jpeg-bytes");

async function signedIn() {
  const user = await createUser({ name: "Ada Lovelace", image: "https://example.test/a.jpg" });
  const { orgId } = await createOrg({ ownerId: user.id });
  const session = await createSession(user.id, orgId);
  return { user, orgId, session };
}

/** The desktop app's half: create, PUT the bytes straight to storage, complete. */
async function shareAVideo(
  session: Awaited<ReturnType<typeof signedIn>>["session"],
  overrides: Record<string, unknown> = {},
) {
  const created = await requestJson<{
    id: string;
    slug: string;
    url: string;
    uploads: { video: string; poster: string | null };
  }>("/api/shares", {
    ...asUser(session),
    json: {
      title: "Samsung Pay Launch",
      description: "A launch film.",
      videoBytes: VIDEO.byteLength,
      width: 1920,
      height: 1080,
      durationSeconds: 12.5,
      hasPoster: true,
      exportId: "exp_abc_123",
      ...overrides,
    },
  });
  expect(created.status).toBe(200);

  const put = await fetch(created.body.uploads.video, {
    method: "PUT",
    headers: { "content-type": "video/mp4" },
    body: new Uint8Array(VIDEO),
  });
  expect(put.ok).toBe(true);

  if (created.body.uploads.poster) {
    await fetch(created.body.uploads.poster, {
      method: "PUT",
      headers: { "content-type": "image/jpeg" },
      body: new Uint8Array(POSTER),
    });
  }

  const done = await requestJson<{ slug: string; url: string }>(
    `/api/shares/${created.body.id}/complete`,
    { ...asUser(session), method: "POST" },
  );
  expect(done.status).toBe(200);
  return { ...created.body, ...done.body };
}

describe.skipIf(!dbReady)("sharing a video", () => {
  beforeEach(truncateAll);

  it("uploads on a presigned URL and serves the result publicly", async () => {
    const { session, user } = await signedIn();
    const share = await shareAVideo(session);

    // The slug is readable and carries a suffix, so two videos of the same
    // name never collide.
    expect(share.slug).toMatch(/^samsung-pay-launch-[0-9a-f]{10}$/);

    // The page's JSON, with no credentials at all.
    const page = await requestJson<{
      title: string;
      author: { name: string; image: string | null };
      durationSeconds: number;
      hasPoster: boolean;
    }>(`/api/shares/s/${share.slug}`);
    expect(page.status).toBe(200);
    expect(page.body.title).toBe("Samsung Pay Launch");
    expect(page.body.author.name).toBe(user.name);
    expect(page.body.author.image).toBe("https://example.test/a.jpg");
    expect(page.body.durationSeconds).toBe(12.5);
    expect(page.body.hasPoster).toBe(true);

    // The bytes really landed, and are the ones we sent.
    const stored = await getObject(`shares/${share.id}/video.mp4`);
    expect(stored.contentLength).toBe(VIDEO.byteLength);
  });

  it("serves a byte range, which is what lets a video seek", async () => {
    const { session } = await signedIn();
    const share = await shareAVideo(session);

    const res = await request(`/api/shares/s/${share.slug}/video`, {
      headers: { range: "bytes=0-9" },
    });
    expect(res.status).toBe(206);
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-range")).toBe(`bytes 0-9/${VIDEO.byteLength}`);
    expect(Buffer.from(await res.arrayBuffer()).byteLength).toBe(10);
  });

  it("does not publish until the bytes are confirmed", async () => {
    const { session } = await signedIn();
    // Create, but never upload.
    const created = await requestJson<{ id: string; slug: string }>("/api/shares", {
      ...asUser(session),
      json: { title: "Never finished", videoBytes: 1000 },
    });

    // Nothing serves a pending share, so an abandoned upload is invisible
    // rather than a link to a broken page.
    expect((await requestJson(`/api/shares/s/${created.body.slug}`)).status).toBe(404);

    const done = await requestJson<{ error: string }>(
      `/api/shares/${created.body.id}/complete`,
      { ...asUser(session), method: "POST" },
    );
    expect(done.status).toBe(400);
  });

  it("lists the org's shares with the export they came from", async () => {
    const { session } = await signedIn();
    await shareAVideo(session);

    const list = await requestJson<{ items: { exportId: string; title: string }[] }>(
      "/api/shares",
      asUser(session),
    );
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]?.exportId).toBe("exp_abc_123");
  });

  it("keeps another org's shares out of the list", async () => {
    const mine = await signedIn();
    const theirs = await signedIn();
    await shareAVideo(theirs.session);

    const list = await requestJson<{ items: unknown[] }>("/api/shares", asUser(mine.session));
    expect(list.body.items).toHaveLength(0);
  });
});

describe.skipIf(!dbReady)("withdrawing a video", () => {
  beforeEach(truncateAll);

  it("answers 410 everywhere, keeps the row, and deletes the bytes", async () => {
    const { session } = await signedIn();
    const share = await shareAVideo(session);

    const removed = await requestJson(`/api/shares/${share.id}`, {
      ...asUser(session),
      method: "DELETE",
    });
    expect(removed.status).toBe(200);

    // Every public route, not just the page — this is the check that a new
    // route added later cannot quietly skip.
    for (const path of ["", "/video", "/poster", "/download"]) {
      const res = await request(`/api/shares/s/${share.slug}${path}`);
      expect(res.status, path || "/").toBe(410);
    }

    // The row survives as a tombstone. That is what reserves the slug for
    // good, so a link posted months ago can never resolve to someone else's
    // video.
    const [row] = await db
      .select()
      .from(schema.shares)
      .where(eq(schema.shares.slug, share.slug));
    expect(row).toBeTruthy();
    expect(row?.deletedAt).toBeTruthy();

    // The bytes are gone.
    await expect(getObject(`shares/${share.id}/video.mp4`)).rejects.toThrow();
  });

  it("is invisible to the sitemap feed once withdrawn", async () => {
    const { session } = await signedIn();
    const share = await shareAVideo(session);

    const before = await requestJson<{ items: unknown[] }>("/api/shares/public");
    expect(before.body.items).toHaveLength(1);

    await request(`/api/shares/${share.id}`, { ...asUser(session), method: "DELETE" });

    const after = await requestJson<{ items: unknown[] }>("/api/shares/public");
    expect(after.body.items).toHaveLength(0);
  });

  it("will not let another org withdraw it", async () => {
    const mine = await signedIn();
    const theirs = await signedIn();
    const share = await shareAVideo(mine.session);

    const attempt = await requestJson(`/api/shares/${share.id}`, {
      ...asUser(theirs.session),
      method: "DELETE",
    });
    expect(attempt.status).toBe(404);
    expect((await requestJson(`/api/shares/s/${share.slug}`)).status).toBe(200);
  });
});
