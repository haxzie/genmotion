import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { TemplatePlayer } from "@/components/marketing/template-player";
import { TemplateRemixButton } from "@/components/marketing/template-remix-button";
import { getAllTemplateSummaries, getTemplateSummary, templateApiUrl } from "@/lib/marketing/templates";
import { templateFaqs } from "@/lib/marketing/template-faq";
import { pageMetadata, TEMPLATES_OG_IMAGE } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";

type Params = { params: Promise<{ id: string }> };

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export async function generateStaticParams() {
  try {
    return (await getAllTemplateSummaries()).map((t) => ({ id: t.id }));
  } catch {
    // Falls back to rendering each page on demand instead of failing the
    // whole site's build over a build-time hiccup reaching the API.
    return [];
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const summary = await getTemplateSummary(id);
  if (!summary) return { title: "Templates — GenMotion" };
  return pageMetadata({
    title: summary.metaTitle,
    description: summary.description,
    path: `/templates/${summary.id}`,
    type: "video.other",
    ogTitle: summary.title,
    // Not the template's own poster: that's designed to read at gallery-card
    // size, in the template's own aspect ratio — cropping it into a 1200×630
    // link preview would cut off exactly the parts that make it legible.
    image: TEMPLATES_OG_IMAGE,
  });
}

export default async function TemplateDetailPage({ params }: Params) {
  const { id } = await params;
  const summary = await getTemplateSummary(id);
  if (!summary) notFound();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: summary.title,
      description: summary.description,
      thumbnailUrl: templateApiUrl(summary.posterPath),
      duration: `PT${Math.round(summary.durationInFrames / summary.fps)}S`,
      contentUrl: templateApiUrl(summary.posterPath),
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
      },
      url: `${SITE_URL}/templates/${summary.id}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Templates", item: `${SITE_URL}/templates` },
        {
          "@type": "ListItem",
          position: 3,
          name: summary.title,
          item: `${SITE_URL}/templates/${summary.id}`,
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Section>
        <Container className="max-w-4xl">
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 text-[0.9rem] text-text-tertiary transition-colors hover:text-green"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H6M11 6l-6 6 6 6" />
            </svg>
            All templates
          </Link>

          <header className="mt-8">
            <div className="flex flex-wrap items-center gap-3 text-[0.857rem] text-text-tertiary">
              <span>
                {summary.width}×{summary.height}
              </span>
              <span>·</span>
              <span>{formatDuration(summary.durationInFrames / summary.fps)}</span>
              <span>·</span>
              <span>
                {summary.sceneCount} {summary.sceneCount === 1 ? "scene" : "scenes"}
              </span>
              {summary.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border px-2.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
              {summary.title}
            </h1>
            <p className="mt-4 text-lg text-text-secondary">{summary.description}</p>
          </header>

          <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-raised px-5 py-4">
            <p className="text-text-secondary">Remix this into a project of your own.</p>
            <TemplateRemixButton templateId={summary.id} />
          </div>

          <div className="mt-8">
            <TemplatePlayer summary={summary} />
          </div>
        </Container>
      </Section>
      <FaqSection items={templateFaqs(summary)} />
    </>
  );
}
