import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parseFaqs, type Faq } from "@/lib/marketing/faq";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO yyyy-mm-dd
  /** ISO yyyy-mm-dd. Set when a post is materially revised — drives
   *  `dateModified` in the article schema and the sitemap's `lastModified`,
   *  which is what search engines read as a freshness signal. */
  updated?: string;
  author: string;
  tags: string[];
  faqs: Faq[];
  body: string;
};

export type GlossaryTerm = {
  slug: string;
  term: string;
  description: string;
  faqs: Faq[];
  body: string;
};

export type ShowcaseVideo = {
  slug: string;
  title: string;
  description: string;
  videoUrl: string;
  poster: string;
  author: string;
  authorRole: string;
  authorImage: string;
  date: string; // ISO yyyy-mm-dd
  duration: string;
  aspectRatio: string;
  category: string;
  tags: string[];
  featured: boolean;
  faqs: Faq[];
  body: string;
};

export type AnswerTool = "hyperframes" | "remotion" | "general";
export type AnswerKind = "error" | "how-to" | "decision" | "explainer";

export type AnswerSource = { label: string; url: string };
export type AnswerCallout = { heading: string; body: string; prompt?: string };

/**
 * One question, answered once. `/answers` is the long tail: a person pastes an
 * error string into a search box or asks an agent, and this is the page that
 * has the verified cause and the fix. The body follows a fixed shape (what it
 * means, why it happens, the fix, how to verify), so it is plain markdown.
 */
export type Answer = {
  slug: string;
  /** The H1, written as the question people ask. */
  title: string;
  description: string;
  tool: AnswerTool;
  kind: AnswerKind;
  /** Verbatim error strings, shown at the top. This is what gets pasted into search. */
  errors: string[];
  date: string; // ISO yyyy-mm-dd
  /** Set when an answer is materially revised; drives `dateModified` and the sitemap. */
  updated?: string;
  tags: string[];
  /** Hand-picked sibling slugs, shown first. The rest are filled by tool + tag. */
  related: string[];
  /** Upstream issues, PRs and docs the answer is built from. */
  sources: AnswerSource[];
  /**
   * The closing section: GenMotion offered as the solution to this particular
   * problem. Written per answer, never boilerplate, because a generic pitch at
   * the foot of a specific fix reads as an ad rather than as the next step.
   */
  genmotion: { heading: string; body: string } | null;
  /**
   * Mid-article offers, placed in the body with a `::callout <key>` line. A
   * tutorial that runs 20 minutes cannot hold its one pitch until the end, so
   * the pitch is also made where the reader is already feeling the effort: the
   * `prompt` is what they would type into GenMotion to get the thing they are
   * currently building by hand.
   */
  callouts: Record<string, AnswerCallout>;
  faqs: Faq[];
  body: string;
};

/**
 * A post body is markdown plus optional video embeds. Markdown can't carry an
 * iframe (the renderer strips raw HTML), so a video is written as a directive
 * line and split out before rendering:
 *
 *   ::video https://youtu.be/PA0mjzzhtVU "Optional caption"
 *   ::video /blog/x/clip.mp4 "Caption" /blog/x/clip.jpg
 *
 * The third field is an optional poster, which only applies to a direct media
 * file — an embedded YouTube player brings its own. Without one a self-hosted
 * clip shows a black rectangle until it is played.
 */
export type BodyBlock =
  | { type: "markdown"; content: string }
  | { type: "video"; url: string; caption?: string; poster?: string };

const VIDEO_DIRECTIVE =
  /^::video\s+(\S+)(?:\s+"([^"]*)")?(?:\s+(\S+))?\s*$/;

export function parseBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) blocks.push({ type: "markdown", content });
    buffer = [];
  };

  for (const line of body.split("\n")) {
    const match = VIDEO_DIRECTIVE.exec(line.trim());
    if (match?.[1]) {
      flush();
      blocks.push({
        type: "video",
        url: match[1],
        caption: match[2],
        poster: match[3],
      });
    } else {
      buffer.push(line);
    }
  }
  flush();

  return blocks;
}

function readDir(sub: string): { slug: string; raw: string }[] {
  const dir = path.join(CONTENT_DIR, sub);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      slug: f.replace(/\.md$/, ""),
      raw: fs.readFileSync(path.join(dir, f), "utf8"),
    }));
}

export function getAllPosts(): BlogPost[] {
  return readDir("blog")
    .map(({ slug, raw }) => {
      const { data, content } = matter(raw);
      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ""),
        date: String(data.date ?? ""),
        updated: data.updated ? String(data.updated) : undefined,
        author: String(data.author ?? "GenMotion"),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        faqs: parseFaqs(data.faqs),
        body: content.trim(),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

export function getAllTerms(): GlossaryTerm[] {
  return readDir("glossary")
    .map(({ slug, raw }) => {
      const { data, content } = matter(raw);
      return {
        slug,
        term: String(data.term ?? slug),
        description: String(data.description ?? ""),
        faqs: parseFaqs(data.faqs),
        body: content.trim(),
      };
    })
    .sort((a, b) => a.term.localeCompare(b.term));
}

export function getTermBySlug(slug: string): GlossaryTerm | undefined {
  return getAllTerms().find((t) => t.slug === slug);
}

export function getAllShowcaseVideos(): ShowcaseVideo[] {
  return readDir("showcase")
    .map(({ slug, raw }) => {
      const { data, content } = matter(raw);
      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ""),
        videoUrl: String(data.videoUrl ?? ""),
        poster: String(data.poster ?? ""),
        author: String(data.author ?? "GenMotion"),
        authorRole: String(data.authorRole ?? ""),
        authorImage: String(data.authorImage ?? ""),
        date: String(data.date ?? ""),
        duration: String(data.duration ?? ""),
        aspectRatio: String(data.aspectRatio ?? "16:9"),
        category: String(data.category ?? "Other"),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        featured: Boolean(data.featured),
        faqs: parseFaqs(data.faqs),
        body: content.trim(),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getShowcaseVideoBySlug(
  slug: string,
): ShowcaseVideo | undefined {
  return getAllShowcaseVideos().find((v) => v.slug === slug);
}

const ANSWER_TOOLS: AnswerTool[] = ["hyperframes", "remotion", "general"];
const ANSWER_KINDS: AnswerKind[] = ["error", "how-to", "decision", "explainer"];

function parseSources(value: unknown): AnswerSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (entry && typeof entry === "object") {
      const { label, url } = entry as Record<string, unknown>;
      if (typeof label === "string" && typeof url === "string") {
        return [{ label: label.trim(), url: url.trim() }];
      }
    }
    return [];
  });
}

function parseCallouts(value: unknown): Answer["callouts"] {
  const out: Answer["callouts"] = {};
  if (value && typeof value === "object") {
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (raw && typeof raw === "object") {
        const { heading, body, prompt } = raw as Record<string, unknown>;
        if (typeof heading === "string" && typeof body === "string") {
          out[key] = {
            heading: heading.trim(),
            body: body.trim(),
            ...(typeof prompt === "string" ? { prompt: prompt.trim() } : {}),
          };
        }
      }
    }
  }
  return out;
}

function parseGenmotion(value: unknown): Answer["genmotion"] {
  if (value && typeof value === "object") {
    const { heading, body } = value as Record<string, unknown>;
    if (typeof heading === "string" && typeof body === "string") {
      return { heading: heading.trim(), body: body.trim() };
    }
  }
  return null;
}

export function getAllAnswers(): Answer[] {
  return readDir("answers")
    .map(({ slug, raw }) => {
      const { data, content } = matter(raw);
      const tool = ANSWER_TOOLS.find((t) => t === data.tool) ?? "general";
      const kind = ANSWER_KINDS.find((k) => k === data.kind) ?? "error";
      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ""),
        tool,
        kind,
        errors: Array.isArray(data.errors) ? data.errors.map(String) : [],
        date: String(data.date ?? ""),
        updated: data.updated ? String(data.updated) : undefined,
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        related: Array.isArray(data.related) ? data.related.map(String) : [],
        sources: parseSources(data.sources),
        genmotion: parseGenmotion(data.genmotion),
        callouts: parseCallouts(data.callouts),
        faqs: parseFaqs(data.faqs),
        body: content.trim(),
      };
    })
    .sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? 1 : -1));
}

export function getAnswerBySlug(slug: string): Answer | undefined {
  return getAllAnswers().find((a) => a.slug === slug);
}
