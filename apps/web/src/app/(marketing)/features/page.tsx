import type { Metadata } from "next";
import Link from "next/link";
import {
  Container,
  Section,
  Eyebrow,
  LinkButton,
} from "@/components/marketing/primitives";
import { DownloadButton } from "@/components/marketing/download-button";
import { FaqSection } from "@/components/marketing/faq";
import { FeatureIcon } from "@/components/marketing/icons";
import { FEATURES } from "@/lib/marketing/features";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

const featuresJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "GenMotion Features",
  url: `${SITE_URL}/features`,
  itemListElement: FEATURES.map((f, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: f.name,
    url: `${SITE_URL}/features/${f.slug}`,
  })),
};

const FAQS: Faq[] = [
  {
    q: "How do GenMotion's features work together?",
    a: "An agent authors animated scenes from your prompt, you preview them frame-accurately and arrange them on a timeline, then export a pixel-identical MP4 — with text presets, AI voiceover, and brand extraction available throughout.",
  },
  {
    q: "Do I have to use every feature?",
    a: "No. Start with what you need today — each capability works on its own, and they compose when you want more.",
  },
  {
    q: "Is GenMotion free to try?",
    a: "Yes. You can start free with no credit card and explore the full workflow before upgrading.",
  },
];

export const metadata: Metadata = pageMetadata({
  title: "Features — GenMotion",
  description:
    "Explore everything in the GenMotion studio: AI scene authoring, frame-accurate preview, a timeline editor, pixel-identical export, kinetic type, AI voiceover, and brand extraction.",
  path: "/features",
});

export default function FeaturesIndexPage() {
  return (
    <>
      <JsonLd data={featuresJsonLd} />
      <Section className="pb-10">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">Features</Eyebrow>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              A full motion studio, driven by an agent
            </h1>
            <p className="mt-5 text-lg text-text-secondary">
              Every capability below has its own page. Start with what you need
              today — they all work together.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="pt-4">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Link
                key={feature.slug}
                href={`/features/${feature.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-surface p-6 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
              >
                <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-primary">
                  <FeatureIcon name={feature.icon} className="size-5" />
                </div>
                <h2 className="mt-4 text-[1.1rem] font-medium">{feature.name}</h2>
                <p className="mt-1.5 flex-1 text-[0.95rem] text-text-secondary">
                  {feature.tagline}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-[0.9rem] text-text-tertiary transition-colors group-hover:text-text-primary">
                  Learn more
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <DownloadButton size="lg" />
          </div>
        </Container>
      </Section>

      <FaqSection items={FAQS} />
    </>
  );
}
