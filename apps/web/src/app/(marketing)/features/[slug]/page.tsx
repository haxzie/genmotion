import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
import { FeatureIcon } from "@/components/marketing/icons";
import { FEATURES, getFeature } from "@/lib/marketing/features";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_URL } from "@/lib/marketing/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) return { title: "Feature — GenMotion" };
  return pageMetadata({
    title: `${feature.name} — GenMotion`,
    description: feature.tagline,
    path: `/features/${feature.slug}`,
    type: "article",
  });
}

export default async function FeaturePage({ params }: Params) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) notFound();

  const others = FEATURES.filter((f) => f.slug !== feature.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Features", item: `${SITE_URL}/features` },
      { "@type": "ListItem", position: 3, name: feature.name, item: `${SITE_URL}/features/${feature.slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* The homepage's shape, with one capability in the headline slot. */}
      <LandingHero
        badge={{ label: "Feature", text: "All features", href: "/features" }}
        title={feature.name}
        lede={feature.tagline}
      />

      <EditorShot />

      <IntegrationsSection />

      <DetailSections sections={feature.sections} />

      <HowItWorks />

      <Capabilities gradientId={`codex-${feature.slug}`} />

      <FaqSection items={feature.faqs} />

      <RelatedCards
        eyebrow="Keep exploring"
        items={others.map((other) => ({
          href: `/features/${other.slug}`,
          name: other.name,
          tagline: other.tagline,
          icon: (
            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-primary">
              <FeatureIcon name={other.icon} className="size-5" />
            </div>
          ),
        }))}
      />
    </>
  );
}
