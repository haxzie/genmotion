import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Container,
  Section,
  Eyebrow,
  GradientBlobs,
  LinkButton,
} from "@/components/marketing/primitives";
import { DownloadButton } from "@/components/marketing/download-button";
import { FaqSection } from "@/components/marketing/faq";
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

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <GradientBlobs />
        <Container className="relative py-20 sm:py-28">
          <Link
            href="/use-cases"
            className="inline-flex items-center gap-1.5 text-[0.9rem] text-text-tertiary transition-colors hover:text-green"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H6M11 6l-6 6 6 6" />
            </svg>
            All use cases
          </Link>
          <ColorIcon
            name={useCase.icon}
            color={useCase.color}
            className="mt-8 flex size-12 items-center justify-center rounded-xl border"
            iconClassName="size-6"
          />
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {useCase.name}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-text-secondary">
            {useCase.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <DownloadButton size="lg" />
            <LinkButton href="/showcase" variant="secondary" size="lg">
              See the showcase
            </LinkButton>
          </div>
        </Container>
      </div>

      {/* Showcase videos — "here's what we can do" */}
      {videos.length > 0 && (
        <Section>
          <Container>
            <Eyebrow className="mb-2">Made with GenMotion</Eyebrow>
            <h2 className="max-w-2xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {useCase.tagline}
            </h2>
            <ShowcaseGrid videos={videos} className="mt-8" />
          </Container>
        </Section>
      )}

      {/* Detail sections */}
      {useCase.sections.length > 0 && (
        <Section className="border-t border-border">
          <Container>
            <div className="mx-auto flex max-w-3xl flex-col gap-14">
              {useCase.sections.map((section, i) => (
                <div key={section.heading} className="flex flex-col gap-4 sm:flex-row sm:gap-8">
                  <div className="shrink-0">
                    <span className="font-mono text-[0.857rem] text-text-tertiary">
                      0{i + 1}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">
                      {section.heading}
                    </h2>
                    <p className="mt-3 text-text-secondary">{section.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </Section>
      )}

      <FaqSection items={useCase.faqs} />

      {/* Other use cases */}
      <Section className="border-t border-border">
        <Container>
          <Eyebrow className="mb-6">More use cases</Eyebrow>
          <div className="grid gap-5 sm:grid-cols-3">
            {others.map((u) => (
              <Link
                key={u.slug}
                href={`/use-cases/${u.slug}`}
                className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-hover"
              >
                <ColorIcon
                  name={u.icon}
                  color={u.color}
                  className="flex size-9 items-center justify-center rounded-lg border"
                  iconClassName="size-4.5"
                />
                <div className="mt-3 font-medium">{u.name}</div>
                <div className="mt-1 text-[0.9rem] text-text-secondary">{u.tagline}</div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
