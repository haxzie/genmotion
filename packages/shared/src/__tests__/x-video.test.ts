import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveXPost, xPostIdFrom } from "../x-video";

/**
 * The X video resolver.
 *
 * Asserted without a network. The upstream is undocumented and will change
 * shape without telling anybody, so the properties worth pinning are the ones
 * that must hold whatever it answers: that only X's own hosts are ever fetched,
 * that a playlist is never offered as a file, and that a missing field degrades
 * to a refusal rather than a throw.
 *
 * The payload below is the shape of a real response, trimmed to the fields that
 * are read.
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

  vi.spyOn(globalThis, "fetch").mockImplementation((async (input: Parameters<typeof fetch>[0]) => {
    fetched.push(String(input));
    return new Response(status === 200 ? JSON.stringify(body) : "<!DOCTYPE html>", {
      status,
      headers: { "content-type": status === 200 ? "application/json" : "text/html" },
    });
  }) as typeof fetch);

  return { fetched };
}

describe("reading the post id out of a link", () => {
  it("takes the links X hands out today", () => {
    expect(xPostIdFrom("https://x.com/someone/status/1988283207138324487")).toBe(
      "1988283207138324487",
    );
  });

  it("still takes a twitter.com link, because old ones are still in circulation", () => {
    expect(xPostIdFrom("https://twitter.com/someone/status/20")).toBe("20");
    expect(xPostIdFrom("https://mobile.twitter.com/someone/statuses/20")).toBe("20");
  });

  it("ignores the tracking parameters a share sheet appends", () => {
    expect(xPostIdFrom("https://x.com/someone/status/20?s=46&t=abc")).toBe("20");
  });

  it("takes a link pasted without its scheme", () => {
    expect(xPostIdFrom("x.com/someone/status/20")).toBe("20");
  });

  it("takes the bare id, which is what retyping from a URL produces", () => {
    expect(xPostIdFrom("  20  ")).toBe("20");
  });

  /**
   * The one that matters. Without the host check this is a fetcher for any URL
   * a caller supplies, running on our egress — so it is asserted rather than
   * left to the reader of the regex.
   */
  it("refuses a host that is not X", () => {
    expect(xPostIdFrom("https://example.com/someone/status/20")).toBeNull();
    expect(xPostIdFrom("https://x.com.evil.test/someone/status/20")).toBeNull();
    expect(xPostIdFrom("https://notx.com/status/20")).toBeNull();
  });

  it("refuses a link to something other than a post", () => {
    expect(xPostIdFrom("https://x.com/someone")).toBeNull();
    expect(xPostIdFrom("not a url at all")).toBeNull();
  });
});

describe("resolving a post", () => {
  afterEach(() => vi.restoreAllMocks());

  it("asks only X, and only for the id in the link", async () => {
    const { fetched } = stubSyndication(VIDEO_PAYLOAD);
    await resolveXPost("https://x.com/someone/status/1988283207138324487");

    expect(fetched).toHaveLength(1);
    const asked = new URL(fetched[0]!);
    expect(asked.hostname).toBe("cdn.syndication.twimg.com");
    expect(asked.searchParams.get("id")).toBe("1988283207138324487");
    // Derived from the id, so it is present without anything having been issued.
    expect(asked.searchParams.get("token")).toBeTruthy();
  });

  it("offers the files and not the playlist", async () => {
    stubSyndication(VIDEO_PAYLOAD);
    const result = await resolveXPost("https://x.com/someone/status/1988283207138324487");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const media = result.post.media[0]!;
    expect(media.variants).toHaveLength(2);
    expect(media.variants.every((variant) => variant.url.endsWith(".mp4"))).toBe(true);
  });

  it("puts the best quality first, labelled by height rather than bitrate", async () => {
    stubSyndication(VIDEO_PAYLOAD);
    const result = await resolveXPost("https://x.com/someone/status/1988283207138324487");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.post.media[0]!.variants.map((v) => v.label)).toEqual(["1080p", "360p"]);
  });

  it("every file it offers is served by X", async () => {
    stubSyndication(VIDEO_PAYLOAD);
    const result = await resolveXPost("https://x.com/someone/status/1988283207138324487");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const variant of result.post.media[0]!.variants) {
      expect(new URL(variant.url).hostname).toBe("video.twimg.com");
    }
  });

  it("calls a looping post a GIF, which is what X shows", async () => {
    stubSyndication({
      ...VIDEO_PAYLOAD,
      mediaDetails: [
        {
          type: "animated_gif",
          media_url_https: "https://pbs.twimg.com/tweet_video_thumb/x.jpg",
          video_info: {
            variants: [
              { content_type: "video/mp4", url: "https://video.twimg.com/tweet_video/320x240/x.mp4" },
            ],
          },
        },
      ],
    });

    const result = await resolveXPost("https://x.com/someone/status/20");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.post.media[0]!.kind).toBe("gif");
    expect(result.post.media[0]!.variants[0]!.label).toBe("GIF");
  });

  it("says there is no video when the post is only text", async () => {
    stubSyndication({ ...VIDEO_PAYLOAD, mediaDetails: [] });
    expect(await resolveXPost("https://x.com/someone/status/20")).toMatchObject({
      ok: false,
      reason: "no-video",
    });
  });

  it("says there is no video when the post is a photo", async () => {
    stubSyndication({ ...VIDEO_PAYLOAD, mediaDetails: [{ type: "photo" }] });
    expect(await resolveXPost("https://x.com/someone/status/20")).toMatchObject({
      ok: false,
      reason: "no-video",
    });
  });

  it("treats a tombstone as unreachable, since that is what it is", async () => {
    stubSyndication({ __typename: "TweetTombstone" });
    expect(await resolveXPost("https://x.com/someone/status/20")).toMatchObject({
      ok: false,
      reason: "not-found",
    });
  });

  it("treats a deleted or private post as unreachable", async () => {
    stubSyndication(null, 404);
    expect(await resolveXPost("https://x.com/someone/status/20")).toMatchObject({
      ok: false,
      reason: "not-found",
    });
  });

  /**
   * The upstream is undocumented, so this is the realistic failure: it keeps
   * answering 200 and stops carrying something that was read. The caller should
   * be told there is no video, not handed an exception.
   */
  it("degrades to no-video when the shape changes under it", async () => {
    stubSyndication({ __typename: "Tweet", mediaDetails: [{ type: "video" }] });
    expect(await resolveXPost("https://x.com/someone/status/20")).toMatchObject({
      ok: false,
      reason: "no-video",
    });
  });

  it("drops a variant whose URL carries no resolution to read", async () => {
    stubSyndication({
      ...VIDEO_PAYLOAD,
      mediaDetails: [
        {
          type: "video",
          video_info: {
            variants: [
              { content_type: "video/mp4", bitrate: 1, url: "https://video.twimg.com/x.mp4" },
            ],
          },
        },
      ],
    });

    expect(await resolveXPost("https://x.com/someone/status/20")).toMatchObject({
      ok: false,
      reason: "no-video",
    });
  });

  it("reports X being unreachable as upstream rather than throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    expect(await resolveXPost("https://x.com/someone/status/20")).toMatchObject({
      ok: false,
      reason: "upstream",
    });
  });
});
