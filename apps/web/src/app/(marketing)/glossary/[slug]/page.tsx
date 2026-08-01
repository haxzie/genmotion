import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section, LinkButton } from "@/components/marketing/primitives";
import { Prose } from "@/components/marketing/prose";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { getAllTerms, getTermBySlug } from "@/lib/marketing/content";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_URL } from "@/lib/marketing/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllTerms().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const term = getTermBySlug(slug);
  if (!term) return { title: "Glossary — GenMotion" };
  return pageMetadata({
    title: `${term.term} — GenMotion Glossary`,
    description: term.description,
    path: `/glossary/${term.slug}`,
    type: "article",
  });
}

export default async function GlossaryTermPage({ params }: Params) {
  const { slug } = await params;
  const term = getTermBySlug(slug);
  if (!term) notFound();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: term.term,
      description: term.description,
      url: `${SITE_URL}/glossary/${term.slug}`,
      inDefinedTermSet: `${SITE_URL}/glossary`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Glossary", item: `${SITE_URL}/glossary` },
        {
          "@type": "ListItem",
          position: 3,
          name: term.term,
          item: `${SITE_URL}/glossary/${term.slug}`,
        },
      ],
    },
  ];

  return (
    <>
    <JsonLd data={jsonLd} />
    <Section>
      <Container className="max-w-3xl">
        <Link
          href="/glossary"
          className="inline-flex items-center gap-1.5 text-[0.9rem] text-text-tertiary transition-colors hover:text-green"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H6M11 6l-6 6 6 6" />
          </svg>
          Back to glossary
        </Link>

        <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">
          {term.term}
        </h1>
        <p className="mt-4 text-lg text-text-secondary">{term.description}</p>

        <div className="mt-8 border-t border-border pt-8">
          <Prose>{term.body}</Prose>
        </div>

        <div className="mt-16 flex items-center justify-between gap-4 border-t border-border pt-10">
          <p className="text-text-secondary">
            Put these ideas into motion.
          </p>
          <LinkButton href="/signup">Start free</LinkButton>
        </div>
      </Container>
    </Section>
    <FaqSection items={term.faqs} />
    </>
  );
}
