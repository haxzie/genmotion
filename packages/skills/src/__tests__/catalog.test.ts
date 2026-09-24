import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SKILL_ASPECTS, SKILL_DOC, SKILL_FILE } from "@genmotion/shared";
import { readSkills } from "../catalog";
import { createSkillCatalog, SKILL_CATALOG } from "../index";
import { sourceHashOf } from "../embed-sources";
import { searchSkills, type SkillEmbeddings } from "../search";

/**
 * The authoring conventions, as tests.
 *
 * Every rule here exists because breaking it fails somewhere the author would
 * not look: a script the desktop app refuses to run, a relative path into a
 * pack that lives in a different plugin directory, a card that promises a
 * connector the marketplace has never heard of.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const skillsDir = path.join(root, "plugin", "skills");
const skills = readSkills(skillsDir);

/** The pack ships inside a ~140MB installer. Markdown only; keep it honest. */
const MAX_PACK_BYTES = 5 * 1024 * 1024;
const MAX_SKILL_DOC_LINES = 520;

/** Ids the vendored HyperFrames pack already uses — Codex sees one flat dir. */
const hyperframesIds = fs
  .readdirSync(path.join(root, "..", "hyperframes", "plugin", "skills"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

/** Tool names the desktop app actually gives the agent. */
const GENMOTION_TOOLS = [
  "project_overview",
  "validate_composition",
  "validate_scene",
  "capture_frames",
  "save_asset",
  "generate_image",
  "generate_voiceover",
  "generate_sfx",
  "pick_voice",
  "search_skills",
  "recommend_integration",
];

/**
 * Skills in this pack are creative direction — what the video should be —
 * shared across every engine. Sibling skill names that appear only in the
 * `@genmotion/hyperframes` plugin (HyperFrames' own composition contract,
 * motion, keyframes, audio, design and registry skills) are not loaded for a
 * React or Three project, so citing one by name in this pack's prose points
 * at a skill the agent will not have.
 */
const HYPERFRAMES_ONLY_SKILLS = [
  "hyperframes-core",
  "hyperframes-animation",
  "hyperframes-keyframes",
  "hyperframes-audio",
  "hyperframes-creative",
  "hyperframes-registry",
  "embedded-captions",
  "media-use",
  "motion-graphics",
  "talking-head-recut",
];

/** Document filenames that only exist inside a HyperFrames project. */
const HYPERFRAMES_ONLY_FILES = ["STORYBOARD.md", "SCRIPT.md", "BRIEF.md", "hyperframes.json"];

describe("skill pack", () => {
  it("has skills", () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  it("fits in the installer", () => {
    const bytes = skills.reduce((n, s) => n + s.bytes, 0);
    expect(bytes).toBeLessThan(MAX_PACK_BYTES);
  });

  it("does not collide with the HyperFrames pack", () => {
    for (const skill of skills) expect(hyperframesIds).not.toContain(skill.meta.id);
  });

  it("matches the committed index", () => {
    const rebuilt = createSkillCatalog(skills.map((s) => ({ ...s.meta, source: "first-party" as const })));
    expect(rebuilt.revision).toBe(SKILL_CATALOG.revision);
  });
});

describe.each(skills.map((s) => [s.meta.id, s] as const))("%s", (_id, skill) => {
  const doc = fs.readFileSync(path.join(skill.dir, SKILL_DOC), "utf8");

  it("id matches the folder name", () => {
    expect(skill.meta.id).toBe(path.basename(skill.dir));
  });

  it("frontmatter name is the id and description matches the sidecar", () => {
    expect(skill.frontmatter.name).toBe(skill.meta.id);
    expect(skill.frontmatter.description).toBe(skill.meta.description);
  });

  it("holds only markdown, data and images", () => {
    const allowed = /\.(md|json|txt|svg|png|jpg|jpeg|webp|css|html|woff2)$/i;
    for (const rel of skill.files) expect(rel, `${skill.meta.id}/${rel}`).toMatch(allowed);
  });

  it("ships no scripts", () => {
    // The desktop app forbids running a skill's bundled scripts, so one here
    // is dead weight the agent is told to ignore. See HYPERFRAMES_AUTHORING_GUIDE.
    for (const rel of skill.files) expect(rel).not.toMatch(/\.(mjs|cjs|js|ts|py|sh)$/i);
  });

  it("never reaches for the HyperFrames CLI", () => {
    // There is none in this app. Every command has a tool that replaces it.
    expect(doc).not.toMatch(/npx\s+hyperframes/);
    expect(doc).not.toMatch(/\bhyperframes\s+(init|capture|catalog|add|lint|check|render|snapshot|preview)\b/);
  });

  it("references sibling skills by name, not by relative path", () => {
    // Two plugin directories: `../hyperframes-core/...` resolves to nothing
    // for Claude, and only works for Codex by accident of the flat symlink dir.
    expect(doc).not.toMatch(/\.\.\/(hyperframes|media-use|motion-graphics|general-video)/);
  });

  it("does not cite a skill only the HyperFrames pack carries", () => {
    // This pack is creative direction for every engine. A React or Three
    // project never loads the HyperFrames plugin, so telling the agent to
    // "read hyperframes-core" there points at a skill that is not present.
    for (const id of HYPERFRAMES_ONLY_SKILLS) {
      expect(doc, `${skill.meta.id} cites "${id}", which only the HyperFrames pack carries`).not.toMatch(
        new RegExp(`\\b${id}\\b`),
      );
    }
  });

  it("does not name a HyperFrames-only document as the deliverable", () => {
    // STORYBOARD.md / SCRIPT.md / BRIEF.md / hyperframes.json are formats
    // `hyperframes-core` defines; a React or Three project has no equivalent
    // file. Describe the artifact ("a shot list", "a script") and let the
    // project's own authoring rules decide what file it becomes.
    for (const file of HYPERFRAMES_ONLY_FILES) {
      expect(doc, `${skill.meta.id} names ${file}, which only exists in a HyperFrames project`).not.toContain(file);
    }
  });

  it("mentions validate_scene wherever it mentions validate_composition", () => {
    // The two tools are the same check for different engines, and each
    // refuses to run on the wrong one. Naming only one steers a React or
    // Three project at a tool that will tell it to call the other.
    if (doc.includes("validate_composition")) expect(doc).toContain("validate_scene");
  });

  it("tells nobody to fetch from the network", () => {
    expect(doc).not.toMatch(/\bcurl\b|\bwget\b/);
  });

  it("keeps determinism", () => {
    expect(doc).not.toMatch(/Math\.random|Date\.now|setInterval|setTimeout|repeat:\s*-1/);
  });

  it("stays short enough to read", () => {
    expect(doc.split("\n").length).toBeLessThanOrEqual(MAX_SKILL_DOC_LINES);
  });

  it("carries the required sections", () => {
    for (const heading of ["## When to use", "## Requirements", "## Checks before you finish"]) {
      expect(doc, `${skill.meta.id} is missing "${heading}"`).toContain(heading);
    }
  });

  it("names only tools that exist", () => {
    for (const req of skill.meta.requires) {
      if (req.kind === "tool") expect(GENMOTION_TOOLS).toContain(req.id);
      if (req.kind === "skill") {
        expect([...skills.map((s) => s.meta.id), ...hyperframesIds]).toContain(req.id);
      }
    }
    for (const model of skill.meta.models) {
      if (model.via.startsWith("mcp:")) continue;
      expect(GENMOTION_TOOLS).toContain(model.via);
    }
  });

  it("declares a usable aspect and duration", () => {
    for (const aspect of skill.meta.aspects) expect(SKILL_ASPECTS).toContain(aspect);
    expect(skill.meta.duration.minSeconds).toBeLessThanOrEqual(skill.meta.duration.maxSeconds);
  });

  it("has a sidecar beside the doc", () => {
    expect(skill.files).toContain(SKILL_FILE);
    expect(skill.files).toContain(SKILL_DOC);
  });
});

describe("embeddings", () => {
  const file = path.join(root, "generated", "embeddings.json");

  it.runIf(fs.existsSync(file))("are current", () => {
    const baked = JSON.parse(fs.readFileSync(file, "utf8")) as SkillEmbeddings;
    expect(baked.sourceHash, "run `pnpm --filter @genmotion/skills build-embeddings`").toBe(
      sourceHashOf(skills.map((s) => s.meta)),
    );
    for (const skill of skills) expect(Object.keys(baked.vectors)).toContain(skill.meta.id);
  });
});

describe("search", () => {
  it("finds a skill from its own trigger, with no embeddings", () => {
    const skill = skills[0];
    if (!skill) return;
    const hits = searchSkills({
      query: skill.meta.triggers[0] ?? skill.meta.title,
      entries: SKILL_CATALOG.entries,
      limit: 3,
    });
    expect(hits.map((h) => h.entry.id)).toContain(skill.meta.id);
  });

  it("answers an unmatched query rather than returning nothing", () => {
    const hits = searchSkills({ query: "zzzz qqqq", entries: SKILL_CATALOG.entries, limit: 3 });
    expect(hits.length).toBeGreaterThan(0);
  });
});
