import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

/**
 * The template routes with a CDN configured.
 *
 * Its own file because the setting is read once, at module load, by both the
 * route and `toSummary` — there is no per-test way to turn it on, and the
 * sibling suite's whole point is the behaviour with it off.
 */
vi.hoisted(() => {
  process.env.TEMPLATES_CDN_URL = "https://cdn.test.invalid/";
});

vi.mock("../analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../analytics")>()),
  trackServer: () => {},
}));
vi.mock("../slack", () => ({ notifyRemixIntent: () => {} }));

// Reaching the store at all would be the bug: with a CDN the API's job is to
// point somewhere else, not to move bytes.
vi.mock("@genmotion/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@genmotion/storage")>()),
  getObject: async () => {
    throw new Error("the store must not be touched when a CDN is configured");
  },
}));

import { templateRoutes } from "../routes/templates";

const app = new Hono().route("/api/templates", templateRoutes);
// Nothing follows the redirect here, which is the point — the 302 itself is
// what these assert on.
const get = (path: string, init?: RequestInit) =>
  app.fetch(new Request(`http://api.test${path}`, init));

async function firstTemplate(): Promise<{ id: string; revision: string; videoUrl: string }> {
  const body = (await (await get("/api/templates")).json()) as {
    templates: { id: string; revision: string; videoUrl: string }[];
  };
  return body.templates[0]!;
}

describe("templates with TEMPLATES_CDN_URL set", () => {
  it("puts an absolute, cache-busted CDN url on every summary", async () => {
    const t = await firstTemplate();
    expect(t.videoUrl).toBe(`https://cdn.test.invalid/templates/${t.id}/video.mp4?v=${t.revision}`);
  });

  it("redirects the video route to the CDN instead of streaming", async () => {
    const t = await firstTemplate();
    const res = await get(`/api/templates/${t.id}/video`);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      `https://cdn.test.invalid/templates/${t.id}/video.mp4?v=${t.revision}`,
    );
  });

  it("holds the redirect itself for a year when the url is revision-pinned", async () => {
    // The 302 is the only thing this process serves per play, so it is worth
    // caching — and `?v=` makes the target safe to pin.
    const t = await firstTemplate();
    const res = await get(`/api/templates/${t.id}/video?v=${t.revision}`);
    expect(res.headers.get("cache-control")).toContain("immutable");
  });

  it("still 404s a template that does not exist, without redirecting anywhere", async () => {
    const res = await get("/api/templates/no-such-template/video");
    expect(res.status).toBe(404);
  });

  it("still 404s a preview that has never been rendered", async () => {
    // A CDN does not make an object exist. Redirecting here would hand the
    // browser a url that 404s off the edge, with no way back to the full file.
    const t = await firstTemplate();
    expect((await get(`/api/templates/${t.id}/preview`)).status).toBe(404);
  });
});
