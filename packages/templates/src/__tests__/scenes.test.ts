import { describe, expect, it } from "vitest";
import { listTemplates } from "../index";
import { findScenes, getScene, listScenes, readSceneSidecar } from "../scenes";
import { beatsInQuery } from "../scene-search";

const templates = await listTemplates();

describe("scene library", () => {
  // Every scene is described, and only scenes that exist: an agent handed a
  // scene id that 404s, or a new template invisible to search, is the failure.
  it.each(templates.map((t) => [t.meta.id, t] as const))("%s has a scenes.json matching its manifest", async (_id, record) => {
    const sidecar = await readSceneSidecar(record);
    expect(sidecar, "add a scenes.json (see the templates skill)").not.toBeNull();
    expect(sidecar!.scenes.map((s) => s.file).sort()).toEqual(record.manifest.scenes.map((s) => s.file).sort());
  });

  it("finds scenes by the beat a query names", async () => {
    expect(beatsInQuery("an intro for our launch")).toContain("hook");
    expect(beatsInQuery("integrations with other apps")).toContain("integrations");
    const hits = await findScenes({ query: "integrations app logos" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.slice(0, 3).some((h) => h.scene.beat === "integrations")).toBe(true);
  });

  it("filters by beat and hides filler unless asked", async () => {
    const logos = await findScenes({ beat: "logo", limit: 30, perTemplate: 30 });
    expect(logos.every((h) => h.scene.beat === "logo" || h.scene.alsoFits.includes("logo"))).toBe(true);
    expect(logos.some((h) => h.scene.quality === "filler")).toBe(false);
  });

  it("opens a scene with its code and neighbours", async () => {
    const [first] = await listScenes();
    const scene = await getScene(first!.id);
    expect(scene?.files[0]?.path).toBe(first!.file);
    expect(scene?.files.every((f) => !f.path.startsWith(".."))).toBe(true);
    expect(await getScene("../etc/passwd")).toBeNull();
    expect(await getScene("no-such-template/01-intro")).toBeNull();
  });
});
