import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parseFaqs, type Faq } from "@/lib/marketing/faq";
import { SITE_URL } from "@/lib/marketing/site";
import {
  CLI_INIT_COMMAND,
  DOCS_PATH,
  SETUP_PROMPT,
  STUDIO_INSTALL_COMMAND,
} from "@/lib/marketing/setup";

/**
 * The docs: one Markdown file per page in `content/docs/`. A page's place in
 * the sidebar comes from its frontmatter (`group`, `order`), so adding a page
 * is adding a file. Frontmatter also carries the SEO fields: `seoTitle`,
 * `description` (140 to 160 characters), `keywords` and `updated`.
 *
 * Bodies are plain Markdown plus three container directives, each closed by a
 * line holding only `:::`:
 *
 *   ::: steps            numbered steps; every `### Heading` starts one
 *   ::: note|tip|warning a callout
 *   ::: cards            `- [Title](/docs/x): one line` per card
 *
 * Commands the home page and download page also quote are written as
 * `{{SETUP_PROMPT}}`-style tokens, so there is still one copy of each.
 */

const DOCS_DIR = path.join(process.cwd(), "content", "docs");

/** The page served at `/docs` itself. */
export const DOCS_HOME = "introduction";

export const DOC_GROUPS = ["Getting started", "Guides", "Reference"] as const;
export type DocGroup = (typeof DOC_GROUPS)[number];

export type Doc = {
  slug: string;
  title: string;
  /** The `<title>` for search results, when it should carry more than the H1. */
  seoTitle: string;
  /** Shorter label for the sidebar, where the title is too long. */
  sidebarTitle: string;
  /** Meta description: what a search result shows under the title. */
  description: string;
  group: DocGroup;
  order: number;
  keywords: string[];
  /** ISO yyyy-mm-dd of the last material change. */
  updated: string;
  faqs: Faq[];
  body: string;
};

export type CalloutKind = "note" | "tip" | "warning";

export type DocBlock =
  | { type: "markdown"; content: string }
  | { type: "steps"; steps: { title: string; body: string }[] }
  | { type: "callout"; kind: CalloutKind; content: string }
  | { type: "cards"; cards: { title: string; href: string; body: string }[] };

const TOKENS: Record<string, string> = {
  SETUP_PROMPT,
  CLI_INIT_COMMAND,
  STUDIO_INSTALL_COMMAND,
};

function substitute(body: string): string {
  return body.replace(/\{\{([A-Z_]+)\}\}/g, (whole, name: string) => TOKENS[name] ?? whole);
}

function isGroup(value: unknown): value is DocGroup {
  return typeof value === "string" && (DOC_GROUPS as readonly string[]).includes(value);
}

let cache: Doc[] | null = null;

/** Every page, in sidebar order. */
export function getAllDocs(): Doc[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const docs = fs
    .readdirSync(DOCS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file): Doc => {
      const slug = file.replace(/\.md$/, "");
      const { data, content } = matter(fs.readFileSync(path.join(DOCS_DIR, file), "utf8"));
      if (!isGroup(data.group)) throw new Error(`content/docs/${file}: unknown group "${String(data.group)}"`);
      const title = String(data.title ?? slug);
      return {
        slug,
        title,
        seoTitle: String(data.seoTitle ?? title),
        sidebarTitle: String(data.sidebarTitle ?? title),
        description: String(data.description ?? ""),
        group: data.group,
        order: Number(data.order ?? 99),
        keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
        updated: data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : String(data.updated ?? ""),
        faqs: parseFaqs(data.faqs),
        body: substitute(content.trim()),
      };
    })
    .sort((a, b) => DOC_GROUPS.indexOf(a.group) - DOC_GROUPS.indexOf(b.group) || a.order - b.order);
  cache = docs;
  return docs;
}

export function getDoc(slug: string): Doc | undefined {
  return getAllDocs().find((d) => d.slug === slug);
}

/** Site-relative URL of a page. The introduction is `/docs` itself. */
export function docHref(slug: string): string {
  return slug === DOCS_HOME ? DOCS_PATH : `${DOCS_PATH}/${slug}`;
}

/** Where an agent fetches a page as Markdown. */
export function docMarkdownHref(slug: string): string {
  return slug === DOCS_HOME ? `${DOCS_PATH}.md` : `${DOCS_PATH}/${slug}.md`;
}

export function docUrl(slug: string): string {
  return `${SITE_URL}${docHref(slug)}`;
}

export type NavGroup = { group: DocGroup; items: { slug: string; title: string; href: string }[] };

export function getDocsNav(): NavGroup[] {
  const docs = getAllDocs();
  return DOC_GROUPS.map((group) => ({
    group,
    items: docs
      .filter((d) => d.group === group)
      .map((d) => ({ slug: d.slug, title: d.sidebarTitle, href: docHref(d.slug) })),
  })).filter((g) => g.items.length > 0);
}

export function getPrevNext(slug: string): { prev?: Doc; next?: Doc } {
  const docs = getAllDocs();
  const at = docs.findIndex((d) => d.slug === slug);
  return { prev: at > 0 ? docs[at - 1] : undefined, next: at >= 0 ? docs[at + 1] : undefined };
}

const FENCE = /^\s*(```|~~~)/;
const OPEN = /^:::\s*(steps|note|tip|warning|cards)\s*$/;

/** Splits a body into Markdown and the directive blocks around it. */
export function parseDocBody(body: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const lines = body.split("\n");
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) blocks.push({ type: "markdown", content });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (FENCE.test(line)) inFence = !inFence;
    const open = inFence ? null : OPEN.exec(line.trim());
    if (!open) {
      buffer.push(line);
      continue;
    }
    flush();
    const inner: string[] = [];
    let innerFence = false;
    for (i++; i < lines.length; i++) {
      const l = lines[i] ?? "";
      if (FENCE.test(l)) innerFence = !innerFence;
      if (!innerFence && l.trim() === ":::") break;
      inner.push(l);
    }
    const kind = open[1];
    if (kind === "steps") blocks.push({ type: "steps", steps: parseSteps(inner) });
    else if (kind === "cards") blocks.push({ type: "cards", cards: parseCards(inner) });
    else blocks.push({ type: "callout", kind: kind as CalloutKind, content: inner.join("\n").trim() });
  }
  flush();
  return blocks;
}

function parseSteps(lines: string[]): { title: string; body: string }[] {
  const steps: { title: string; body: string[] }[] = [];
  let inFence = false;
  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    const heading = inFence ? null : /^###\s+(.+)$/.exec(line);
    if (heading) steps.push({ title: heading[1]!.trim(), body: [] });
    else steps.at(-1)?.body.push(line);
  }
  return steps.map((s) => ({ title: s.title, body: s.body.join("\n").trim() }));
}

function parseCards(lines: string[]): { title: string; href: string; body: string }[] {
  return lines
    .map((line) => /^-\s*\[([^\]]+)\]\(([^)]+)\):?\s*(.*)$/.exec(line.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ title: m[1]!, href: m[2]!, body: m[3] ?? "" }));
}

/**
 * The page as portable Markdown, for "Copy page", the `.md` endpoints and
 * `llms-full.txt`: directives become the Markdown an agent already reads, and
 * relative links become absolute so the text still works pasted elsewhere.
 */
export function docToMarkdown(doc: Doc): string {
  const parts = parseDocBody(doc.body).map((block) => {
    switch (block.type) {
      case "markdown":
        return block.content;
      case "steps":
        return block.steps.map((s, i) => `### ${i + 1}. ${s.title}\n\n${s.body}`).join("\n\n");
      case "callout": {
        const label = { note: "Note", tip: "Tip", warning: "Warning" }[block.kind];
        return block.content
          .split("\n")
          .map((line, i) => `> ${i === 0 ? `**${label}:** ` : ""}${line}`)
          .join("\n");
      }
      case "cards":
        return block.cards.map((c) => `- [${c.title}](${c.href})${c.body ? `: ${c.body}` : ""}`).join("\n");
    }
  });
  const body = parts.join("\n\n").replace(/\]\((\/[^)]*)\)/g, `](${SITE_URL}$1)`);
  return `# ${doc.title}\n\n> ${doc.description}\n\nSource: ${docUrl(doc.slug)}\n\n${body}\n`;
}

/** Same rules `DocContent` uses for heading ids, so TOC links always land. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text) => {
    const base = slugify(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count ? `${base}-${count}` : base;
  };
}

export type DocHeading = { id: string; text: string; level: 2 | 3 };

/** `##`/`###` headings, including step titles, with the ids `DocContent` gives them. */
export function getHeadings(doc: Doc): DocHeading[] {
  const slug = createSlugger();
  const headings: DocHeading[] = [];
  let inFence = false;
  for (const line of doc.body.split("\n")) {
    if (FENCE.test(line)) inFence = !inFence;
    const m = inFence ? null : /^(#{2,3})\s+(.+)$/.exec(line);
    if (m) {
      const text = m[2]!.replace(/[`*]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      headings.push({ id: slug(text), text, level: m[1]!.length as 2 | 3 });
    }
  }
  return headings;
}

export type SearchEntry = {
  slug: string;
  href: string;
  title: string;
  group: DocGroup;
  description: string;
  headings: { id: string; text: string }[];
  text: string;
};

/** What the ⌘K dialog searches: small enough to ship to the browser whole. */
export function getSearchIndex(): SearchEntry[] {
  return getAllDocs().map((doc) => {
    const headings = getHeadings(doc).map(({ id, text }) => ({ id, text }));
    const text = doc.body
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^:::.*$/gm, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#>*`|_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { slug: doc.slug, href: docHref(doc.slug), title: doc.title, group: doc.group, description: doc.description, headings, text };
  });
}
