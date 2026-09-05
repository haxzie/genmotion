import type { Metadata } from "next";
import Link from "next/link";
import { DownloadButton } from "@/components/marketing/download-button";
import { InstallCommand } from "@/components/marketing/install-command";
import { getLatestRelease, formatSize } from "@/lib/marketing/latest-release";
import {
  Container,
  Section,
  Eyebrow,
  GradientBlobs,
  CoolGradientBlobs,
  LinkButton,
  Card,
} from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { FeatureIcon } from "@/components/marketing/icons";
import { ShowcaseStack } from "@/components/marketing/showcase-stack";
import { TiltedScreenshot } from "@/components/marketing/tilted-screenshot";
import { AgentBadges } from "@/components/marketing/agent-badges";
import { TemplateMasonry } from "@/components/marketing/template-masonry";
import { FEATURES } from "@/lib/marketing/features";
import type { Faq } from "@/lib/marketing/faq";
import { getPostBySlug, getAllShowcaseVideos } from "@/lib/marketing/content";
import { getTemplatesPage } from "@/lib/marketing/templates";
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

/** The launch announcement the hero badge points at. */
const LAUNCH_POST_SLUG = "introducing-genmotion-ai-motion-video-studio";

/**
 * Features hidden from the home grid only. They keep their own pages and stay
 * in /features, the sitemap, llms.txt, and the related-features rail — this
 * list just trims what the homepage leads with.
 */
const FEATURES_HIDDEN_ON_HOME = new Set(["brand-extraction"]);

export default async function HomePage() {
  // The authed-visitor redirect lives in the proxy (src/proxy.ts), not here:
  // reading cookies during render would make this route dynamic, and Next
  // would serve it `no-store, private` — which stops X and other social
  // crawlers from caching a link card for the site's most-shared URL.
  // The hero badge is pinned to the launch announcement, not the newest post:
  // its label reads "Launching GenMotion", so following the latest post sent
  // people to whatever shipped most recently under an announcement banner.
  // Resolved by slug rather than a bare href so it degrades to /blog if the
  // post is ever renamed, instead of linking to a 404.
  const launchPost = getPostBySlug(LAUNCH_POST_SLUG);
  // Version and size under the download button. Null when GitHub is
  // unreachable or nothing is published — the button still works, it just
  // says less.
  const release = await getLatestRelease();
  // Home shows only videos flagged `featured` in their frontmatter — the
  // latest 3, which is what the card stack below fans out
  // (getAllShowcaseVideos is already sorted newest-first).
  const showcaseVideos = getAllShowcaseVideos()
    .filter((v) => v.featured)
    .slice(0, 3);
  // The catalog's own `order` is the curation — the first page of it is
  // already "the top 6" by construction, not something picked here. Two full
  // rows at the section's 3-column width — a single row of 3 read as sparse
  // against the section's width once the catalog grew past a handful.
  const templatesPage = await getTemplatesPage({ limit: 6 });
  const templates = templatesPage?.templates ?? [];

  return (
    <>
      <JsonLd data={homeJsonLd} />
      {/* Hero */}
      <div className="relative overflow-hidden">
        <GradientBlobs />
        {/* Fades the hue down into the page background so the showcase card
            below can sit over it cleanly — same treatment as the dashboard. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        {/* Extra bottom padding is the room the showcase card is pulled up into. */}
        <Container className="relative flex flex-col items-center pb-32 pt-24 text-center sm:pb-40 sm:pt-32">
          <Link
            href={launchPost ? `/blog/${launchPost.slug}` : "/blog"}
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
          {/* Balanced wrapping instead of a hardcoded <br />: the line is long
              enough that a fixed break lands badly at one of the two sizes. */}
          <h1 className="max-w-3xl text-balance font-display text-4xl font-medium tracking-tight sm:text-6xl">
            Create your product launch video in{" "}
            <span className="chromatic-word">minutes</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-text-secondary">
            AI-powered motion graphics editor for your product videos.
          </p>
          <AgentBadges className="mt-6" />
          <div className="mt-8 flex w-full flex-col items-center">
            {/* Above the button, deliberately quieter than it: the terminal
                install is the faster path for the people it suits, and the
                only one that leaves the `genmotion` command behind. */}
            <InstallCommand className="mb-4" />
            <DownloadButton size="lg" href={release?.downloadUrl} />
            <p className="mt-4 text-[0.9rem] text-text-secondary">
              {release ? (
                <>
                  macOS · Apple silicon · v{release.version} ·{" "}
                  {formatSize(release.size)}
                </>
              ) : (
                <>macOS · Apple silicon</>
              )}{" "}
              ·{" "}
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

      {/* The app itself, leaning back and standing up as you scroll onto it.
          Pulled up into the room the hero's extra bottom padding leaves, the
          way the showcase card used to be — this is the first thing under the
          headline now, so it takes that slot. z-10 keeps it over the blobs. */}
      <section className="relative z-10 -mt-20 sm:-mt-28">
        <Container>
          <TiltedScreenshot
            src="/editor-screenshot.webp"
            alt="The GenMotion editor: an AI chat panel on the left, a frame-accurate preview, and a timeline of scenes and audio tracks below."
          />
        </Container>
      </section>

      {/* Templates teaser — the catalog's top few, by its own curated order. */}
      {templates.length > 0 && (
        <section className="relative z-10 mt-24 sm:mt-32">
          <Container>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <Eyebrow className="mb-4">Templates</Eyebrow>
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Templates to pick from
                </h2>
                <p className="mt-4 text-text-secondary">
                  Finished videos you can take apart — remix one and it becomes
                  a project of your own.
                </p>
              </div>
              <Link
                href="/templates"
                className="inline-flex shrink-0 items-center gap-1 text-[0.95rem] text-text-secondary transition-colors hover:text-green"
              >
                View all
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <div className="mt-10">
              <TemplateMasonry templates={templates} />
            </div>
            <div className="mt-10 flex justify-center">
              <LinkButton href="/templates" variant="secondary" size="lg">
                Browse all templates
              </LinkButton>
            </div>
          </Container>
        </section>
      )}

      {/* Showcase gallery. */}
      {showcaseVideos.length > 0 && (
        // overflow-x-clip, not hidden: the fanned side cards reach past the
        // gutter on narrow viewports, and clipping here keeps that from
        // giving the document a horizontal scrollbar.
        <section className="relative z-10 mt-24 overflow-x-clip sm:mt-32">
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
            {/* The glow sits in the stack's own box, first in DOM order, so
                the cards (which carry z-indexes) paint over it. */}
            <div className="relative mt-10">
              <div className="pointer-events-none absolute -inset-x-40 -inset-y-48">
                <CoolGradientBlobs />
              </div>
              <ShowcaseStack videos={showcaseVideos} />
            </div>
            <div className="mt-10 flex justify-center">
              <LinkButton href="/showcase" variant="secondary" size="lg">
                View more videos
              </LinkButton>
            </div>
          </Container>
        </section>
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
            {FEATURES.filter((f) => !FEATURES_HIDDEN_ON_HOME.has(f.slug)).map((feature) => (
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
