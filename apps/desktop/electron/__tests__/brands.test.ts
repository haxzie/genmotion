import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The brand folder: what it writes, and what it refuses.
 *
 * Three things are worth pinning here. The containment rule, because a brand
 * folder is a hand-editable file in the user's home naming paths that the
 * agent is then handed. The generated `components/brand.ts`, because that file
 * is the whole reason the feature works at all — the system prompt has always
 * told the agent a brand re-skins from there, and nothing ever wrote it. And
 * the marker contract on both generated files, because a user's own notes and
 * an agent's own tokens have to survive the brand being edited.
 */

const home = await fs.mkdtemp(path.join(os.tmpdir(), "gm-brands-home-"));
const userData = await fs.mkdtemp(path.join(os.tmpdir(), "gm-brands-data-"));

vi.mock("electron", () => ({
  app: { getPath: (which: string) => (which === "home" ? home : userData), getVersion: () => "0.0.0-test" },
}));

const { brandDir, brandIdFor, brandsRoot } = await import("../brands/paths");
const { createBrand, readBrand, readBrandNotes, writeBrand, writeBrandNotes, listBrandIds } =
  await import("../brands/manifest");
const { syncBrandIntoProject } = await import("../brands/project-sync");
const { brandManifestSchema } = await import("@genmotion/shared");

let project: string;

beforeEach(async () => {
  await fs.rm(brandsRoot(), { recursive: true, force: true });
  await fs.rm(path.join(userData, "settings.json"), { force: true });
  project = await fs.mkdtemp(path.join(os.tmpdir(), "gm-brands-project-"));
});

describe("brand ids", () => {
  it("slugifies a name, and never collides", () => {
    expect(brandIdFor("Acme Co.", [])).toBe("acme-co");
    expect(brandIdFor("Acme Co.", ["acme-co"])).toBe("acme-co-2");
    // A name with nothing usable in it still has to produce a folder.
    expect(brandIdFor("...", [])).toBe("brand");
  });

  it("refuses an id that is not a plain slug, before it becomes a path", () => {
    // The gate is here rather than in each route, so that every `path.join`
    // downstream is safe by construction.
    for (const bad of ["../escape", "Acme", "a/b", ".hidden", ""]) {
      expect(() => brandDir(bad)).toThrow();
    }
    expect(brandDir("acme")).toBe(path.join(brandsRoot(), "acme"));
  });
});

describe("the brand manifest", () => {
  it("refuses a file path that escapes the folder", () => {
    for (const file of ["../../.ssh/id_rsa", "/etc/passwd", ".ssh/id_rsa", "logos/../../secret.svg"]) {
      const result = brandManifestSchema.safeParse({
        id: "acme",
        name: "Acme",
        logos: [{ file }],
        createdAt: 0,
        updatedAt: 0,
      });
      expect(result.success, file).toBe(false);
    }
  });

  it("accepts an ordinary one, and fills in the defaults", () => {
    const parsed = brandManifestSchema.parse({
      id: "acme",
      name: "Acme",
      logos: [{ file: "logos/mark.svg" }],
      colors: [{ hex: "#1D2BF0" }],
      createdAt: 0,
      updatedAt: 0,
    });
    expect(parsed.logos[0]).toEqual({ file: "logos/mark.svg", variant: "mark", on: "any", source: "user" });
    expect(parsed.colors[0]!.role).toBe("other");
    expect(parsed.thirdParty).toBe(false);
  });

  it("refuses a colour that is not a hex value", () => {
    for (const hex of ["rebeccapurple", "rgb(0,0,0)", "#12", "1d2bf0"]) {
      expect(brandManifestSchema.safeParse({
        id: "acme",
        name: "Acme",
        colors: [{ hex }],
        createdAt: 0,
        updatedAt: 0,
      }).success, hex).toBe(false);
    }
  });
});

describe("creating a brand", () => {
  it("scaffolds the folder, the manifest and the four drawers", async () => {
    const brand = await createBrand({ name: "Acme Co.", site: "https://acme.com" });
    expect(brand.id).toBe("acme-co");
    expect(await listBrandIds()).toEqual(["acme-co"]);
    for (const sub of ["logos", "fonts", "references", "assets"]) {
      const stat = await fs.stat(path.join(brandDir(brand.id), sub));
      expect(stat.isDirectory(), sub).toBe(true);
    }
    expect(await readBrand("acme-co")).toMatchObject({ name: "Acme Co.", site: "https://acme.com/" });
  });

  it("completes a bare domain, and drops one that is not an address at all", async () => {
    // "acme.com" is what a person types into a website field; the schema wants
    // a URL. A brand is worth having without a website, so a typo in an
    // optional field must not be what stops one being created.
    expect((await createBrand({ name: "A", site: "acme.com" })).site).toBe("https://acme.com/");
    expect((await createBrand({ name: "B", site: "  " })).site).toBeUndefined();
    expect((await createBrand({ name: "C", site: "not a url at all" })).site).toBeUndefined();
    expect((await createBrand({ name: "D", site: "file:///etc/passwd" })).site).toBeUndefined();
  });

  it("leaves no folder behind when the manifest cannot be written", async () => {
    // A directory with no manifest is skipped by `listBrandIds`, so it would
    // be invisible while still holding the name.
    await expect(createBrand({ name: "" })).rejects.toThrow();
    expect(await listBrandIds()).toEqual([]);
    expect(await fs.readdir(brandsRoot()).catch(() => [])).toEqual([]);
  });

  it("keeps the user's own notes when the identity is edited", async () => {
    const brand = await createBrand({ name: "Acme" });
    await writeBrandNotes(brand.id, "We always say teams, never users.");

    await writeBrand(brandManifestSchema.parse({ ...brand, colors: [{ hex: "#1d2bf0", role: "primary" }] }));

    const doc = await fs.readFile(path.join(brandDir(brand.id), "BRAND.md"), "utf8");
    // Regenerated above the marker...
    expect(doc).toContain("#1d2bf0");
    // ...and untouched below it.
    expect(await readBrandNotes(brand.id)).toBe("We always say teams, never users.");
  });
});

describe("syncing a brand into a project", () => {
  async function acme() {
    const brand = await createBrand({ name: "Acme" });
    await fs.writeFile(path.join(brandDir(brand.id), "logos", "mark.svg"), "<svg/>");
    return writeBrand(
      brandManifestSchema.parse({
        ...brand,
        colors: [
          { hex: "#1d2bf0", role: "primary", name: "Volt" },
          { hex: "#0a0a0b", role: "ink" },
        ],
        fonts: [{ role: "display", family: "Söhne" }],
        logos: [{ file: "logos/mark.svg", variant: "mark" }],
      }),
    );
  }

  /**
   * The generated module has to be real TypeScript, and its values have to be
   * the values.
   *
   * This is the test that earns its keep: the first version of the font
   * renderer emitted `display: "Söhne", Inter, "Helvetica Neue", …` — a
   * quoted family followed by bare identifiers — which is not an object
   * literal. Every project with a brand and a typeface would have failed to
   * build, and nothing else here would have caught it, because every other
   * assertion is `toContain` on a string. So this one loads the module.
   */
  async function loadModule(source: string): Promise<Record<string, unknown>> {
    const esbuild = await import("esbuild");
    const vm = await import("node:vm");
    const { code } = esbuild.transformSync(source, { loader: "ts", format: "cjs" });
    // Read back off `module`, not the `exports` alias: esbuild's CommonJS
    // output replaces `module.exports` wholesale.
    const module = { exports: {} as Record<string, unknown> };
    vm.runInNewContext(code, { module, exports: module.exports });
    return module.exports;
  }

  it("generates a module whose values are the brand's", async () => {
    const brand = await acme();
    // Several faces, and a family whose name needs quoting, which is where it
    // went wrong.
    await syncBrandIntoProject(
      project,
      brandManifestSchema.parse({
        ...brand,
        fonts: [
          { role: "display", family: "Söhne Breit" },
          { role: "body", family: "Inter" },
          { role: "mono", family: "JetBrains Mono" },
        ],
      }),
      "react",
    );

    const source = await fs.readFile(path.join(project, "components", "brand.ts"), "utf8");
    const mod = await loadModule(source);

    expect(mod.C).toEqual({ volt: "#1d2bf0", ink: "#0a0a0b" });
    expect(mod.FONT).toEqual({
      // One string, a complete CSS stack, with the family quoted only when it
      // needs to be.
      display: '"Söhne Breit", Inter, "Helvetica Neue", Arial, sans-serif',
      body: "Inter, Inter, \"Helvetica Neue\", Arial, sans-serif",
      mono: '"JetBrains Mono", "SF Mono", Menlo, monospace',
    });
    expect(mod.LOGO).toEqual({ mark: "../assets/brand/mark.svg" });
    expect(mod.BRAND).toEqual({ name: "Acme" });
  });

  it("generates a module that loads with no colours, fonts or logos at all", async () => {
    await syncBrandIntoProject(project, await createBrand({ name: "Bare" }), "react");
    const source = await fs.readFile(path.join(project, "components", "brand.ts"), "utf8");
    const mod = await loadModule(source);
    expect(mod.C).toEqual({});
    expect(mod.FONT).toEqual({});
    expect(mod.LOGO).toEqual({});
  });

  it("writes components/brand.ts and copies the real logo in", async () => {
    const result = await syncBrandIntoProject(project, await acme(), "react");

    expect(result.logos).toEqual(["assets/brand/mark.svg"]);
    expect(await fs.readFile(path.join(project, "assets", "brand", "mark.svg"), "utf8")).toBe("<svg/>");

    const module = await fs.readFile(path.join(project, "components", "brand.ts"), "utf8");
    // Named as the templates name them, so a forked scene needs no renaming.
    expect(module).toContain("export const C = {");
    expect(module).toContain("export const FONT = {");
    expect(module).toContain('volt: "#1d2bf0"');
    expect(module).toContain('ink: "#0a0a0b"');
    expect(module).toContain("Söhne");
    // Relative to `components/`, which is where the module sits.
    expect(module).toContain('mark: "../assets/brand/mark.svg"');
  });

  /**
   * The sync runs on every turn and every project open, and the editor watches
   * the project folder. An identical rewrite would still bump the mtime, the
   * watcher would call it a change, and the preview beside the chat would
   * reload on every single message.
   */
  it("touches nothing when nothing has changed", async () => {
    const brand = await acme();
    await syncBrandIntoProject(project, brand, "react");

    const module = path.join(project, "components", "brand.ts");
    const logo = path.join(project, "assets", "brand", "mark.svg");
    const before = await Promise.all([fs.stat(module), fs.stat(logo)]);

    await new Promise((resolve) => setTimeout(resolve, 20));
    await syncBrandIntoProject(project, brand, "react");

    const after = await Promise.all([fs.stat(module), fs.stat(logo)]);
    expect(after[0]!.mtimeMs).toBe(before[0]!.mtimeMs);
    expect(after[1]!.mtimeMs).toBe(before[1]!.mtimeMs);
  });

  it("is idempotent, and keeps tokens added below the marker", async () => {
    const brand = await acme();
    await syncBrandIntoProject(project, brand, "react");

    const file = path.join(project, "components", "brand.ts");
    await fs.appendFile(file, "\nexport const GRID = 24;\n");
    await syncBrandIntoProject(project, brand, "react");

    const module = await fs.readFile(file, "utf8");
    expect(module).toContain("export const GRID = 24;");
    // Once, not twice: a sync that appended its own block every time would
    // grow the file on every turn.
    expect(module.match(/export const C = \{/g)).toHaveLength(1);
  });

  /**
   * A remixed template's brand module is real code — SVG paths, geometry,
   * helpers — and the template is the thing the user chose. Overwriting it to
   * install a palette would throw the video away.
   */
  it("refuses to overwrite a brand module it did not write", async () => {
    await fs.mkdir(path.join(project, "components"), { recursive: true });
    const theirs = 'export const C = { bg: "#fff" };\nexport function wordmark() {}\n';
    await fs.writeFile(path.join(project, "components", "brand.ts"), theirs);

    const result = await syncBrandIntoProject(project, await acme(), "react");

    expect(result.moduleSkipped).toBe(true);
    expect(await fs.readFile(path.join(project, "components", "brand.ts"), "utf8")).toBe(theirs);
    // The logo still comes in: the agent needs the file even when it has to
    // fold the values into the template's own module by hand.
    expect(result.logos).toEqual(["assets/brand/mark.svg"]);
  });

  it("writes no module for a HyperFrames project, which has no components dir", async () => {
    const result = await syncBrandIntoProject(project, await acme(), "hyperframes");
    expect(result.logos).toEqual(["assets/brand/mark.svg"]);
    await expect(fs.stat(path.join(project, "components", "brand.ts"))).rejects.toThrow();
  });

  it("skips a logo whose file has been deleted rather than failing the sync", async () => {
    const brand = await acme();
    await fs.rm(path.join(brandDir(brand.id), "logos", "mark.svg"));

    const result = await syncBrandIntoProject(project, brand, "react");
    expect(result.logos).toEqual([]);
    const module = await fs.readFile(path.join(project, "components", "brand.ts"), "utf8");
    expect(module).toContain("No logo file in the brand yet");
  });
});

describe("attaching a brand to a project", () => {
  it("records it, resolves it, and forgets it when the brand is deleted", async () => {
    const { attachBrand, attachedBrandId } = await import("../brands/store");
    const { resolveBrand } = await import("../brands/resolve");
    const { deleteBrand } = await import("../brands/manifest");

    const brand = await createBrand({ name: "Acme" });
    await attachBrand(project, brand.id);
    expect(await attachedBrandId(project)).toBe(brand.id);
    expect((await resolveBrand(project))?.brand.name).toBe("Acme");

    // A brand whose folder is gone must not leave the agent with a read root
    // pointing at nothing on every turn from then on.
    await deleteBrand(brand.id);
    expect(await resolveBrand(project)).toBeNull();
    expect(await attachedBrandId(project)).toBeNull();
  });

  it("detaches with null", async () => {
    const { attachBrand, attachedBrandId } = await import("../brands/store");
    const brand = await createBrand({ name: "Acme" });
    await attachBrand(project, brand.id);
    await attachBrand(project, null);
    expect(await attachedBrandId(project)).toBeNull();
  });
});

/**
 * The boundary.
 *
 * A brand folder is readable by the agent and never writable, so the only way
 * a file comes out of it is this tool — and the argument is a path the model
 * chose. These are the refusals that matter: everything that is not a file in
 * one of the brand's four drawers.
 */
/**
 * Inline logos.
 *
 * The best mark a page gives up arrives as a `data:` URI rather than a link,
 * and the header is `<mime>[;param]*[;base64]`. A pattern that only tolerated
 * `;base64` rejected Firecrawl's `data:image/svg+xml;utf8,…` outright, which
 * silently dropped every inline logo while the import still looked like it
 * had worked.
 */
describe("decodeDataUri", () => {
  it("reads a percent-encoded SVG with a charset parameter", async () => {
    const { decodeDataUri } = await import("../brands/import");
    const result = decodeDataUri("data:image/svg+xml;utf8,%3Csvg%3E%3C%2Fsvg%3E");
    expect(result?.ext).toBe(".svg");
    expect(result?.body.toString("utf8")).toBe("<svg></svg>");
  });

  it("reads base64, and a bare payload with no parameters", async () => {
    const { decodeDataUri } = await import("../brands/import");
    const base64 = decodeDataUri(`data:image/png;base64,${Buffer.from("png!").toString("base64")}`);
    expect(base64?.ext).toBe(".png");
    expect(base64?.body.toString("utf8")).toBe("png!");

    const bare = decodeDataUri("data:image/svg+xml,<svg></svg>");
    expect(bare?.body.toString("utf8")).toBe("<svg></svg>");
  });

  it("refuses a type that is not an image we can import, and an empty payload", async () => {
    const { decodeDataUri } = await import("../brands/import");
    expect(decodeDataUri("data:text/html;utf8,%3Cscript%3E")).toBeNull();
    expect(decodeDataUri("data:application/pdf;base64,AAAA")).toBeNull();
    expect(decodeDataUri("data:image/svg+xml;utf8,")).toBeNull();
    expect(decodeDataUri("not-a-data-uri")).toBeNull();
  });
});

describe("use_brand_asset", () => {
  it("copies a file into the project's assets/brand/", async () => {
    const { attachBrand } = await import("../brands/store");
    const { useBrandAsset } = await import("../brands/overview");

    const brand = await createBrand({ name: "Acme" });
    await fs.writeFile(path.join(brandDir(brand.id), "references", "poster.png"), "png");
    await attachBrand(project, brand.id);

    const saved = await useBrandAsset(project, "references/poster.png");
    expect(saved).toBe("assets/brand/poster.png");
    expect(await fs.readFile(path.join(project, saved), "utf8")).toBe("png");

    // A second copy of the same file does not overwrite the first.
    expect(await useBrandAsset(project, "references/poster.png")).toBe("assets/brand/poster-2.png");
  });

  it("refuses anything that is not a file in one of the brand's folders", async () => {
    const { attachBrand } = await import("../brands/store");
    const { useBrandAsset } = await import("../brands/overview");

    const brand = await createBrand({ name: "Acme" });
    await attachBrand(project, brand.id);
    // A secret next to the brand folder, which is the thing a `..` is for.
    await fs.writeFile(path.join(brandsRoot(), "secret.txt"), "no");

    for (const bad of [
      "../secret.txt",
      "logos/../../secret.txt",
      "/etc/passwd",
      // The brand's own record: readable through the prompt and the overview,
      // never servable or copyable through the file routes.
      "brand.json",
      "BRAND.md",
      // A folder the brand does not have.
      "skills/evil/SKILL.md",
    ]) {
      await expect(useBrandAsset(project, bad), bad).rejects.toThrow();
    }
  });

  it("says so plainly when no brand is attached", async () => {
    const { useBrandAsset } = await import("../brands/overview");
    await expect(useBrandAsset(project, "logos/mark.svg")).rejects.toThrow(/No brand is attached/);
  });
});
