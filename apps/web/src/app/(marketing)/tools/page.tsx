import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, Eyebrow } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { FeatureIcon } from "@/components/marketing/icons";
import { JsonLd } from "@/components/marketing/json-ld";
import { TOOLS } from "@/lib/marketing/tools";
import { SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

const toolsJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Free Tools for Video Creators",
  url: `${SITE_URL}/tools`,
  itemListElement: TOOLS.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "SoftwareApplication",
      name: t.name,
      description: t.description,
      url: `${SITE_URL}/tools/${t.slug}`,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  })),
};

const FAQS: Faq[] = [
  {
    q: "Are these tools free?",
    a: "Yes — every tool here is completely free, runs in your browser, and requires no sign-up.",
  },
  {
    q: "Do I need a GenMotion account to use them?",
    a: "No account is needed. The tools are standalone utilities; GenMotion itself is the AI studio you can try separately when you're ready to make a video.",
  },
  {
    q: "Will you add more tools?",
    a: "Yes. We'll keep adding calculators and references that help video creators — check back, or start with the ones here.",
  },
];

export const metadata: Metadata = {
  title: "Free Tools — GenMotion",
  description:
    "Free, no-signup calculators and references for video creators: aspect ratios, timecode, file size, and social media dimensions.",
};

export default function ToolsIndexPage() {
  return (
    <>
      <JsonLd data={toolsJsonLd} />
      <Section>
      <Container>
        <div className="max-w-2xl">
          <Eyebrow className="mb-4">Free Tools</Eyebrow>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Free tools for video creators
          </h1>
          <p className="mt-5 text-lg text-text-secondary">
            Handy calculators and references — no account required. We&apos;ll keep
            adding to these.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="group flex items-start gap-4 rounded-xl border border-border bg-surface p-6 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-primary">
                <FeatureIcon name={tool.icon} className="size-5" />
              </div>
              <div>
                <h2 className="text-[1.1rem] font-medium transition-colors group-hover:text-text-primary">
                  {tool.name}
                </h2>
                <p className="mt-1.5 text-[0.95rem] text-text-secondary">
                  {tool.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
      </Section>
      <FaqSection items={FAQS} />
    </>
  );
}
