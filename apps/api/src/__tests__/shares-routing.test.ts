import { describe, expect, it } from "vitest";
import { shareRoutes, slugify } from "../routes/shares";

/**
 * Which share routes need a session, and which do not.
 *
 * `shares.ts` makes its public half anonymous by declaring those routes
 * *before* `shareRoutes.use(requireAuth)`. That is real Hono behaviour — a
 * handler registered earlier answers without the later middleware ever running
 * — but it is positional, which means moving a route up or down the file
 * silently changes whether it is protected.
 *
 * So it is pinned here. A public route that starts demanding a session breaks
 * every `<video>` tag and link preview; a private one that stops demanding one
 * is a data leak.
 */

const anonymous = (path: string) => shareRoutes.request(path);

describe("public share routes stay anonymous", () => {
  // A slug that cannot exist, so these reach the handler and answer 404 rather
  // than 401. Any 401 here means the middleware has started applying to them.
  for (const path of [
    "/s/definitely-not-a-real-slug",
    "/s/definitely-not-a-real-slug/video",
    "/s/definitely-not-a-real-slug/poster",
    "/s/definitely-not-a-real-slug/download",
  ]) {
    it(`${path} does not ask for a session`, async () => {
      const res = await anonymous(path);
      expect(res.status).not.toBe(401);
    });
  }
});

describe("everything else needs one", () => {
  it("refuses to list without a session", async () => {
    expect((await anonymous("/")).status).toBe(401);
  });

  it("refuses to create without a session", async () => {
    const res = await shareRoutes.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "x", videoBytes: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it("refuses to delete without a session", async () => {
    const res = await shareRoutes.request("/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });
});

describe("slugify", () => {
  it("makes a readable URL segment", () => {
    expect(slugify("Samsung Pay Launch")).toBe("samsung-pay-launch");
  });

  it("folds accents rather than dropping the word", () => {
    expect(slugify("Café Montage")).toBe("cafe-montage");
  });

  it("never returns empty, whatever the title", () => {
    // A slug is half of a permanent public URL. A title of only emoji or only
    // punctuation still has to produce a link rather than `/v/-<id>`.
    for (const title of ["🎬🎬🎬", "!!!", "   ", "———"]) {
      expect(slugify(title)).toBe("video");
    }
  });

  it("does not leave a trailing dash before the id is appended", () => {
    // The suffix is joined with "-", so a slug ending in one would read
    // "title--abc123".
    expect(slugify("A very long title that will certainly be cut somewhere here")).not.toMatch(
      /-$/,
    );
    expect(slugify("trailing punctuation!!!")).toBe("trailing-punctuation");
  });

  it("stays within a sane length", () => {
    expect(slugify("x".repeat(200)).length).toBeLessThanOrEqual(60);
  });
});
