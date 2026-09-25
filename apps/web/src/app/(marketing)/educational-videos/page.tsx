import type { Metadata } from "next";
import { FREE_EXPORTS_PER_MONTH } from "@genmotion/shared";
import Link from "next/link";
import { DownloadButton } from "@/components/marketing/download-button";
import { InstallCommand } from "@/components/marketing/install-command";
import { getLatestRelease, formatSize } from "@/lib/marketing/latest-release";
import {
  Container,
  Section,
  Eyebrow,
  LinkButton,
  Card,
} from "@/components/marketing/primitives";
import { HeroShaderBackground } from "@/components/marketing/hero-shader-background";
import { FaqSection } from "@/components/marketing/faq";
import { FeatureIcon } from "@/components/marketing/icons";
import { TiltedScreenshot } from "@/components/marketing/tilted-screenshot";
import { AgentBadges, ClaudeMark, CodexMark } from "@/components/marketing/agent-badges";
import { TemplateMasonry } from "@/components/marketing/template-masonry";
import { IntegrationsSection } from "@/components/marketing/integrations-section";
import { FEATURES } from "@/lib/marketing/features";
import type { Faq } from "@/lib/marketing/faq";
import { getAllTemplateSummaries } from "@/lib/marketing/templates";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_URL } from "@/lib/marketing/site";

const PATH = "/educational-videos";

export const metadata: Metadata = pageMetadata({
  title: "Educational Video Maker for Claude Code - GenMotion",
  description:
    "Make educational videos with Claude Code. Explain a concept in plain language, an agent animates each idea as its own scene with a voiceover, and you export a pixel-identical MP4 for YouTube.",
  path: PATH,
  ogTitle: "Create educational videos using Claude Code",
  ogDescription:
    "Describe the lesson, the agent animates the explanation, you export an MP4 that matches the preview frame for frame.",
});

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Create Educational Videos using Claude Code",
    description:
      "Make explainer and teaching videos with an AI agent: describe the concept, refine the scenes on a frame-accurate timeline, and export an MP4 for YouTube.",
    url: `${SITE_URL}${PATH}`,
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Educational Videos",
        item: `${SITE_URL}${PATH}`,
      },
    ],
  },
];

const STEPS = [
  {
    icon: "chat" as const,
    title: "Explain it once",
    body: "Tell the agent the concept and who is learning it. It writes the script, splits the idea into chapters, and animates a diagram for each one.",
  },
  {
    icon: "frame" as const,
    title: "Check the diagram",
    body: "Scrub to any frame and look at what a learner will look at. A label in the wrong place is a sentence to fix, not a re-render.",
  },
  {
    icon: "mic" as const,
    title: "Narrate it",
    body: "Add a voiceover in the studio and the animation is timed to it, so the drawing lands on the word it belongs to.",
  },
  {
    icon: "export" as const,
    title: "Upload to YouTube",
    body: "Export a pixel-identical MP4 at 1080p or 4K on your own machine. No watermark, no render queue, no upload step in between.",
  },
];

const FAQS: Faq[] = [
  {
    q: "What kind of educational videos can GenMotion make?",
    a: "Concept explainers, course lessons, technical breakdowns, data stories, and study aids. Anything whose visuals are drawn rather than filmed: diagrams, tables, timelines, charts, code, and typography. The database explainer in the gallery is a whiteboard-style lesson with a voiceover, six chapters, and a summary.",
  },
  {
    q: "Do I need to be a motion designer or a video editor?",
    a: "No. You describe the lesson and refine it by conversation. The timeline is there when you want to retime a beat by hand, but nothing on the page requires it.",
  },
  {
    q: "How does Claude Code fit in?",
    a: "Claude Code is the agent writing the scenes. You bring your own Claude Code or Codex subscription and GenMotion drives it inside the editor, so the lesson is authored by the model you already pay for. GenMotion does not resell or meter model access.",
  },
  {
    q: "Can I add narration?",
    a: "Yes. Generate a voiceover in chat on Pro, or drop in your own recording, and place it on the audio track. Scenes are timed in frames, so you can line a diagram up with the exact sentence that describes it.",
  },
  {
    q: "Can I turn one lesson into a series?",
    a: "Yes. Ask for the next chapter and the agent reuses the same scenes, palette, and typography, so episode four looks like episode one. Remix a template and every lesson in the series starts from the same structure.",
  },
  {
    q: "Does the export match what I previewed?",
    a: "Yes. The browser preview and the headless renderer share one deterministic runtime, so the exported MP4 is pixel-for-pixel and frame-for-frame identical to the cut you approved.",
  },
  {
    q: "Is there a free plan?",
    a: `Yes, and it does not expire. The free plan gives you the whole studio with no credit card: unlimited projects, unlimited chat with your own agent, and ${FREE_EXPORTS_PER_MONTH} finished exports a month at any resolution, with no watermark on any of them. Pro lifts the ${FREE_EXPORTS_PER_MONTH}-a-month limit and adds voiceover and image generation in chat.`,
  },
];

/** The templates this page leads with: lessons and explainers. */
const TEMPLATE_TAGS = ["Educational", "Tutorial"];

export default async function EducationalVideosPage() {
  const release = await getLatestRelease();
  // Teaching templates when the catalog has them, the whole catalog when it
  // doesn't, so the gallery is never an empty band.
  const all = await getAllTemplateSummaries();
  const teaching = all.filter((t) => t.tags.some((tag) => TEMPLATE_TAGS.includes(tag)));
  const templates = teaching.length > 0 ? teaching : all;
  const templatesHref =
    teaching.length > 0 ? "/templates/category/educational" : "/templates";

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* Hero */}
      <div className="relative overflow-hidden">
        <HeroShaderBackground />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <Container className="relative flex flex-col items-center pb-32 pt-24 text-center sm:pb-40 sm:pt-32">
          <Link
            href={templatesHref}
            className="group mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 py-1 pl-1.5 pr-3 text-[0.857rem] text-text-secondary transition-colors duration-150 hover:border-border-strong hover:text-text-primary"
          >
            <span className="rounded-full bg-green-muted px-2 py-0.5 text-[0.786rem] font-medium text-green">
              Templates
            </span>
            Lessons you can take apart
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
          {/* Same balanced-wrap treatment as the homepage headline: the line is
              long enough that a hardcoded break lands badly at one size. */}
          <h1 className="max-w-4xl text-balance font-display text-4xl font-medium tracking-tight sm:text-6xl">
            Create Educational Videos using{" "}
            <span className="inline-flex items-center gap-2 whitespace-nowrap align-baseline sm:gap-3">
              <span className="inline-flex items-center -space-x-2 sm:-space-x-2.5">
                <span className="inline-flex size-[1.35em] shrink-0 items-center justify-center rounded-full bg-[#D97757]/15 ring-2 ring-background">
                  <ClaudeMark className="size-[0.8em]" />
                </span>
                <span className="inline-flex size-[1.35em] shrink-0 items-center justify-center rounded-full bg-surface-raised ring-2 ring-background">
                  {/* Unique per page: two gradients sharing an id would collide. */}
                  <CodexMark className="size-[0.8em]" gradientId="codex-education-hero" />
                </span>
              </span>
              Claude Code
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-text-secondary">
            Describe the concept. An agent animates the lesson, narrated and
            ready for YouTube.
          </p>
          <AgentBadges className="mt-6" />
          <div className="mt-8 flex w-full flex-col items-center">
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

      {/* The editor, pulled up into the room the hero's bottom padding leaves. */}
      <section className="relative z-10 -mt-20 sm:-mt-28">
        <Container>
          <TiltedScreenshot
            src="/editor-screenshot.webp"
            alt="The GenMotion editor: an AI chat panel on the left, a frame-accurate preview, and a timeline of scenes and audio tracks below."
          />
        </Container>
      </section>

      {/* What it plugs into, and whose models it runs. */}
      <IntegrationsSection />

      {/* Lesson templates gallery */}
      {templates.length > 0 && (
        <section className="relative z-10 mt-24 sm:mt-32">
          <Container className="max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <Eyebrow className="mb-4">Lesson templates</Eyebrow>
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Start from a lesson that already teaches
                </h2>
                <p className="mt-4 text-text-secondary">
                  Finished explainers you can take apart. Swap the subject,
                  rewrite the script, and it becomes a lesson of your own.
                </p>
              </div>
              <Link
                href={templatesHref}
                className="inline-flex shrink-0 items-center gap-1 text-[0.95rem] text-text-secondary transition-colors hover:text-green"
              >
                View all
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <div className="mt-10">
              <TemplateMasonry templates={templates} showDetails={false} />
            </div>
            <div className="mt-10 flex justify-center">
              <LinkButton href={templatesHref} variant="secondary" size="lg">
                Browse all templates
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
              From a concept to a published lesson in four steps
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
            <Eyebrow className="mb-4">Everything the lesson needs</Eyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              A full studio, pointed at teaching
            </h2>
            <p className="mt-4 text-text-secondary">
              Narration, captions, brand colors, and an export that matches the
              preview. Each one has its own page.
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

      {/* Further reading */}
      <Section className="border-t border-border">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">Read next</Eyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              How to make educational videos people finish
            </h2>
            <p className="mt-4 text-text-secondary">
              The script, the pacing, and the production loop behind the
              explainers in this gallery.
            </p>
            <div className="mt-8 flex justify-center">
              <LinkButton
                href="/blog/how-to-create-educational-videos-for-youtube"
                variant="secondary"
                size="lg"
              >
                Read the guide
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>

      {/* FAQ */}
      <FaqSection items={FAQS} />

      {/* Closing CTA is provided globally by the marketing layout. */}
    </>
  );
}
