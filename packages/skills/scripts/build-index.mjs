import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readSkills } from "../src/catalog.ts";
import { createSkillCatalog } from "../src/registry.ts";

/**
 * Generate `generated/index.json` from the skills' `skill.json` sidecars.
 *
 * A skill is described once, in its own folder, and everything that shows it —
 * the marketplace card, the agent's search, the API's catalog route — reads
 * this one file. Committed rather than built on demand: the API imports it,
 * the desktop bundles it, and a build machine has no business walking a
 * directory that only exists in the source tree.
 *
 * Run after adding or editing a skill: `pnpm --filter @genmotion/skills build-index`.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skills = readSkills(path.join(root, "plugin", "skills"));

const catalog = createSkillCatalog(skills.map((s) => ({ ...s.meta, source: "first-party" })));
await fs.mkdir(path.join(root, "generated"), { recursive: true });
await fs.writeFile(path.join(root, "generated", "index.json"), `${JSON.stringify(catalog, null, 2)}\n`);

console.log(`indexed ${catalog.entries.length} skills → generated/index.json (revision ${catalog.revision})`);
