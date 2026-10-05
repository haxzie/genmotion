import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section } from "@/components/marketing/primitives";
import { AnswerCallout, AnswerGenMotion, AnswerGrid, AnswerSidebarCard, ToolPill } from "@/components/marketing/answers";
import { Prose } from "@/components/marketing/prose";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { KIND_LABEL, TOOL_META, answerMarkdownHref, getRelatedAnswers, parseAnswerBody } from "@/lib/marketing/answers";
import { getAllAnswers, getAnswerBySlug } from "@/lib/marketing/content";
import { formatDate } from "@/lib/marketing/format";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllAnswers().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const answer = getAnswerBySlug(slug);
  if (!answer) return { title: "Answers — GenMotion" };
  return pageMetadata({
    title: `${answer.title} — GenMotion`,
    description: answer.description,
    path: `/answers/${answer.slug}`,
    type: "article",
    publishedTime: answer.date,
    modifiedTime: answer.updated || answer.date,
    ogTitle: answer.title,
    image: null, // generated per-answer by ./opengraph-image.tsx
  });
}

export default async function AnswerPage({ params }: Params) {
  const { slug } = await params;
  const answer = getAnswerBySlug(slug);
  if (!answer) notFound();

  const tool = TOOL_META[answer.tool];
  const related = getRelatedAnswers(answer);
  const url = `${SITE_URL}/answers/${answer.slug}`;

  const crumbs = [
    { name: "Home", item: SITE_URL },
    { name: "Answers", item: `${SITE_URL}/answers` },
    ...(tool.href ? [{ name: tool.name, item: `${SITE_URL}${tool.href}` }] : []),
    { name: answer.title, item: url },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: answer.title,
      description: answer.description,
      datePublished: answer.date,
      dateModified: answer.updated || answer.date,
      author: { "@type": "Organization", name: SITE_NAME },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
      },
      url,
      mainEntityOfPage: url,
      about: tool.name,
      ...(answer.sources.length > 0 ? { citation: answer.sources.map((s) => s.url) } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.item,
      })),
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Section>
        <Container className="max-w-6xl">
          {/* Two columns from xl: the article, and a card that stays in view beside it.
              Below that it is one column, and the card is simply not shown: the closing
              section at the end of the article carries the same offer. */}
          <div className="grid justify-center gap-x-14 xl:grid-cols-[minmax(0,48rem)_19rem]">
          <article className="mx-auto w-full max-w-3xl xl:max-w-none">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 text-[0.9rem] text-text-tertiary">
            <Link href="/answers" className="transition-colors hover:text-green">
              Answers
            </Link>
            {tool.href && (
              <>
                <span aria-hidden>/</span>
                <Link href={tool.href} className="transition-colors hover:text-green">
                  {tool.name}
                </Link>
              </>
            )}
          </nav>

          <header className="mt-8 border-b border-border pb-8">
            <div className="flex flex-wrap items-center gap-3 text-[0.857rem] text-text-tertiary">
              <ToolPill tool={answer.tool} />
              <span>{KIND_LABEL[answer.kind]}</span>
              <span>·</span>
              <time dateTime={answer.updated || answer.date}>
                Updated {formatDate(answer.updated || answer.date)}
              </time>
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">{answer.title}</h1>
            <p className="mt-4 text-lg text-text-secondary">{answer.description}</p>

            {answer.errors.length > 0 && (
              <div className="mt-6 flex flex-col gap-2">
                {answer.errors.map((e) => (
                  <pre
                    key={e}
                    className="overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-[0.9rem] leading-relaxed text-text-primary"
                  >
                    {e}
                  </pre>
                ))}
              </div>
            )}
          </header>

          <div className="mt-10 space-y-10">
            {parseAnswerBody(answer.body).map((block, i) => {
              if (block.type === "markdown") return <Prose key={i}>{block.content}</Prose>;
              const callout = answer.callouts[block.key];
              return callout ? <AnswerCallout key={i} {...callout} /> : null;
            })}
          </div>

          {answer.genmotion && (
            <AnswerGenMotion heading={answer.genmotion.heading} body={answer.genmotion.body} />
          )}

          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-xl font-semibold tracking-tight">Related answers</h2>
              <div className="mt-5">
                <AnswerGrid answers={related} showTool />
              </div>
            </div>
          )}

          {answer.sources.length > 0 && (
            <div className="mt-16 border-t border-border pt-8">
              <h2 className="text-[0.95rem] font-semibold text-text-primary">Sources</h2>
              <ul className="mt-3 flex flex-col gap-1.5 text-[0.9rem] text-text-tertiary">
                {answer.sources.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      rel="noopener"
                      className="underline underline-offset-2 transition-colors hover:text-green"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[0.857rem] text-text-tertiary">
                This answer as plain Markdown, for agents:{" "}
                <a href={answerMarkdownHref(answer.slug)} className="underline underline-offset-2 hover:text-green">
                  {answerMarkdownHref(answer.slug)}
                </a>
              </p>
            </div>
          )}
          </article>
          <aside className="hidden xl:block" aria-label="About GenMotion">
            <div className="sticky top-24 pt-[4.25rem]">
              <AnswerSidebarCard tool={answer.tool} />
            </div>
          </aside>
          </div>
        </Container>
      </Section>
      <FaqSection items={answer.faqs} />
    </>
  );
}
