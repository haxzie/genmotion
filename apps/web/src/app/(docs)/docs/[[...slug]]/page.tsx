import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocContent } from "@/components/docs/doc-content";
import { PageActions } from "@/components/docs/page-actions";
import { TableOfContents } from "@/components/docs/toc";
import { JsonLd } from "@/components/marketing/json-ld";
import { faqPageJsonLd } from "@/lib/marketing/faq";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import { DOCS_PATH } from "@/lib/marketing/setup";
import {
  DOCS_HOME,
  docHref,
  docMarkdownHref,
  docToMarkdown,
  docUrl,
  getAllDocs,
  getDoc,
  getHeadings,
  getPrevNext,
  parseDocBody,
  slugify,
  type Doc,
} from "@/lib/docs/content";

type Params = { params: Promise<{ slug?: string[] }> };

const REPO_CONTENT = "https://github.com/haxzie/genmotion/blob/main/apps/web/content/docs";

// Every page is known at build time; anything else is a 404, not a render.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDocs().map((d) => ({ slug: d.slug === DOCS_HOME ? [] : [d.slug] }));
}

function resolve(slug: string[] | undefined): Doc | undefined {
  if (!slug || slug.length === 0) return getDoc(DOCS_HOME);
  // The introduction lives at /docs; /docs/introduction would be a duplicate.
  if (slug.length !== 1 || slug[0] === DOCS_HOME) return undefined;
  return getDoc(slug[0]!);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const doc = resolve((await params).slug);
  if (!doc) return {};
  const isHome = doc.slug === DOCS_HOME;
  return {
    ...pageMetadata({
      title: isHome ? "GenMotion Docs: make videos with Claude Code, Codex and Cursor" : `${doc.seoTitle} · GenMotion Docs`,
      description: doc.description,
      path: docHref(doc.slug),
      type: "article",
      modifiedTime: doc.updated || undefined,
      ogTitle: doc.title,
      image: { url: `/docs-og/${doc.slug}`, width: 1200, height: 630, alt: `${doc.title}: GenMotion Docs` },
    }),
    keywords: doc.keywords,
    alternates: {
      canonical: docUrl(doc.slug),
      types: { "text/markdown": `${SITE_URL}${docMarkdownHref(doc.slug)}` },
    },
  };
}

function structuredData(doc: Doc) {
  const url = docUrl(doc.slug);
  const org = { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` } };
  const data: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: doc.title,
      description: doc.description,
      url,
      mainEntityOfPage: url,
      inLanguage: "en-US",
      ...(doc.updated ? { dateModified: doc.updated } : {}),
      keywords: doc.keywords.join(", "),
      articleSection: doc.group,
      image: `${SITE_URL}/docs-og/${doc.slug}`,
      author: org,
      publisher: org,
      isPartOf: { "@type": "WebSite", name: `${SITE_NAME} Docs`, url: `${SITE_URL}${DOCS_PATH}` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Docs", item: `${SITE_URL}${DOCS_PATH}` },
        ...(doc.slug === DOCS_HOME ? [] : [{ "@type": "ListItem", position: 3, name: doc.title, item: url }]),
      ],
    },
  ];

  // A page whose body is a numbered procedure is a HowTo.
  const steps = parseDocBody(doc.body).find((b) => b.type === "steps");
  if (steps?.type === "steps" && steps.steps.length >= 2) {
    data.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: doc.title,
      description: doc.description,
      step: steps.steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.body.replace(/```[\s\S]*?```/g, "").replace(/[`*]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim() || s.title,
        url: `${url}#${slugify(s.title)}`,
      })),
    });
  }
  if (doc.faqs.length) data.push(faqPageJsonLd(doc.faqs));
  return data;
}

export default async function DocPage({ params }: Params) {
  const doc = resolve((await params).slug);
  if (!doc) notFound();

  const headings = getHeadings(doc);
  const { prev, next } = getPrevNext(doc.slug);

  return (
    <>
      <JsonLd data={structuredData(doc)} />
      <div className="flex gap-12 xl:gap-16">
        <article className="min-w-0 flex-1 px-0 py-10 sm:py-12 lg:pl-12 xl:pl-16">
          <div className="mx-auto max-w-[46rem]">
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[0.85rem]">
              <Link href={DOCS_PATH} className="text-text-tertiary transition-colors hover:text-text-secondary">
                Docs
              </Link>
              <span aria-hidden className="text-text-tertiary">/</span>
              <span className="font-medium text-green">{doc.group}</span>
            </nav>
            <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-display text-[2.1rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">{doc.title}</h1>
                <p className="mt-3 text-[1.1rem] leading-relaxed text-text-secondary">{doc.description}</p>
              </div>
              <PageActions markdown={docToMarkdown(doc)} markdownUrl={`${SITE_URL}${docMarkdownHref(doc.slug)}`} />
            </header>

            <div className="pt-8">
              <DocContent body={doc.body} />
            </div>

            {doc.faqs.length > 0 && (
              <section aria-labelledby="faq" className="mt-14">
                <h2 id="faq" className="scroll-mt-24 font-display text-[1.6rem] font-semibold tracking-tight">
                  Common questions
                </h2>
                <div className="mt-5 divide-y divide-border rounded-xl border border-border">
                  {doc.faqs.map((f) => (
                    <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-text-primary">
                        {f.q}
                        <span aria-hidden className="text-text-tertiary transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-3 leading-relaxed text-text-secondary">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            <footer className="mt-16 border-t border-border pt-8">
              <nav aria-label="Previous and next page" className="grid gap-4 sm:grid-cols-2">
                {prev ? (
                  <Link href={docHref(prev.slug)} className="group rounded-xl border border-border p-4 transition-colors hover:border-green/40 hover:bg-surface">
                    <span className="text-[0.8rem] text-text-tertiary">Previous</span>
                    <span className="mt-1 flex items-center gap-1.5 font-medium text-text-primary group-hover:text-green">
                      <span aria-hidden>←</span> {prev.title}
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link href={docHref(next.slug)} className="group rounded-xl border border-border p-4 text-right transition-colors hover:border-green/40 hover:bg-surface">
                    <span className="text-[0.8rem] text-text-tertiary">Next</span>
                    <span className="mt-1 flex items-center justify-end gap-1.5 font-medium text-text-primary group-hover:text-green">
                      {next.title} <span aria-hidden>→</span>
                    </span>
                  </Link>
                )}
              </nav>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[0.85rem] text-text-tertiary">
                <a href={`${REPO_CONTENT}/${doc.slug}.md`} target="_blank" rel="noreferrer" className="transition-colors hover:text-text-primary">
                  Edit this page on GitHub
                </a>
                {doc.updated && (
                  <span>
                    Updated{" "}
                    <time dateTime={doc.updated}>
                      {new Date(`${doc.updated}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}
                    </time>
                  </span>
                )}
              </div>
            </footer>
          </div>
        </article>

        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto py-12 xl:block">
          <TableOfContents headings={doc.faqs.length ? [...headings, { id: "faq", text: "Common questions", level: 2 }] : headings} />
        </aside>
      </div>
    </>
  );
}
