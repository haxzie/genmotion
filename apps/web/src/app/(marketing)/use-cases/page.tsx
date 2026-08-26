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
import { ColorIcon } from "@/components/marketing/icons";
import { JsonLd } from "@/components/marketing/json-ld";
import { USE_CASES } from "@/lib/marketing/use-cases";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

const FAQS: Faq[] = [
  {
    q: "What kinds of videos can I make with GenMotion?",
    a: "Product launches, SaaS explainers, Product Hunt videos, feature announcements, event promos, data stories, and social ads — all from a plain-language prompt, animated as real scenes and exported as a pixel-identical MP4.",
  },
  {
    q: "Do I pick a template for each use case?",
    a: "No templates. You describe the video and the agent authors the scenes for your specific product and message — every use case starts from your prompt, not a fill-in-the-blank layout.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "GenMotion Use Cases",
  url: `${SITE_URL}/use-cases`,
  itemListElement: USE_CASES.map((u, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: u.name,
    url: `${SITE_URL}/use-cases/${u.slug}`,
  })),
};

export const metadata: Metadata = pageMetadata({
  title: "Use Cases — AI Video for Launches, Explainers & Ads | GenMotion",
  description:
    "See what you can make with GenMotion: product launch videos, SaaS explainers, Product Hunt videos, feature announcements, event promos, data stories, and social ads — all from a prompt.",
  path: "/use-cases",
});

export default function UseCasesIndexPage() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <Section className="pb-10">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">Use Cases</Eyebrow>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Every kind of video, from one prompt
            </h1>
            <p className="mt-5 text-lg text-text-secondary">
              GenMotion animates the video you need — launch trailers, explainers,
              promos, and ads — then exports a pixel-identical MP4. Pick a use case
              to see real examples.
            </p>
            <div className="mt-7 flex justify-center">
              <DownloadButton size="lg" />
            </div>
          </div>
        </Container>
      </Section>

      <Section className="pt-4">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <Link
                key={u.slug}
                href={`/use-cases/${u.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong hover:bg-surface-hover"
              >
                <ColorIcon
                  name={u.icon}
                  color={u.color}
                  className="flex size-10 items-center justify-center rounded-lg border"
                  iconClassName="size-5"
                />
                <h2 className="mt-4 text-[1.05rem] font-medium tracking-tight">
                  {u.name}
                </h2>
                <p className="mt-1.5 flex-1 text-[0.95rem] text-text-secondary">
                  {u.tagline}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-[0.9rem] text-accent">
                  Explore use case
                  <svg viewBox="0 0 24 24" className="size-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <FaqSection items={FAQS} />
    </>
  );
}
