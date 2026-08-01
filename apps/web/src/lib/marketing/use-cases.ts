import type { IconKey } from "@/components/marketing/icons";
import type { Faq } from "@/lib/marketing/faq";

export type UseCaseSection = {
  heading: string;
  body: string;
};

export type UseCase = {
  slug: string;
  /** Full name for the page H1, e.g. "Product Launch Videos". */
  name: string;
  /** Short label for the nav dropdown, e.g. "Product Launch". */
  navLabel: string;
  /** One-line value prop for cards + the dropdown description. */
  tagline: string;
  /** Hero paragraph. */
  description: string;
  /** Keyword-first <title>. */
  seoTitle: string;
  /** Meta description. */
  seoDescription: string;
  icon: IconKey;
  /** Brand/accent hex for the use case's icon tile (icon, tinted fill, border). */
  color: string;
  sections: UseCaseSection[];
  faqs: Faq[];
  /** Showcase videos to feature below the hero, matched by category (falls back
   *  to featured/all when a category has none yet). */
  videoCategories?: string[];
  /** Or curate exact showcase slugs (takes precedence over categories). */
  videoSlugs?: string[];
};

// Pure metadata — safe to import in the client nav. Video selection happens in
// the page (which reads the showcase content on the server).
export const USE_CASES: UseCase[] = [
  {
    slug: "product-launch",
    name: "Product Launch Videos",
    navLabel: "Product Launch",
    tagline: "Cinematic launch videos from a single prompt.",
    description:
      "Turn your product into a launch video that earns attention. Describe what you're shipping and an agent writes the scenes, times the animation to a voiceover, and exports a pixel-identical MP4 — no motion designer, no timeline wrangling.",
    // The homepage owns the exact head term "AI Product Launch Video
    // Generator" — this page targets the SaaS/startup qualifier instead so the
    // two don't compete for the same query with the same title.
    seoTitle: "AI Product Launch Video Maker for SaaS & Startups — GenMotion",
    seoDescription:
      "Create a product launch video with AI. From a prompt to a polished, pixel-identical MP4 with narration, animation, and brand styling — in minutes, not weeks.",
    icon: "rocket",
    color: "#F97316",
    videoCategories: ["Product Launch", "Feature Launch"],
    sections: [
      {
        heading: "From prompt to launch trailer",
        body: "Describe the product, the audience, and the vibe. The agent drafts a narrative arc — hook, problem, reveal, proof, tagline — and animates every scene to match. Refine any of it in plain language.",
      },
      {
        heading: "On-brand, and yours to edit",
        body: "Pull your palette, type, and logo from a URL, and every scene is real React/TSX you can inspect and tweak on a frame-accurate timeline. What you preview is exactly what exports.",
      },
    ],
    faqs: [
      {
        q: "How do I make a product launch video with AI?",
        a: "Describe your product on GenMotion — the audience, the key message, and the feel you want. The agent writes the animated scenes, adds narration and motion, and you export a finished MP4. Refine anything by chatting or editing on the timeline.",
      },
      {
        q: "How long does a launch video take?",
        a: "A first draft is animated in minutes. From there you iterate in plain language until it's right, then export a pixel-identical MP4.",
      },
    ],
  },
  {
    slug: "saas-explainer",
    name: "SaaS Explainer Videos",
    navLabel: "SaaS Explainer",
    tagline: "Turn a product description into a clear explainer.",
    description:
      "Explain what your SaaS does and why it matters — animated. Paste your value prop and the agent structures it into a tight explainer with kinetic type, UI motion, and narration synced to the script.",
    seoTitle: "AI SaaS Explainer Video Maker — GenMotion",
    seoDescription:
      "Make a SaaS explainer video with AI. Turn your product description into an animated, narrated explainer with frame-accurate motion and a pixel-identical export.",
    icon: "chat",
    color: "#3B82F6",
    videoCategories: ["Product Launch"],
    sections: [
      {
        heading: "Your value prop, animated",
        body: "The agent turns 'what it does / who it's for / why it's better' into a scene-by-scene explainer, with the visuals illustrating each line of narration instead of a wall of bullet points.",
      },
      {
        heading: "Narration that drives the motion",
        body: "Generate an AI voiceover and the animation is timed to the words — entrances land on the beat, and the frame is never static while the narrator talks.",
      },
    ],
    faqs: [
      {
        q: "Can AI turn my product description into a video?",
        a: "Yes. Paste your description into GenMotion and the agent writes an animated explainer from it — structuring the story, choosing the motion, and syncing narration to the script.",
      },
      {
        q: "Do I need video editing experience?",
        a: "No. You describe changes in plain language; the timeline is there when you want fine control, but it's optional.",
      },
    ],
  },
  {
    slug: "product-hunt",
    name: "Product Hunt Launch Videos",
    navLabel: "Product Hunt",
    tagline: "Punchy 30–60s videos built to win launch day.",
    description:
      "Ship a Product Hunt video that stops the scroll. Get a short, high-energy launch video — hook in the first two seconds, three crisp capabilities, one memorable tagline — animated and exported ready to post.",
    seoTitle: "Product Hunt Launch Video Generator (AI) — GenMotion",
    seoDescription:
      "Generate a Product Hunt launch video with AI — a punchy 30–60s hero video with narration and animation, ready for launch day. From prompt to MP4 in minutes.",
    icon: "producthunt",
    color: "#DA552F",
    videoCategories: ["Feature Launch", "Product Launch"],
    sections: [
      {
        heading: "Built for the launch-day scroll",
        body: "Short and ruthless: the first two seconds earn attention, three capabilities land on their own beats, and a sticky tagline closes. The agent knows the format.",
      },
      {
        heading: "Every aspect ratio you need",
        body: "Export 16:9 for the post, 1:1 for the feed, or 9:16 for stories — pixel-identical at each size, straight from the same project.",
      },
    ],
    faqs: [
      {
        q: "What makes a good Product Hunt video?",
        a: "A strong hook, one clear message, three tight capabilities, and a memorable close — under 60 seconds. GenMotion's agent is tuned for exactly this structure.",
      },
      {
        q: "Can I export vertical and square versions?",
        a: "Yes — pick any aspect ratio and the export renders pixel-perfect at that size from the same project.",
      },
    ],
  },
  {
    slug: "feature-announcement",
    name: "Feature Announcement Videos",
    navLabel: "Feature Announcement",
    tagline: "Show off a new capability with a tight reveal.",
    description:
      "Announce a new feature the way it deserves. Describe the capability and the agent builds a focused reveal — one clear hero moment, kinetic type, and narration — ready to drop in a changelog, email, or social post.",
    seoTitle: "AI Feature Announcement Video Maker — GenMotion",
    seoDescription:
      "Create a feature announcement video with AI. A focused, animated reveal of your new capability with narration and a pixel-identical MP4 export.",
    icon: "stars",
    color: "#8B5CF6",
    videoCategories: ["Feature Launch"],
    sections: [
      {
        heading: "One feature, one clear moment",
        body: "No feature-dump. The agent frames a single capability with a hero reveal and a benefit-first line, so viewers remember the one thing that changed.",
      },
      {
        heading: "Drop it anywhere",
        body: "Export for the changelog, the launch email, or the social post — same project, any aspect ratio, pixel-identical every time.",
      },
    ],
    faqs: [
      {
        q: "How do I announce a new feature with video?",
        a: "Describe the feature and its benefit in GenMotion; the agent builds a short animated reveal with narration that you can export and share anywhere.",
      },
    ],
  },
  {
    slug: "event-promo",
    name: "Event Promo Videos",
    navLabel: "Event Promo",
    tagline: "Momentum-packed promos that drive sign-ups.",
    description:
      "Promote a launch event, meetup, or drop with a video that builds hype. Give the details and the agent animates a single, energetic promo — the what, where, and why — designed to loop and get people to show up.",
    seoTitle: "AI Event Promo Video Generator — GenMotion",
    seoDescription:
      "Make an event promo video with AI. An energetic, animated promo with the what/where/why and a pixel-identical MP4 — built to drive sign-ups.",
    icon: "palette",
    color: "#EC4899",
    videoCategories: ["Event Promo"],
    sections: [
      {
        heading: "All momentum, one take",
        body: "Promos live on energy. The agent lands the essentials in a single sweep — bold type, motion, and a clear call to show up — so the invite is impossible to miss.",
      },
    ],
    faqs: [
      {
        q: "Can I make a promo video for my event?",
        a: "Yes. Describe the event and the vibe, and GenMotion animates a short, high-energy promo you can export and post.",
      },
    ],
  },
  {
    slug: "data-story",
    name: "Data Story & Metrics Videos",
    navLabel: "Data Story",
    tagline: "Turn a number or milestone into a moment.",
    description:
      "Celebrate a milestone or tell a data story in motion. Give the metric and the agent animates it — counters, charts, and a payoff that lands — perfect for growth updates, funding news, or a big number worth sharing.",
    seoTitle: "AI Data Story & Metrics Video Maker — GenMotion",
    seoDescription:
      "Create a data-story or metrics video with AI. Animate counters, charts, and milestones into a shareable, pixel-identical MP4.",
    icon: "timeline",
    color: "#10B981",
    videoCategories: ["Data Story"],
    sections: [
      {
        heading: "Let the number do the talking",
        body: "When the story is a metric, the animation is the message. The agent ramps the count and holds the payoff just long enough to feel earned.",
      },
    ],
    faqs: [
      {
        q: "Can GenMotion animate charts and numbers?",
        a: "Yes — describe the metric or milestone and the agent animates counters, charts, and a payoff moment, exported as a pixel-identical MP4.",
      },
    ],
  },
  {
    slug: "social-video-ads",
    name: "Social Media Video Ads",
    navLabel: "Social Ads",
    tagline: "Scroll-stopping ads in every aspect ratio.",
    description:
      "Make social ads that perform. Describe the offer and the agent animates a short, punchy ad — then export it in 16:9, 1:1, and 9:16 from the same project, pixel-identical for every platform.",
    seoTitle: "AI Social Media Video Ad Maker — GenMotion",
    seoDescription:
      "Create social media video ads with AI. Short, animated, scroll-stopping ads exported pixel-perfect in 16:9, 1:1, and 9:16 for every platform.",
    icon: "frame",
    color: "#06B6D4",
    videoCategories: ["Product Launch", "Feature Launch"],
    sections: [
      {
        heading: "One project, every platform",
        body: "Design once, then export the exact same ad at 16:9, 1:1, and 9:16 — pixel-identical at each size, straight from the same project.",
      },
    ],
    faqs: [
      {
        q: "Can I export different sizes for each platform?",
        a: "Yes. Pick any aspect ratio and GenMotion renders the ad pixel-perfect at that size from the same project.",
      },
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((u) => u.slug === slug);
}
