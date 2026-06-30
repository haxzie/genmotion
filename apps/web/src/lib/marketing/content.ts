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
