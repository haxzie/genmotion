#!/usr/bin/env node
/**
 * Link integrity for `content/answers`. Run in CI and before shipping a batch:
 *
 *   pnpm --filter @genmotion/web check:answers
 *
 * `/answers` is a mesh: every page links to its siblings, to the blog, to the
 * glossary and to the docs. A mesh rots one rename at a time, so this fails on
 * anything that would 404 or silently drop out of the graph:
 *
 *  - frontmatter that does not parse, or is missing a field the page needs;
 *  - a `related:` slug, or an inline /answers/<slug> link, that has no file;
 *  - an inline /blog, /glossary, /docs or /templates link that has no target;
 *  - an answer with no closing GenMotion section (genmotion.heading and body);
 *  - a ::callout that is undefined or unused, and an image that is missing or has no alt text;
 *  - a slug that collides with a static route under /answers;
 *  - an answer nothing links to (an orphan is invisible to crawlers);
 *  - an em dash in copy (verbatim tool output in a code block is exempt).
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT = path.join(ROOT, "content");
const PUBLIC = path.join(ROOT, "public");
const RESERVED = new Set(["hyperframes", "remotion"]);
const TOOLS = new Set(["hyperframes", "remotion", "general"]);
const KINDS = new Set(["error", "how-to", "decision", "explainer"]);

const slugsIn = (dir) =>
  fs.existsSync(path.join(CONTENT, dir))
    ? fs.readdirSync(path.join(CONTENT, dir)).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
    : [];

const answers = new Map();
const problems = [];
const fail = (slug, msg) => problems.push(`  ${slug}: ${msg}`);

for (const slug of slugsIn("answers")) {
  const raw = fs.readFileSync(path.join(CONTENT, "answers", `${slug}.md`), "utf8");
  let parsed;
  try {
    parsed = matter(raw);
  } catch (e) {
    fail(slug, `frontmatter does not parse: ${e.message}`);
    continue;
  }
  answers.set(slug, { ...parsed, raw });
}

const blog = new Set(slugsIn("blog"));
const glossary = new Set(slugsIn("glossary"));
const docs = new Set(slugsIn("docs"));
const inbound = new Map([...answers.keys()].map((s) => [s, new Set()]));

// Pages that exist as code rather than as a markdown file.
const STATIC = new Set(["/", "/pricing", "/download", "/about", "/features", "/use-cases", "/blog", "/glossary", "/answers", "/answers/hyperframes", "/answers/remotion", "/tools", "/showcase", "/templates", "/docs"]);

for (const [slug, { data, content, raw }] of answers) {
  if (RESERVED.has(slug)) fail(slug, "slug collides with a static /answers route");
  if (!/^[a-z0-9-]+$/.test(slug)) fail(slug, "slug must be lowercase letters, digits and hyphens");
  for (const key of ["title", "description", "date"]) if (!data[key]) fail(slug, `missing ${key}`);
  if (!TOOLS.has(data.tool)) fail(slug, `tool must be one of ${[...TOOLS].join(", ")}`);
  if (!KINDS.has(data.kind)) fail(slug, `kind must be one of ${[...KINDS].join(", ")}`);
  if (!Array.isArray(data.sources) || data.sources.length === 0) fail(slug, "needs at least one source");
  for (const s of data.sources ?? []) if (!s?.label || !/^https:\/\//.test(s?.url ?? "")) fail(slug, `bad source ${JSON.stringify(s)}`);
  if (!Array.isArray(data.faqs) || data.faqs.length < 2) fail(slug, "needs at least 2 faqs");
  if (typeof data.description === "string" && (data.description.length < 80 || data.description.length > 300)) {
    fail(slug, `description is ${data.description.length} chars; keep it 80 to 300`);
  }
  // Copy only: a fenced block is verbatim tool output (HyperFrames itself prints one)
  // and is quoted as it was run.
  if (raw.replace(/```[\s\S]*?```/g, "").includes("\u2014")) fail(slug, "contains an em dash");
  // Every answer closes with GenMotion as the solution to its own problem. It is
  // required, and it has to be specific: a short body is a boilerplate tell.
  const gm = data.genmotion;
  if (!gm?.heading || !gm?.body) fail(slug, "missing genmotion.heading / genmotion.body (the closing section)");
  else if (gm.body.length < 200) fail(slug, `genmotion.body is ${gm.body.length} chars; say something specific to this answer`);

  for (const rel of data.related ?? []) {
    if (!answers.has(rel)) fail(slug, `related slug "${rel}" has no file`);
    else if (rel === slug) fail(slug, "relates to itself");
    else inbound.get(rel)?.add(slug);
  }

  // `::callout <key>` lines must name a callout the frontmatter defines, and a
  // defined callout must be used: an unplaced one is an offer nobody sees.
  const used = [...content.matchAll(/^::callout\s+([a-z0-9-]+)\s*$/gm)].map((m) => m[1]);
  for (const key of used) if (!data.callouts?.[key]) fail(slug, `::callout ${key} is not defined in the frontmatter`);
  for (const [key, c] of Object.entries(data.callouts ?? {})) {
    if (!used.includes(key)) fail(slug, `callout "${key}" is defined but never placed with ::callout ${key}`);
    if (!c?.heading || !c?.body || c.body.length < 120) fail(slug, `callout "${key}" needs a heading and a specific body`);
    if (/\u2014/.test(JSON.stringify(c))) fail(slug, `callout "${key}" contains an em dash`);
  }
  // Screenshots: the file has to exist and the alt text has to say something.
  for (const [, alt, src] of content.matchAll(/!\[([^\]]*)\]\((\/[^)\s]+)\)/g)) {
    if (!fs.existsSync(path.join(PUBLIC, src))) fail(slug, `image ${src} does not exist under public/`);
    if (alt.trim().length < 12) fail(slug, `image ${src} needs descriptive alt text`);
  }

  const faqText = (data.faqs ?? []).map((f) => f.a).join("\n");
  for (const raw of [content, faqText, data.genmotion?.body ?? ""]) {
    // An image is not a page: its path is checked above, against public/.
    const text = raw.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
    for (const [, href] of text.matchAll(/\]\((\/[^)\s#]*)(?:#[^)]*)?\)/g)) {
      const [, section, rest] = href.match(/^\/([^/]*)\/?(.*)$/) ?? [];
      if (href === "/" || STATIC.has(href)) continue;
      const ok =
        (section === "answers" && answers.has(rest)) ||
        (section === "blog" && blog.has(rest)) ||
        (section === "glossary" && glossary.has(rest)) ||
        (section === "docs" && docs.has(rest.replace(/\.md$/, ""))) ||
        (section === "templates" && !!rest) ||
        (section === "tools" && !!rest);
      if (!ok) fail(slug, `broken internal link ${href}`);
      if (section === "answers" && answers.has(rest) && rest !== slug) inbound.get(rest)?.add(slug);
    }
  }
}

// An answer nothing links to is invisible: related is symmetric at render time,
// so a link in either direction counts.
for (const [slug, { data }] of answers) {
  const outbound = (data.related ?? []).filter((r) => answers.has(r));
  if (inbound.get(slug).size === 0 && outbound.length === 0) fail(slug, "orphan: nothing links to it and it links to nothing");
  else if (inbound.get(slug).size === 0) fail(slug, "no inbound links from any other answer");
}

// The other direction: blog posts, glossary terms and docs pages that link into
// /answers must point at something. A link to a renamed slug 404s quietly.
const answerLinks = (dir) => {
  let linking = 0;
  for (const s of slugsIn(dir)) {
    const text = fs.readFileSync(path.join(CONTENT, dir, `${s}.md`), "utf8");
    let linked = false;
    for (const [, slug] of text.matchAll(/\]\(\/answers\/([^)\s#]*)[^)]*\)/g)) {
      linked = true;
      if (!RESERVED.has(slug) && !answers.has(slug)) problems.push(`  ${dir}/${s}: broken link /answers/${slug}`);
    }
    if (linked) linking++;
  }
  return linking;
};
const linkedFrom = { blog: answerLinks("blog"), glossary: answerLinks("glossary"), docs: answerLinks("docs") };

if (problems.length) {
  console.error(`check-answers: ${problems.length} problem(s) across ${answers.size} answers\n${problems.join("\n")}`);
  process.exit(1);
}
const byTool = [...answers.values()].reduce((m, { data }) => ((m[data.tool] = (m[data.tool] ?? 0) + 1), m), {});
console.log(`check-answers: ok. ${answers.size} answers (${Object.entries(byTool).map(([t, n]) => `${t} ${n}`).join(", ")}).`);
console.log(`  linked from: ${linkedFrom.blog} blog posts, ${linkedFrom.glossary} glossary terms, ${linkedFrom.docs} docs pages`);
