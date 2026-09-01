import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Where the download button points.
 *
 * The route answers from two sources — our mirror first, GitHub second — and
 * the interesting behaviour is entirely in which one wins and what happens
 * when it doesn't answer. The module caches for ten minutes, so every case
 * imports it fresh rather than sharing a cached release between tests.
 */

const MIRROR_JSON = {
  version: "1.2.3",
  tag: "desktop-v1.2.3",
  publishedAt: "2026-09-01T14:36:49Z",
  platform: "darwin-arm64",
  filename: "GenMotion-1.2.3-arm64.dmg",
  url: "https://assets.genmotion.dev/desktop/1.2.3/GenMotion-1.2.3-arm64.dmg",
  size: 145_950_519,
  sha256: "0".repeat(64),
};

const GITHUB_JSON = {
  tag_name: "desktop-v1.0.0",
  draft: false,
  published_at: "2026-08-26T10:41:47Z",
  assets: [
    {
      name: "GenMotion-1.0.0-arm64.dmg",
      size: 137_000_000,
      browser_download_url:
        "https://github.com/haxzie/genmotion/releases/download/desktop-v1.0.0/GenMotion-1.0.0-arm64.dmg",
    },
  ],
};

/** A fresh copy of the route, so the ten-minute cache never leaks between tests. */
async function mount() {
  vi.resetModules();
  const { releaseRoutes } = await import("../routes/releases");
  const app = new Hono();
  app.route("/api/releases", releaseRoutes);
  return app;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Answer by host, so a test says what each source did rather than counting calls. */
function stubFetch(answers: { mirror?: () => Response; github?: () => Response }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("assets.genmotion.dev")) {
      if (!answers.mirror) throw new Error("mirror unreachable");
      return answers.mirror();
    }
    if (!answers.github) throw new Error("github unreachable");
    return answers.github();
  }) as typeof fetch);
}

describe("release downloads", () => {
  afterEach(() => vi.restoreAllMocks());

  it("serves the mirrored build when there is one", async () => {
    stubFetch({ mirror: () => json(MIRROR_JSON), github: () => json(GITHUB_JSON) });
    const app = await mount();

    const meta = await app.request("/api/releases/latest");
    expect(meta.status).toBe(200);
    expect(await meta.json()).toMatchObject({
      version: "1.2.3",
      filename: "GenMotion-1.2.3-arm64.dmg",
      size: MIRROR_JSON.size,
    });

    const download = await app.request("/api/releases/latest/download");
    expect(download.status).toBe(302);
    expect(download.headers.get("location")).toBe(MIRROR_JSON.url);
  });

  it("falls back to GitHub when the mirror is not there yet", async () => {
    stubFetch({
      mirror: () => new Response("not found", { status: 404 }),
      github: () => json(GITHUB_JSON),
    });
    const app = await mount();

    const download = await app.request("/api/releases/latest/download");
    expect(download.status).toBe(302);
    expect(download.headers.get("location")).toBe(
      GITHUB_JSON.assets[0]!.browser_download_url,
    );
  });

  it("falls back when the mirror answers with half a release", async () => {
    stubFetch({
      mirror: () => json({ version: "1.2.3" }),
      github: () => json(GITHUB_JSON),
    });
    const app = await mount();

    const meta = await app.request("/api/releases/latest");
    expect(await meta.json()).toMatchObject({ version: "1.0.0" });
  });

  it("says so when neither source can be reached", async () => {
    stubFetch({});
    const app = await mount();

    const meta = await app.request("/api/releases/latest");
    expect(meta.status).toBe(502);
  });
});
