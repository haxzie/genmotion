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

/**
 * A post body is markdown plus optional video embeds. Markdown can't carry an
 * iframe (the renderer strips raw HTML), so a video is written as a directive
 * line and split out before rendering:
 *
 *   ::video https://youtu.be/PA0mjzzhtVU "Optional caption"
 */
export type BodyBlock =
  | { type: "markdown"; content: string }
  | { type: "video"; url: string; caption?: string };

const VIDEO_DIRECTIVE = /^::video\s+(\S+)(?:\s+"([^"]*)")?\s*$/;

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
      blocks.push({ type: "video", url: match[1], caption: match[2] });
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
