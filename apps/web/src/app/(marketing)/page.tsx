import type { Metadata } from "next";
import Link from "next/link";
import { HomeComposer } from "@/components/marketing/home-composer";
import {
  Container,
  Section,
  Eyebrow,
  GradientBlobs,
  LinkButton,
  Card,
} from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { FeatureIcon } from "@/components/marketing/icons";
import { ShowcaseGrid } from "@/components/marketing/showcase-grid";
import { FEATURES } from "@/lib/marketing/features";
import type { Faq } from "@/lib/marketing/faq";
import { getAllPosts, getAllShowcaseVideos } from "@/lib/marketing/content";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";

const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description:
    "The AI motion-video studio — describe a video and an agent animates it, then export a pixel-identical MP4.",
  url: SITE_URL,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export const metadata: Metadata = pageMetadata({
  title: "AI Product Launch Video Generator — GenMotion",
  description:
    "Generate a product launch video with AI. Describe it in plain language and GenMotion's agent animates it as real scenes, previews it frame-accurately, and exports a pixel-perfect MP4.",
  path: "/",
  ogDescription:
    "Generate a product launch video with AI — describe it, preview it frame-accurately, export a pixel-perfect MP4.",
});

const STEPS = [
  {
    icon: "chat" as const,
    title: "Describe it",
    body: "Tell the agent what you want — a product teaser, an explainer, animated stats. It writes the scenes for you.",
  },
  {
    icon: "frame" as const,
    title: "Preview it",
    body: "Scrub frame-by-frame in the browser. What you see is exactly what will render — no surprises.",
  },
  {
    icon: "timeline" as const,
    title: "Arrange it",
    body: "Reorder scenes and tune durations on a visual timeline until the pacing feels right.",
  },
  {
    icon: "export" as const,
    title: "Export it",
    body: "A headless worker renders a pixel-identical MP4, ready to post anywhere.",
  },
];

const FAQS: Faq[] = [
  {
    q: "What is GenMotion?",
    a: "GenMotion is an AI motion-video studio. You describe a video in plain language, an agent animates it as real scenes, you preview it frame-accurately in the browser, and you export a pixel-perfect MP4.",
  },
  {
    q: "Do I need design or coding experience?",
    a: "No. The agent drafts the animation from your description and you refine it by conversation. Editing tools are available when you want precise control, but they're never required.",
  },
  {
    q: "Is the export the same as the preview?",
    a: "Yes. The browser preview and the headless renderer share one deterministic runtime, so the exported MP4 is pixel-for-pixel and frame-for-frame identical to what you reviewed.",
  },
  {
    q: "What can I make with GenMotion?",
    a: "Product launch videos, animated explainers, social ads, intros and title sequences, animated data and stats, and more — in any aspect ratio for any platform.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. You can start free with no credit card — describe an idea and watch the agent animate it in minutes. Paid plans add higher resolution, no watermark, and more capacity.",
  },
];

export default async function HomePage() {
  // The authed-visitor redirect lives in the proxy (src/proxy.ts), not here:
  // reading cookies during render would make this route dynamic, and Next
  // would serve it `no-store, private` — which stops X and other social
  // crawlers from caching a link card for the site's most-shared URL.
  const latestPost = getAllPosts()[0];
  // Home shows only videos flagged `featured` in their frontmatter — latest 6
  // (getAllShowcaseVideos is already sorted newest-first).
  const showcaseVideos = getAllShowcaseVideos()
    .filter((v) => v.featured)
    .slice(0, 6);

  return (
    <>
      <JsonLd data={homeJsonLd} />
      {/* Hero */}
      <div className="relative overflow-hidden">
        <GradientBlobs />
        <Container className="relative flex flex-col items-center py-24 text-center sm:py-32">
          <Link
            href={latestPost ? `/blog/${latestPost.slug}` : "/blog"}
            className="group mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 py-1 pl-1.5 pr-3 text-[0.857rem] text-text-secondary transition-colors duration-150 hover:border-border-strong hover:text-text-primary"
          >
            <span className="rounded-full bg-green-muted px-2 py-0.5 text-[0.786rem] font-medium text-green">
              Announcement
            </span>
            Launching GenMotion
            <svg
              className="size-3.5 shrink-0 text-text-tertiary transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-text-secondary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </Link>
          <h1 className="max-w-3xl font-display text-4xl font-medium tracking-tight sm:text-6xl">
            AI Product Launch
            <br />
            Video Generator
          </h1>
          <p className="mt-6 max-w-xl text-lg text-text-secondary">
            AI-powered motion graphics editor for your product videos.
          </p>
          <div className="mt-10 flex w-full flex-col items-center">
            <HomeComposer />
            <p className="mt-4 text-[0.9rem] text-text-secondary">
              Free to start · no credit card ·{" "}
              <Link
                href="/features"
                className="text-text-secondary underline underline-offset-2 hover:text-green"
              >
                explore features
              </Link>
            </p>
          </div>
        </Container>
      </div>

      {/* Showcase gallery */}
      {showcaseVideos.length > 0 && (
        <Section className="border-t border-border">
          <Container>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <Eyebrow className="mb-4">Showcase</Eyebrow>
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Made with GenMotion
                </h2>
                <p className="mt-4 text-text-secondary">
                  Real motion videos — teasers, explainers, data stories, and
                  more — each one generated from a description.
                </p>
              </div>
              <Link
                href="/showcase"
                className="inline-flex shrink-0 items-center gap-1 text-[0.95rem] text-text-secondary transition-colors hover:text-green"
              >
                View all
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <ShowcaseGrid videos={showcaseVideos} className="mt-14" />
            <div className="mt-12 flex justify-center">
              <LinkButton href="/showcase" variant="secondary" size="lg">
                View more videos
              </LinkButton>
            </div>
          </Container>
        </Section>
      )}

      {/* How it works */}
      <Section>
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">How it works</Eyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              From idea to export in four steps
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="hover:border-border-strong">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-primary">
                    <FeatureIcon name={step.icon} className="size-5" />
                  </div>
                  <span className="font-mono text-[0.786rem] text-text-tertiary">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-[1.05rem] font-medium">{step.title}</h3>
                <p className="mt-1.5 text-[0.95rem] text-text-secondary">
                  {step.body}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Feature grid */}
      <Section className="border-t border-border">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">Everything you need</Eyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              A full studio, driven by an agent
            </h2>
            <p className="mt-4 text-text-secondary">
              Each capability has its own page — dive into the ones that matter to
              you.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Link
                key={feature.slug}
                href={`/features/${feature.slug}`}
                className="group rounded-xl border border-border bg-surface p-6 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
              >
                <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-primary">
                  <FeatureIcon name={feature.icon} className="size-5" />
                </div>
                <h3 className="mt-4 text-[1.05rem] font-medium group-hover:text-text-primary">
                  {feature.name}
                </h3>
                <p className="mt-1.5 text-[0.95rem] text-text-secondary">
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
        </Container>
      </Section>

      {/* FAQ */}
      <FaqSection items={FAQS} />

      {/* Closing CTA is provided globally by the marketing layout. */}
    </>
  );
}
