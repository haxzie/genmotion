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
import { FaqSection } from "@/components/marketing/faq";
import { FeatureIcon } from "@/components/marketing/icons";
import { FEATURES, getFeature } from "@/lib/marketing/features";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) return { title: "Feature — GenMotion" };
  return {
    title: `${feature.name} — GenMotion`,
    description: feature.tagline,
    openGraph: {
      title: `${feature.name} — GenMotion`,
      description: feature.tagline,
      type: "article",
    },
  };
}

export default async function FeaturePage({ params }: Params) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) notFound();

  const others = FEATURES.filter((f) => f.slug !== feature.slug).slice(0, 3);

  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <GradientBlobs />
        <Container className="relative py-20 sm:py-28">
          <Link
            href="/features"
            className="inline-flex items-center gap-1.5 text-[0.9rem] text-text-tertiary transition-colors hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H6M11 6l-6 6 6 6" />
            </svg>
            All features
          </Link>
          <div className="mt-8 flex size-12 items-center justify-center rounded-xl border border-border bg-surface-raised text-text-primary">
            <FeatureIcon name={feature.icon} className="size-6" />
          </div>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {feature.name}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-text-secondary">
            {feature.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/signup" size="lg">
              Start free
            </LinkButton>
            <LinkButton href="/features" variant="secondary" size="lg">
              See all features
            </LinkButton>
          </div>
        </Container>
      </div>

      {/* Detail sections — alternating */}
      <Section>
        <Container>
          <div className="mx-auto flex max-w-3xl flex-col gap-14">
            {feature.sections.map((section, i) => (
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

      <FaqSection items={feature.faqs} />

      {/* Other features */}
      <Section className="border-t border-border">
        <Container>
          <Eyebrow className="mb-6">Keep exploring</Eyebrow>
          <div className="grid gap-5 sm:grid-cols-3">
            {others.map((other) => (
              <Link
                key={other.slug}
                href={`/features/${other.slug}`}
                className="group rounded-xl border border-border bg-surface p-6 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
              >
                <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-primary">
                  <FeatureIcon name={other.icon} className="size-5" />
                </div>
                <h3 className="mt-4 text-[1.05rem] font-medium">{other.name}</h3>
                <p className="mt-1.5 text-[0.95rem] text-text-secondary">
                  {other.tagline}
                </p>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
