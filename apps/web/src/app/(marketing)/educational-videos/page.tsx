import type { Metadata } from "next";
import { FREE_EXPORTS_PER_MONTH } from "@genmotion/shared";
import { Container, Eyebrow, LinkButton, Section } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Capabilities } from "@/components/marketing/capabilities";
import { AgentMarks } from "@/components/marketing/agent-badges";
import { IntegrationsSection } from "@/components/marketing/integrations-section";
import {
  EditorShot,
  LandingHero,
  TemplatesStrip,
} from "@/components/marketing/landing";
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

      <LandingHero
        badge={{
          label: "Templates",
          text: "Lessons you can take apart",
          href: templatesHref,
        }}
        title={
          <>
            Create Educational Videos using{" "}
            <span className="inline-flex items-center gap-2 whitespace-nowrap align-baseline sm:gap-3">
              {/* Unique per page: two gradients sharing an id would collide. */}
              <AgentMarks gradientId="codex-education-hero" />
              Claude Code
            </span>
          </>
        }
        lede="Describe the concept. An agent animates the lesson, narrated and ready for YouTube."
      />

      <EditorShot />

      <IntegrationsSection />

      <HowItWorks title="From concept to published lesson in three steps" />

      <TemplatesStrip
        templates={templates}
        href={templatesHref}
        eyebrow="Lesson templates"
        title="Start from a lesson that already teaches"
        body="Finished explainers you can take apart. Swap the subject, rewrite the script, and it becomes a lesson of your own."
      />

      <Capabilities
        eyebrow="Everything the lesson needs"
        gradientId="codex-education-capabilities"
        lede="Narration, diagrams, sound, and an export that matches the preview, in one project and one timeline."
      />

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

      <FaqSection items={FAQS} />

      {/* Closing CTA is provided globally by the marketing layout. */}
    </>
  );
}
