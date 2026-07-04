import { FEATURES } from "@/lib/marketing/features";
import { TOOLS } from "@/lib/marketing/tools";
import {
  getAllPosts,
  getAllShowcaseVideos,
  getAllTerms,
} from "@/lib/marketing/content";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://genmotion.app";

/**
 * `/llms.txt` — a Markdown map of the site for LLMs/answer engines, per the
 * llmstxt.org spec: an H1 title, a blockquote summary, then H2 sections of
 * `[name](url): notes` links. Generated from the same content as the site so it
 * never drifts. See also robots.ts (which welcomes AI crawlers) and sitemap.ts.
 */
export function GET() {
  const out: string[] = [];
  const section = (title: string, rows: string[]) => {
    if (!rows.length) return;
    out.push(`## ${title}`, "", ...rows, "");
  };

  out.push("# GenMotion", "");
  out.push(
    "> GenMotion is an AI motion-video studio: describe a video in plain language and an agent animates it as real, inspectable React/TSX scenes; refine them on a frame-accurate timeline and export a pixel-identical MP4. The in-browser preview and the headless renderer share one deterministic runtime, so what you preview is exactly what you ship.",
    "",
  );
  out.push(
    "GenMotion is for anyone who needs animated video without a motion-design background or a studio budget — product teasers, explainers, data stories, launch and event promos, and social ads. You start from a sentence, direct the agent, refine on the timeline, and export.",
    "",
  );

  section("Core", [
    `- [Home](${BASE}/): what GenMotion is and how it works`,
    `- [Pricing](${BASE}/pricing): plans and what each includes`,
    `- [About](${BASE}/about): mission and how we build`,
  ]);

  section(
    "Features",
    FEATURES.map((f) => `- [${f.name}](${BASE}/features/${f.slug}): ${f.tagline}`),
  );

  section(
    "Free tools",
    TOOLS.map((t) => `- [${t.name}](${BASE}/tools/${t.slug}): ${t.description}`),
  );

  section(
    "Showcase",
    getAllShowcaseVideos().map(
      (v) => `- [${v.title}](${BASE}/showcase/${v.slug}): ${v.description}`,
    ),
  );

  section(
    "Blog",
    getAllPosts().map((p) => `- [${p.title}](${BASE}/blog/${p.slug}): ${p.description}`),
  );

  section(
    "Glossary",
    getAllTerms().map((t) => `- [${t.term}](${BASE}/glossary/${t.slug}): ${t.description}`),
  );

  return new Response(out.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
