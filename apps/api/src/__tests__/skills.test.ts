import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { skillsRoutes } from "../routes/skills";
import { skillCatalogBundleSchema, type SkillCatalog } from "@genmotion/shared";

/**
 * The skill pack, served over HTTP.
 *
 * The desktop app's cache refresh trusts this response byte for byte, so
 * what matters here is that the bundle actually matches the catalog it was
 * served alongside — a bundle with a different id set or a stale revision
 * would leave the cache silently wrong.
 */
const app = new Hono().route("/api/skills", skillsRoutes);
const get = (path: string) => app.fetch(new Request(`http://api.test${path}`));

describe("GET /api/skills/catalog", () => {
  it("serves the catalog, publicly, with what search needs", async () => {
    const res = await get("/api/skills/catalog");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("public");

    const body = (await res.json()) as SkillCatalog;
    expect(body.revision).toMatch(/^[0-9a-f]{8}$/);
    expect(body.entries.length).toBeGreaterThan(0);
    for (const entry of body.entries) {
      expect(entry).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        kind: expect.any(String),
        category: expect.any(String),
        source: "first-party",
      });
    }
  });
});

describe("GET /api/skills/bundle", () => {
  it("serves every skill's files, matching the catalog's revision and id set", async () => {
    const [catalogRes, bundleRes] = await Promise.all([get("/api/skills/catalog"), get("/api/skills/bundle")]);
    const catalog = (await catalogRes.json()) as SkillCatalog;
    const bundle = skillCatalogBundleSchema.parse(await bundleRes.json());

    expect(bundleRes.headers.get("cache-control")).toContain("public");
    expect(bundle.revision).toBe(catalog.revision);
    expect(bundle.skills.map((s) => s.id).sort()).toEqual(catalog.entries.map((e) => e.id).sort());

    for (const skill of bundle.skills) {
      const paths = skill.files.map((f) => f.path);
      expect(paths).toContain("SKILL.md");
      expect(paths).toContain("skill.json");
      for (const file of skill.files) {
        expect(file.path).not.toMatch(/\.\./);
        expect(file.contents.length).toBeGreaterThan(0);
      }
    }
  });
});
