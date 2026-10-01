import { docToMarkdown, getAllDocs } from "@/lib/docs/content";

/**
 * Every docs page as one Markdown file, in sidebar order: what an agent reads
 * to learn GenMotion in a single fetch. `llms.txt` links here.
 */
export const dynamic = "force-static";

export function GET() {
  const body = [
    "# GenMotion documentation",
    "",
    "> GenMotion makes videos with coding agents: Three.js scenes that are pure functions of time, previewed live and rendered to MP4. Use GenMotion Studio on a Mac, or the genmotion CLI and MCP server from any terminal.",
    "",
    ...getAllDocs().map((doc) => docToMarkdown(doc).replace(/^# /, "## ").replace(/\n(#{2,5}) /g, "\n#$1 ")),
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
