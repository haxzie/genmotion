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
import { getPostBySlug } from "@/lib/marketing/content";
import { getAllTemplateSummaries } from "@/lib/marketing/templates";
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
  title: "GenMotion - AI video editor for agents",
  description:
    "Generate a product launch video with AI. Describe it in plain language and GenMotion's agent animates it as real scenes, previews it frame-accurately, and exports a pixel-perfect MP4.",
  path: "/",
  ogDescription:
    "Generate a product launch video with AI — describe it, preview it frame-accurately, export a pixel-perfect MP4.",
});

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
    a: `Yes, and it does not expire. The free plan gives you the whole studio with no credit card: unlimited projects, unlimited chat with your own agent, and ${FREE_EXPORTS_PER_MONTH} finished exports a month at any resolution, with no watermark on any of them. Pro lifts the ${FREE_EXPORTS_PER_MONTH}-a-month limit and adds voiceover and image generation in chat.`,
  },
];

/** The launch announcement the hero badge points at. */
const LAUNCH_POST_SLUG = "introducing-genmotion-ai-motion-video-studio";

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
  // The featured slice of the catalog, in the order the catalog itself
  // curates. Not every template belongs on the front page — /templates stays
  // the complete gallery, and a template earns its way here by being marked
  // `featured` in its sidecar.
  const templates = await getAllTemplateSummaries({ featured: true });

  return (
    <>
      <JsonLd data={homeJsonLd} />
      <LandingHero
        badge={{
          label: "Announcement",
          text: "Launching GenMotion",
          href: launchPost ? `/blog/${launchPost.slug}` : "/blog",
        }}
        title={
          <>
            Create product launch videos using{" "}
            {/* Kept on one line as a unit: the mark belongs to the name, and a
                wrap between them would leave it orphaned at a line end. */}
            <span className="inline-flex items-center gap-2 whitespace-nowrap align-baseline sm:gap-3">
              <AgentMarks gradientId="codex-hero" />
              Claude Code
            </span>
          </>
        }
        lede="AI-powered motion graphics editor for your product videos."
      />

      <EditorShot />

      {/* The marketplace, straight under the app: what it plugs into, and
          whose models it runs. */}
      <IntegrationsSection />

      {/* How it works, above the templates: the three steps, each one
          animated rather than described. It comes before the gallery because a
          template only means something once you know what you would do with
          it. */}
      <HowItWorks />

      <TemplatesStrip templates={templates} />

      {/* What the studio covers, as a bento: every cell shows the app doing
          the thing rather than an icon standing for it. */}
      <Capabilities />

      {/* FAQ */}
      <FaqSection items={FAQS} />

      {/* Closing CTA is provided globally by the marketing layout. */}
    </>
  );
}
