import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { templateRoutes } from "../routes/templates";

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
    const whole = (await (await get("/api/templates")).json()) as {
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
