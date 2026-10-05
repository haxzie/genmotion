import { answerToMarkdown } from "@/lib/marketing/answers";
import { getAllAnswers, getAnswerBySlug } from "@/lib/marketing/content";

/**
 * An answer as Markdown, served at `/answers/<slug>.md` by the rewrite in
 * next.config.ts. The same words as the page without the HTML, for agents and
 * llms.txt, which is how a good share of the people with these errors will
 * actually ask: they hand the error to a coding agent, not a search box.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllAnswers().map((a) => ({ slug: a.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const answer = getAnswerBySlug((await params).slug);
  if (!answer) return new Response("Not found\n", { status: 404 });
  return new Response(answerToMarkdown(answer), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      // The HTML page is the one to index; this is its plain-text twin.
      "X-Robots-Tag": "noindex",
    },
  });
}
