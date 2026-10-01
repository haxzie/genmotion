import { docToMarkdown, getAllDocs, getDoc } from "@/lib/docs/content";

/**
 * A docs page as Markdown, served at `/docs/<slug>.md` (and `/docs.md`) by the
 * rewrites in next.config.ts. This is the URL `llms.txt`, the "View as
 * Markdown" action and the setup prompt's agents read: the same words as the
 * page, without the HTML around them.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDocs().map((d) => ({ slug: d.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const doc = getDoc((await params).slug);
  if (!doc) return new Response("Not found\n", { status: 404 });
  return new Response(docToMarkdown(doc), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      // The HTML page is the one to index; this is its plain-text twin.
      "X-Robots-Tag": "noindex",
    },
  });
}
