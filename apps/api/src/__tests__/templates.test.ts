import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

// Analytics is inert without a key; capture the calls instead of sending them.
const tracked = vi.hoisted(() => [] as { event: string; distinctId: string; properties?: Record<string, unknown> }[]);
vi.mock("../analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../analytics")>()),
  trackServer: (event: string, input: { distinctId: string; properties?: Record<string, unknown> }) =>
    tracked.push({ event, ...input }),
}));

const intents = vi.hoisted(() => [] as { templateId: string; option: string; user?: unknown }[]);
vi.mock("../slack", () => ({
  notifyRemixIntent: (opts: { templateId: string; option: string; user?: unknown }) => intents.push(opts),
}));

import { remixClient, resetRemixIntentThrottle, templateRoutes } from "../routes/templates";
import { anonymousDistinctId } from "../analytics";

/**
 * The starter template routes.
 *
 * They read the catalog that ships in the image, so these run against the real
 * templates rather than a fixture — which is the point: a template that stops
 * bundling should fail here as well as in the package's own catalog test.
 */
const app = new Hono().route("/api/templates", templateRoutes);
const get = (path: string, init?: RequestInit) =>
  app.fetch(new Request(`http://api.test${path}`, init));

async function firstId(): Promise<string> {
  const body = (await (await get("/api/templates")).json()) as {
    templates: { id: string }[];
  };
  return body.templates[0]!.id;
}

describe("GET /api/templates", () => {
  it("lists the catalog with what a card needs", async () => {
    const res = await get("/api/templates");
    expect(res.status).toBe(200);

    const { templates } = (await res.json()) as { templates: Record<string, unknown>[] };
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) {
      expect(template).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        width: expect.any(Number),
        height: expect.any(Number),
        fps: expect.any(Number),
        durationInFrames: expect.any(Number),
        revision: expect.any(String),
      });
      // A path, not a URL — the client joins it onto whichever API base it
      // reached us on, which is what keeps the desktop app same-origin.
      expect(template.posterPath).toBe(`/api/templates/${template.id}/poster`);
      expect(template.videoPath).toBe(`/api/templates/${template.id}/video`);
    }
  });

  it("pages with a cursor, in the same order as an unpaged fetch", async () => {
    // Explicitly everything: the default page is 12, and the catalog is past that.
    const whole = (await (await get("/api/templates?limit=1000")).json()) as {
      templates: { id: string }[];
    };
    expect(whole.templates.length).toBeGreaterThan(1);

    const paged: { id: string }[] = [];
    let cursor: string | null = null;
    do {
      const res: Response = await get(
        `/api/templates?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { templates: { id: string }[]; nextCursor: string | null };
      expect(body.templates.length).toBe(1);
      paged.push(...body.templates);
      cursor = body.nextCursor;
    } while (cursor);

    expect(paged.map((t) => t.id)).toEqual(whole.templates.map((t) => t.id));
  });

  it("returns only featured templates for ?featured=true", async () => {
    const all = (await (await get("/api/templates?limit=1000")).json()) as {
      templates: { id: string; featured: boolean }[];
    };
    const res = await get("/api/templates?featured=true&limit=1000");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { templates: { id: string; featured: boolean }[] };

    expect(body.templates.length).toBeGreaterThan(0);
    expect(body.templates.every((t) => t.featured)).toBe(true);
    expect(body.templates.map((t) => t.id)).toEqual(
      all.templates.filter((t) => t.featured).map((t) => t.id),
    );
  });

  it("lists everything when featured is absent or anything but true", async () => {
    const whole = (await (await get("/api/templates?limit=1000")).json()) as {
      templates: { id: string }[];
    };
    for (const qs of ["", "&featured=false", "&featured=maybe"]) {
      const body = (await (await get(`/api/templates?limit=1000${qs}`)).json()) as {
        templates: { id: string }[];
      };
      expect(body.templates.map((t) => t.id)).toEqual(whole.templates.map((t) => t.id));
    }
  });

  it("has no next page once every template is exhausted", async () => {
    const res = await get("/api/templates?limit=1000");
    const body = (await res.json()) as { nextCursor: string | null };
    expect(body.nextCursor).toBeNull();
  });

  it("restarts from the top on a cursor it doesn't recognize", async () => {
    const res = await get("/api/templates?cursor=not-a-real-cursor");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { templates: { id: string }[] };
    expect(body.templates.length).toBeGreaterThan(0);
  });
});

describe("GET /api/templates/:id", () => {
  it("returns the same card data the list gives, for one template", async () => {
    const id = await firstId();
    const res = await get(`/api/templates/${id}`);
    expect(res.status).toBe(200);

    // No `scenes`/`assetBasePath` here — nothing plays a bundle anymore, so
    // this is summary-shaped, not the heavier detail it used to be.
    const summary = (await res.json()) as Record<string, unknown>;
    expect(summary).toMatchObject({
      id,
      title: expect.any(String),
      posterPath: `/api/templates/${id}/poster`,
      videoPath: `/api/templates/${id}/video`,
    });
    expect(summary.scenes).toBeUndefined();
  });

  it("answers a matching If-None-Match with 304", async () => {
    const id = await firstId();
    const etag = (await get(`/api/templates/${id}`)).headers.get("etag");
    expect(etag).toBeTruthy();

    const again = await get(`/api/templates/${id}`, { headers: { "if-none-match": etag! } });
    expect(again.status).toBe(304);
  });

  it("404s an unknown template", async () => {
    expect((await get("/api/templates/no-such-template")).status).toBe(404);
  });

  it("404s an id that tries to escape the catalog", async () => {
    for (const id of ["..", "..%2f..%2fetc", "%2e%2e%2fpasswd"]) {
      expect((await get(`/api/templates/${id}`)).status).toBe(404);
    }
  });
});

describe("GET /api/templates/:id/files", () => {
  it("returns a bundle with no scaffold-owned file in it", async () => {
    const res = await get(`/api/templates/${await firstId()}/files`);
    expect(res.status).toBe(200);

    const bundle = (await res.json()) as {
      manifest: { name: string; scenes: { file: string }[] };
      files: { path: string; encoding: string; contents: string }[];
      totalBytes: number;
    };
    expect(bundle.manifest.scenes.length).toBeGreaterThan(0);
    expect(bundle.totalBytes).toBeGreaterThan(0);

    const paths = bundle.files.map((f) => f.path);
    // `createProject` writes these fresh on every remix.
    for (const owned of ["project.json", "package.json", "tsconfig.json", "template.json"]) {
      expect(paths).not.toContain(owned);
    }
    expect(paths.some((p) => p.startsWith("scenes/"))).toBe(true);
    // Every scene the manifest lists has to be in the bundle, or the remixed
    // project opens with holes in its timeline.
    for (const scene of bundle.manifest.scenes) expect(paths).toContain(scene.file);
  });
  it("counts the remix, anonymously, with who fetched it", async () => {
    tracked.length = 0;
    const id = await firstId();
    const headers = { "X-GenMotion-Client": "cli/0.3.0", "X-Forwarded-For": "203.0.113.7, 10.0.0.1", "User-Agent": "genmotion-cli/0.3.0" };
    expect((await get(`/api/templates/${id}/files`, { headers })).status).toBe(200);
    expect(tracked).toHaveLength(1);
    expect(tracked[0]).toMatchObject({
      event: "template_remix_fetched",
      distinctId: expect.stringMatching(/^anon_[0-9a-f]{32}$/),
      properties: {
        template_id: id,
        client: "cli",
        client_version: "0.3.0",
        $process_person_profile: false,
        $ip: "203.0.113.7",
        file_count: expect.any(Number),
        total_bytes: expect.any(Number),
      },
    });
    // Nothing is counted for a template that doesn't exist.
    await get("/api/templates/no-such-template/files", { headers });
    expect(tracked).toHaveLength(1);
  });
});

describe("remixClient / anonymousDistinctId", () => {
  it("names the client from its header, then its user agent", () => {
    expect(remixClient(new Headers({ "x-genmotion-client": "desktop/0.0.30" }))).toEqual({ name: "desktop", version: "0.0.30" });
    expect(remixClient(new Headers({ "x-genmotion-client": "evil/1" }))).toEqual({ name: "other", version: "1" });
    expect(remixClient(new Headers({ "user-agent": "genmotion-cli" }))).toEqual({ name: "cli" });
    expect(remixClient(new Headers({ "user-agent": "Mozilla/5.0" }))).toEqual({ name: "browser" });
    expect(remixClient(new Headers())).toEqual({ name: "other" });
  });

  it("is stable within a day and changes the next", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7", "user-agent": "x" });
    const day = new Date("2026-10-01T09:00:00Z");
    expect(anonymousDistinctId(h, day)).toBe(anonymousDistinctId(h, new Date("2026-10-01T23:00:00Z")));
    expect(anonymousDistinctId(h, day)).not.toBe(anonymousDistinctId(h, new Date("2026-10-02T01:00:00Z")));
  });
});

describe("GET /api/templates/:id/poster", () => {
  it("serves the card image", async () => {
    const res = await get(`/api/templates/${await firstId()}/poster`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(2048);
  });
});

describe("GET /api/templates/:id/video", () => {
  it("404s a template that hasn't been rendered (or when storage isn't reachable)", async () => {
    // Rendering is a separate, manual step (`render-video.mjs`) — this suite
    // has no MinIO/R2 of its own, and the route's own catch-all treats "can't
    // reach the store" the same as "nothing there", same as `files.ts` does.
    const res = await get(`/api/templates/${await firstId()}/video`);
    expect(res.status).toBe(404);
  });

  it("404s an unknown template before ever touching storage", async () => {
    expect((await get("/api/templates/no-such-template/video")).status).toBe(404);
  });
});

describe("GET /api/templates/:id/assets/*", () => {
  it("refuses a path that climbs out of the template", async () => {
    const id = await firstId();
    for (const tail of [
      "../project.json",
      "../../../etc/passwd",
      "..%2f..%2fproject.json",
      "%2e%2e%2f%2e%2e%2fpackage.json",
    ]) {
      expect((await get(`/api/templates/${id}/assets/${tail}`)).status, tail).toBe(404);
    }
  });

  it("404s an asset that isn't there", async () => {
    expect((await get(`/api/templates/${await firstId()}/assets/nope.png`)).status).toBe(404);
  });
});

describe("POST /api/templates/:id/remix-intent", () => {
  const post = (id: string, body: unknown, ip = "198.51.100.4") =>
    get(`/api/templates/${id}/remix-intent`, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "text/plain", "X-Forwarded-For": ip },
    });

  it("posts a known option on a known template to Slack, once per visitor per window", async () => {
    resetRemixIntentThrottle();
    intents.length = 0;
    const id = await firstId();
    expect((await post(id, { option: "agent_prompt" })).status).toBe(204);
    expect(intents).toEqual([expect.objectContaining({ templateId: id, option: "agent_prompt", user: null })]);
    // The same visitor clicking again is the same decision.
    expect((await post(id, { option: "agent_prompt" })).status).toBe(204);
    expect(intents).toHaveLength(1);
    // A different option, or a different visitor, is news.
    await post(id, { option: "cli_command" });
    await post(id, { option: "agent_prompt" }, "198.51.100.5");
    expect(intents).toHaveLength(3);
  });

  it("refuses anything it can't name: unknown templates, unknown options, junk bodies", async () => {
    resetRemixIntentThrottle();
    intents.length = 0;
    const id = await firstId();
    expect((await post("no-such-template", { option: "download" })).status).toBe(404);
    expect((await post(id, { option: "<!channel>" })).status).toBe(400);
    expect((await post(id, "not json")).status).toBe(400);
    expect(intents).toHaveLength(0);
  });
});
