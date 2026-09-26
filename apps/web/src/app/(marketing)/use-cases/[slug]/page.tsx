import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Section, Eyebrow } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Capabilities } from "@/components/marketing/capabilities";
import { IntegrationsSection } from "@/components/marketing/integrations-section";
import {
  DetailSections,
  EditorShot,
  LandingHero,
  RelatedCards,
} from "@/components/marketing/landing";
import { ColorIcon } from "@/components/marketing/icons";
import { JsonLd } from "@/components/marketing/json-ld";
import { ShowcaseGrid } from "@/components/marketing/showcase-grid";
import { USE_CASES, getUseCase, type UseCase } from "@/lib/marketing/use-cases";
import {
  getAllShowcaseVideos,
  type ShowcaseVideo,
} from "@/lib/marketing/content";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_URL } from "@/lib/marketing/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) return { title: "Use case — GenMotion" };
  return pageMetadata({
    title: useCase.seoTitle,
    description: useCase.seoDescription,
    path: `/use-cases/${useCase.slug}`,
  });
}

/** Videos to feature below the hero — curated slugs, then category match, then
 *  featured, then anything, so a use case always shows real examples. */
function pickVideos(useCase: UseCase, all: ShowcaseVideo[]): ShowcaseVideo[] {
  if (useCase.videoSlugs?.length) {
    const bySlug = useCase.videoSlugs
      .map((s) => all.find((v) => v.slug === s))
      .filter((v): v is ShowcaseVideo => !!v);
    if (bySlug.length) return bySlug.slice(0, 6);
  }
  if (useCase.videoCategories?.length) {
    const byCat = all.filter((v) => useCase.videoCategories!.includes(v.category));
    if (byCat.length) return byCat.slice(0, 6);
  }
  const featured = all.filter((v) => v.featured);
  return (featured.length ? featured : all).slice(0, 6);
}

export default async function UseCasePage({ params }: Params) {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) notFound();

  const videos = pickVideos(useCase, getAllShowcaseVideos());
  const others = USE_CASES.filter((u) => u.slug !== useCase.slug).slice(0, 3);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Use Cases", item: `${SITE_URL}/use-cases` },
        {
          "@type": "ListItem",
          position: 3,
          name: useCase.name,
          item: `${SITE_URL}/use-cases/${useCase.slug}`,
        },
      ],
    },
    ...(videos.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${useCase.name} — examples`,
            itemListElement: videos.map((v, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "VideoObject",
                name: v.title,
                description: v.description,
                thumbnailUrl: v.poster || undefined,
                uploadDate: v.date || undefined,
                contentUrl: v.videoUrl,
                url: `${SITE_URL}/showcase/${v.slug}`,
              },
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Same shape as the homepage, down to the spacing: a use case is the
          product pointed at one job, not a different site. */}
      <LandingHero
        badge={{ label: "Use case", text: "All use cases", href: "/use-cases" }}
        title={useCase.name}
        lede={useCase.tagline}
      />

      <EditorShot />

      <IntegrationsSection />

      {/* What this use case actually looks like, before any claim about it. */}
      {videos.length > 0 && (
        <Section>
          <Container className="max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow className="mb-4">Made with GenMotion</Eyebrow>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {useCase.name}, made by an agent
              </h2>
              <p className="mt-4 text-text-secondary">{useCase.description}</p>
            </div>
            <ShowcaseGrid videos={videos} className="mt-12" />
          </Container>
        </Section>
      )}

      <HowItWorks />

      <DetailSections sections={useCase.sections} className="border-t border-border" />

      <Capabilities gradientId={`codex-${useCase.slug}`} />

      <FaqSection items={useCase.faqs} />

      <RelatedCards
        eyebrow="More use cases"
        items={others.map((u) => ({
          href: `/use-cases/${u.slug}`,
          name: u.name,
          tagline: u.tagline,
          icon: (
            <ColorIcon
              name={u.icon}
              color={u.color}
              className="flex size-10 items-center justify-center rounded-lg border"
              iconClassName="size-5"
            />
          ),
        }))}
      />
    </>
  );
}
