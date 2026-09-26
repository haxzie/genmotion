import type { Metadata } from "next";
import { FREE_EXPORTS_PER_MONTH } from "@genmotion/shared";
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

const PATH = "/ugc-ads";

export const metadata: Metadata = pageMetadata({
  title: "UGC Ad Maker for Claude Code - GenMotion",
  description:
    "Make UGC ads with Claude Code. Describe the hook and the product, an agent animates every beat as a vertical scene, and you export a pixel-identical MP4 for TikTok, Reels, and Shorts.",
  path: PATH,
  ogTitle: "Create viral UGC ads using Claude Code",
  ogDescription:
    "Describe the hook, the agent animates the ad, you export a vertical MP4 that matches the preview frame for frame.",
});

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Create Viral UGC Ads using Claude Code",
    description:
      "Make UGC-style social ads with an AI agent: describe the hook, refine the scenes on a frame-accurate timeline, and export a vertical MP4.",
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
        name: "UGC Ads",
        item: `${SITE_URL}${PATH}`,
      },
    ],
  },
];

const FAQS: Faq[] = [
  {
    q: "What is a UGC ad, and can GenMotion make one?",
    a: "A UGC ad is a short, feed-native video that reads like something a real person posted: a hook in the first seconds, a fast product demo, a reason to tap. GenMotion builds that as animated scenes, so you get kinetic captions, product footage and screen recordings, stat callouts, and a voiceover, in the vertical aspect ratio the feed expects.",
  },
  {
    q: "How does Claude Code fit in?",
    a: "Claude Code is the agent writing the scenes. You bring your own Claude Code or Codex subscription and GenMotion drives it inside the editor, so the ad is authored by the model you already pay for. GenMotion does not resell or meter model access.",
  },
  {
    q: "Do I need a video editor or a motion designer?",
    a: "No. You describe the ad and refine it by conversation. The timeline is there when you want to trim a beat by hand, but nothing on the page requires it.",
  },
  {
    q: "Can I make ten versions of the same ad?",
    a: "Yes. Ask for a different hook, a different call to action, or a square cut, and the agent rewrites the scenes it needs to. Every version previews and exports the same way.",
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

/** The templates the gallery leads with here: feed-native, vertical, ad-shaped. */
const TEMPLATE_TAG = "Social Media";

export default async function UgcAdsPage() {
  // Social-first templates when the catalog has them, the whole catalog when
  // it doesn't, so the gallery is never an empty band.
  const all = await getAllTemplateSummaries();
  const social = all.filter((t) => t.tags.includes(TEMPLATE_TAG));
  const templates = social.length > 0 ? social : all;
  const templatesHref =
    social.length > 0 ? "/templates/category/social-media" : "/templates";

  return (
    <>
      <JsonLd data={jsonLd} />

      <LandingHero
        badge={{
          label: "Templates",
          text: "Ad templates built for the feed",
          href: templatesHref,
        }}
        title={
          <>
            Create Viral UGC Ads using{" "}
            <span className="inline-flex items-center gap-2 whitespace-nowrap align-baseline sm:gap-3">
              {/* Unique per page: two gradients sharing an id would collide. */}
              <AgentMarks gradientId="codex-ugc-hero" />
              Claude Code
            </span>
          </>
        }
        lede="Describe the hook. An agent animates the ad, vertical and feed-ready."
      />

      <EditorShot />

      <IntegrationsSection />

      <HowItWorks title="From hook to posted ad in three steps" />

      <TemplatesStrip
        templates={templates}
        href={templatesHref}
        eyebrow="Ad templates"
        title="Start from an ad that already works"
        body="Finished social videos you can take apart. Swap the product, rewrite the hook, and it becomes an ad of your own."
      />

      <Capabilities
        eyebrow="Everything the ad needs"
        gradientId="codex-ugc-capabilities"
        lede="Captions, voiceover, sound, and an export that matches the preview, in one project and one timeline."
      />

      <FaqSection items={FAQS} />

      {/* Closing CTA is provided globally by the marketing layout. */}
    </>
  );
}
