import type { Metadata } from "next";
import { Container, Section, Eyebrow } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { ShowcaseBrowser } from "@/components/marketing/showcase-browser";
import { JsonLd } from "@/components/marketing/json-ld";
import { getAllShowcaseVideos } from "@/lib/marketing/content";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

const FAQS: Faq[] = [
  {
    q: "What is the GenMotion showcase?",
    a: "A gallery of real motion videos made with GenMotion — product teasers, explainers, data stories, brand reels, and social ads — each generated from a description and refined on the timeline.",
  },
  {
    q: "Can I make videos like these?",
    a: "Yes. Every video here started as a plain-language prompt. Describe your idea on the homepage and the agent will animate a first draft in minutes.",
  },
  {
    q: "Are these rendered in the browser?",
    a: "The browser preview and the headless renderer share one deterministic runtime, so the exported MP4 is pixel-for-pixel identical to what the creator reviewed.",
  },
];

export const metadata: Metadata = {
  title: "Showcase — GenMotion",
  description:
    "A gallery of real motion videos made with GenMotion — teasers, explainers, data stories, brand reels, and social ads.",
  openGraph: {
    title: "Showcase — GenMotion",
    description:
      "Real motion videos made with GenMotion, each generated from a description.",
    type: "website",
  },
};

export default function ShowcaseIndexPage() {
  const videos = getAllShowcaseVideos();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} Showcase`,
    url: `${SITE_URL}/showcase`,
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
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Section>
        <Container>
          <div className="max-w-2xl">
            <Eyebrow className="mb-4">Showcase</Eyebrow>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Made with GenMotion
            </h1>
            <p className="mt-5 text-lg text-text-secondary">
              A gallery of real motion videos — each one started as a sentence,
              then refined scene-by-scene on the timeline.
            </p>
          </div>

          {videos.length > 0 ? (
            <div className="mt-14">
              <ShowcaseBrowser videos={videos} />
            </div>
          ) : (
            <p className="mt-14 text-text-tertiary">
              No videos yet — check back soon.
            </p>
          )}
        </Container>
      </Section>
      <FaqSection items={FAQS} />
    </>
  );
}
