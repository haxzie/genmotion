import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dbReady, truncateAll } from "./helpers/db";
import { createOrg, createUser } from "./helpers/factories";
import { createSession, request, requestJson } from "./helpers/http";

/**
 * The route in front of the X resolver.
 *
 * The resolver itself is asserted in `@genmotion/shared`, where it lives. What
 * is covered here is what the route adds: a session in front of it, an input
 * length it refuses to parse at all, and an hourly allowance per organization.
 * The upstream is stubbed throughout, so no test reaches X.
 */

const VIDEO_PAYLOAD = {
  __typename: "Tweet",
  id_str: "1988283207138324487",
  text: "a post with a video in it",
  user: { name: "Someone", screen_name: "someone" },
  mediaDetails: [
    {
      type: "video",
      media_url_https: "https://pbs.twimg.com/amplify_video_thumb/1/img/poster.jpg",
      video_info: {
        duration_millis: 106_333,
        aspect_ratio: [16, 9],
        variants: [
          { content_type: "application/x-mpegURL", url: "https://video.twimg.com/a/pl/x.m3u8" },
          {
            content_type: "video/mp4",
            bitrate: 832_000,
            url: "https://video.twimg.com/amplify_video/1/vid/avc1/640x360/b.mp4",
          },
          {
            content_type: "video/mp4",
            bitrate: 10_368_000,
            url: "https://video.twimg.com/amplify_video/1/vid/avc1/1920x1080/a.mp4",
          },
        ],
      },
    },
  ],
};

/** Stubs the upstream, and records every URL the code under test asked for. */
function stubSyndication(body: unknown, status = 200): { fetched: string[] } {
  const fetched: string[] = [];

  vi.spyOn(globalThis, "fetch").mockImplementation((async (input: RequestInfo | URL) => {
    fetched.push(String(input));
    return new Response(status === 200 ? JSON.stringify(body) : "<!DOCTYPE html>", {
      status,
      headers: { "content-type": status === 200 ? "application/json" : "text/html" },
    });
  }) as typeof fetch);

  return { fetched };
}

describe.skipIf(!dbReady)("the route", () => {
  beforeEach(truncateAll);
  afterEach(() => vi.restoreAllMocks());

  async function signedIn() {
    const owner = await createUser();
    const { orgId } = await createOrg({ ownerId: owner.id });
    return createSession(owner.id, orgId);
  }

  it("needs a session", async () => {
    const { fetched } = stubSyndication(VIDEO_PAYLOAD);
    const res = await request("/api/x-video?url=https://x.com/someone/status/20");

    expect(res.status).toBe(401);
    // Unauthenticated callers never reach the upstream — the middleware is
    // first, so there is no way to spend our egress without an account.
    expect(fetched).toHaveLength(0);
  });

  it("answers the post and its files", async () => {
    stubSyndication(VIDEO_PAYLOAD);
    const { status, body } = await requestJson<{
      author: { handle: string };
      media: { variants: { label: string }[] }[];
    }>("/api/x-video?url=https://x.com/someone/status/1988283207138324487", {
      as: await signedIn(),
    });

    expect(status).toBe(200);
    expect(body.author.handle).toBe("someone");
    expect(body.media).toHaveLength(1);
    expect(body.media[0]!.variants[0]!.label).toBe("1080p");
  });

  it("refuses a link that is not to X", async () => {
    const { fetched } = stubSyndication(VIDEO_PAYLOAD);
    const res = await request("/api/x-video?url=https://example.com/someone/status/20", {
      headers: { cookie: (await signedIn()).cookie },
    });

    expect(res.status).toBe(400);
    expect(fetched).toHaveLength(0);
  });

  it("refuses an absurdly long input without parsing it", async () => {
    const { fetched } = stubSyndication(VIDEO_PAYLOAD);
    const res = await request(`/api/x-video?url=${"x".repeat(600)}`, {
      headers: { cookie: (await signedIn()).cookie },
    });

    expect(res.status).toBe(400);
    expect(fetched).toHaveLength(0);
  });

  it("asks for a link when none was sent", async () => {
    expect((await request("/api/x-video", { as: await signedIn() })).status).toBe(400);
  });

  it("stops answering an org that is working through a list", async () => {
    stubSyndication(VIDEO_PAYLOAD);
    const session = await signedIn();
    const path = "/api/x-video?url=https://x.com/someone/status/20";

    // One org, through the hourly allowance. The last call is the one asserted.
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await request(path, { as: session });
    }

    expect((await request(path, { as: session })).status).toBe(429);
  });
});
