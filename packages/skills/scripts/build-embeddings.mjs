import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { readSkills } from "../src/catalog.ts";
import { embeddingSources, sourceHashOf } from "../src/embed-sources.ts";

/**
 * Bake the skill pack's embeddings into `generated/embeddings.json`.
 *
 * Run by hand after writing or editing a skill, with `OPENAI_API_KEY` set, and
 * the output committed — nobody else should need a key, and a reviewer should
 * see when the vectors moved. `src/__tests__/catalog.test.ts` recomputes the
 * source hash from the sidecars and fails when they have drifted, so a skill
 * edited without re-running this is caught in CI rather than in production.
 *
 * Several short strings per skill rather than one long one: the whole SKILL.md
 * embeds to mush, while one vector per trigger is what makes a request phrased
 * the way a person actually types it reach the right format.
 *
 * `text-embedding-3-small` at 512 dimensions — the model is trained so a
 * truncated vector still works, and a third of the bytes matters when the file
 * ships inside a 140MB installer.
 */
const MODEL = "text-embedding-3-small";
const DIMS = 512;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY is not set — it is only needed to regenerate this file.");

const skills = readSkills(path.join(root, "plugin", "skills"));
const jobs = skills.flatMap((s) => embeddingSources(s.meta).map((text) => ({ id: s.meta.id, text })));

const openai = createOpenAI({ apiKey: key });
const { embeddings } = await embedMany({
  model: openai.textEmbeddingModel(MODEL, { dimensions: DIMS }),
  values: jobs.map((j) => j.text),
});

const vectors = {};
jobs.forEach((job, i) => {
  const floats = Float32Array.from(embeddings[i] ?? []);
  (vectors[job.id] ??= []).push(Buffer.from(floats.buffer).toString("base64"));
});

const out = {
  model: MODEL,
  dims: DIMS,
  sourceHash: sourceHashOf(skills.map((s) => s.meta)),
  vectors,
};
await fs.mkdir(path.join(root, "generated"), { recursive: true });
await fs.writeFile(path.join(root, "generated", "embeddings.json"), `${JSON.stringify(out)}\n`);

const bytes = (await fs.stat(path.join(root, "generated", "embeddings.json"))).size;
console.log(
  `embedded ${jobs.length} strings across ${skills.length} skills → generated/embeddings.json (${(bytes / 1024).toFixed(0)}KB)`,
);
