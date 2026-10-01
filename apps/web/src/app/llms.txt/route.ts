import { FEATURES } from "@/lib/marketing/features";
import { USE_CASES } from "@/lib/marketing/use-cases";
import { TOOLS } from "@/lib/marketing/tools";
import {
  getAllPosts,
  getAllShowcaseVideos,
  getAllTerms,
} from "@/lib/marketing/content";
import { SITE_URL } from "@/lib/marketing/site";
import { listSharedVideos } from "@/lib/marketing/shares";
import { docMarkdownHref, getAllDocs } from "@/lib/docs/content";

const BASE = SITE_URL;

/**
 * `/llms.txt` — a Markdown map of the site for LLMs/answer engines, per the
 * llmstxt.org spec: an H1 title, a blockquote summary, then H2 sections of
 * `[name](url): notes` links. Generated from the same content as the site so it
 * never drifts. See also robots.ts (which welcomes AI crawlers) and sitemap.ts.
 */
export async function GET() {
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
    `- [UGC Ads](${BASE}/ugc-ads): make vertical, feed-native UGC ads with Claude Code`,
    `- [Educational Videos](${BASE}/educational-videos): make narrated explainer and lesson videos with Claude Code`,
  ]);

  // The app-free path: what an agent needs to make a video from a terminal.
  section("Command line & coding agents", [
    `- [Full docs as one file](${BASE}/llms-full.txt): every docs page below, concatenated`,
    `- [Download](${BASE}/download): GenMotion Studio for Mac and the genmotion CLI, with install steps for each`,
    "- [genmotion on npm](https://www.npmjs.com/package/genmotion): `npx genmotion init my-video` scaffolds a Three.js video project that Claude Code, Codex or Cursor can build; `genmotion dev` previews, `genmotion check` validates every scene in a headless browser, `genmotion render` exports MP4/WebM/GIF. Every command takes `--json`",
    "- [MCP server and commands](https://github.com/haxzie/genmotion/tree/main/packages/cli): `npx genmotion mcp` gives agents project_overview, add_scene, check_project, capture_frames (returns images), render_video and more",
    "- [Starter repo](https://github.com/haxzie/genmotion/tree/main/examples/three-starter): a ready-to-run project with AGENTS.md, CLAUDE.md, .mcp.json and a render CI workflow",
  ]);

  // Each docs page by its Markdown twin: the same words without the HTML.
  section(
    "Docs",
    getAllDocs().map((d) => `- [${d.title}](${BASE}${docMarkdownHref(d.slug)}): ${d.description}`),
  );

  section(
    "Use cases",
    USE_CASES.map(
      (u) => `- [${u.name}](${BASE}/use-cases/${u.slug}): ${u.tagline}`,
    ),
  );

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

  // Videos people have shared publicly. Bounded, because this list grows
  // without limit and a map of the site should stay a map.
  const shared = (await listSharedVideos()).slice(0, 100);
  if (shared.length > 0) {
    section(
      "Shared videos",
      shared.map((v) => `- [${v.title}](${BASE}/v/${v.slug}): a video made with GenMotion`),
    );
  }

  return new Response(out.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
