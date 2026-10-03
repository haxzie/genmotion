import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterEach, expect, it } from "vitest";
import { buildRemixBundle, getTemplate, listTemplates } from "@genmotion/templates";
import { checkRemixBundle, writeRemix } from "../remix";

/**
 * The remix path against the real catalog, rather than a hand-built bundle.
 *
 * `remix.test.ts` proves the rules; this proves the rules and the catalog
 * agree — a template that ships a file the app refuses is a remix that fails
 * for the user, and nothing in `packages/templates` can see this side's
 * `SCAFFOLD_OWNED` to notice. One react template and one three template,
 * because the scaffold differs between them and the bundles are large.
 */

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-remix-catalog-"));
  dirs.push(dir);
  return path.join(dir, "project");
}

const catalog = await listTemplates();
const samples = [
  catalog.find((r) => r.manifest.engine === "three"),
  catalog.find((r) => r.manifest.engine !== "three"),
].filter((r): r is NonNullable<typeof r> => r !== undefined);

it.each(samples.map((r) => r.meta.id))("remixes %s into a project", { timeout: 60_000 }, async (id) => {
  const record = (await getTemplate(id))!;
  const bundle = checkRemixBundle(JSON.parse(JSON.stringify(await buildRemixBundle(record))));
  const dir = await tempDir();
  await writeRemix(dir, "My Copy", bundle);

  // The template's own words about this video, not the scaffold's generic
  // pair: the README is what someone lands on when the user publishes this
  // folder, and the links back to the site are the reason it is worth landing
  // on.
  const readme = await fs.readFile(path.join(dir, "README.md"), "utf8");
  expect(readme).toBe(await fs.readFile(path.join(record.dir, "README.md"), "utf8"));
  expect(readme).toContain(`https://genmotion.dev/templates/${id}`);
  const agents = await fs.readFile(path.join(dir, "AGENTS.md"), "utf8");
  expect(agents).toBe(await fs.readFile(path.join(record.dir, "AGENTS.md"), "utf8"));

  // And it is a project: the scaffold's own files, every scene on disk, a
  // manifest under the new name.
  for (const file of ["package.json", "tsconfig.json", ".npmrc", ".gitignore"]) {
    await expect(fs.stat(path.join(dir, file))).resolves.toBeTruthy();
  }
  for (const scene of record.manifest.scenes) {
    await expect(fs.stat(path.join(dir, scene.file))).resolves.toBeTruthy();
  }
  const manifest = JSON.parse(await fs.readFile(path.join(dir, "project.json"), "utf8"));
  expect(manifest.name).toBe("My Copy");
  expect(manifest.scenes).toHaveLength(record.manifest.scenes.length);
});
