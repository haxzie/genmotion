import { beforeEach, describe, expect, it } from "vitest";
import { db, eq, schema } from "@genmotion/db";
import type { SampleList, TemplateRemixBundle } from "@genmotion/templates/types";
import { dbReady, truncateAll } from "./helpers/db";
import { createOrg, createUser } from "./helpers/factories";
import { createSession, request, requestJson } from "./helpers/http";

/**
 * The sample projects a new account is seeded with.
 *
 * What matters here is the once-per-account contract: a fresh account is
 * eligible, claiming turns that off for good, and the files themselves are
 * the real folders that ship in the image.
 */

async function signedIn() {
  const owner = await createUser();
  const { orgId } = await createOrg({ ownerId: owner.id });
  return { userId: owner.id, session: await createSession(owner.id, orgId) };
}

describe.skipIf(!dbReady)("samples", () => {
  beforeEach(truncateAll);

  it("needs a session", async () => {
    expect((await request("/api/samples")).status).toBe(401);
  });

  it("lists the three samples, eligible, for a fresh account", async () => {
    const { session } = await signedIn();
    const { status, body } = await requestJson<SampleList>("/api/samples", { as: session });
    expect(status).toBe(200);
    expect(body.eligible).toBe(true);
    expect(body.samples.map((s) => s.id)).toEqual([
      "product-showcase",
      "genmotion-grids",
      "threejs-3d-scene",
    ]);
    for (const sample of body.samples) {
      expect(sample.title).toMatch(/^Sample - /);
      expect(sample.sceneCount).toBeGreaterThan(0);
      expect(sample.revision).toMatch(/^[0-9a-f]{12}$/);
    }
  });

  it("serves a bundle the desktop can write", async () => {
    const { session } = await signedIn();
    const { status, body } = await requestJson<TemplateRemixBundle>(
      "/api/samples/genmotion-grids/files",
      { as: session },
    );
    expect(status).toBe(200);
    expect(body.title).toBe("Sample - Genmotion grids");
    expect(body.manifest.name).toBe("Sample - Genmotion grids");
    const paths = body.files.map((f) => f.path);
    expect(paths).toContain("scenes/01-intro.tsx");
    expect(paths).toContain("assets/tile-clinks.mp3");
    expect(paths).not.toContain("sample.json");
    expect(paths).not.toContain("project.json");
  });

  it("404s an unknown sample, and an id that tries to escape", async () => {
    const { session } = await signedIn();
    expect((await request("/api/samples/nope/files", { as: session })).status).toBe(404);
    expect((await request("/api/samples/..%2Fcatalog/files", { as: session })).status).toBe(404);
  });

  it("is claimed once, for good", async () => {
    const { session, userId } = await signedIn();

    const first = await requestJson<{ claimed: boolean }>("/api/samples/claim", {
      as: session,
      method: "POST",
    });
    expect(first.status).toBe(200);
    const [stamped] = await db
      .select({ samplesClaimedAt: schema.user.samplesClaimedAt })
      .from(schema.user)
      .where(eq(schema.user.id, userId));
    const samplesClaimedAt = stamped?.samplesClaimedAt;
    expect(samplesClaimedAt).toBeInstanceOf(Date);

    // A second claim keeps the first stamp — and the list now says no.
    await request("/api/samples/claim", { as: session, method: "POST" });
    const [again] = await db
      .select({ samplesClaimedAt: schema.user.samplesClaimedAt })
      .from(schema.user)
      .where(eq(schema.user.id, userId));
    expect(again!.samplesClaimedAt?.getTime()).toBe(samplesClaimedAt!.getTime());

    const { body } = await requestJson<SampleList>("/api/samples", { as: session });
    expect(body.eligible).toBe(false);
    expect(body.samples).toHaveLength(3);
  });
});
