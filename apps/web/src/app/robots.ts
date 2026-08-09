import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/marketing/site";

const BASE = SITE_URL;

// The authenticated app, editor, admin console, and API are never indexable.
// Everything else (marketing, features, tools, blog, glossary, showcase) is
// public and we WANT it discovered.
const DISALLOW = [
  "/dashboard",
  "/projects",
  "/templates",
  "/settings",
  "/onboarding",
  "/p/",
  "/login",
  "/signup",
  "/accept-invitation",
  "/admin",
  "/api/",
  // Local-only harnesses (/dev/player, /dev/video-tools) — never useful to a crawler.
  "/dev/",
];

// Crawlers we explicitly welcome. `*` already covers everyone, but we name the
// major search and AI/LLM crawlers so our intent is unambiguous — we want to be
// discoverable in both traditional search and answer engines (GEO). Add or
// prune per bot as the landscape changes.
const USER_AGENTS = [
  "*",
  // Search engines
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
  // OpenAI (GPTBot = training, OAI-SearchBot = ChatGPT Search, ChatGPT-User = live fetch)
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // AI training/retrieval extensions & others
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Amazonbot",
  "Meta-ExternalAgent",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: USER_AGENTS.map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow: DISALLOW,
    })),
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
