import type { Metadata } from "next";
import {
  Container,
  Section,
  Eyebrow,
  LinkButton,
} from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";
import { cx } from "@/lib/cx";
import {
  PLANS,
  PLUGIN_ALLOWANCE,
  FREE_EXPORTS_PER_MONTH,
  planPrice,
} from "@genmotion/shared";

export const metadata: Metadata = pageMetadata({
  title: "Pricing — GenMotion",
  description: `Free forever, with ${FREE_EXPORTS_PER_MONTH} exports a month. ${planPrice("pro")} a month for one person, or ${planPrice("max")} for a team of five with five times the generation allowance.`,
  path: "/pricing",
});

type Tier = {
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
  cta: { label: string; href: string };
  highlighted?: boolean;
  features: string[];
};

/**
 * Prices come from PLANS so this page and the in-app billing page can never
 * quote different numbers. The feature copy is deliberately this page's own —
 * marketing bullets are richer than the terse in-app list.
 */
const TIERS: Tier[] = [
  {
    name: PLANS.free.name,
    price: planPrice("free"),
    cadence: "forever",
    blurb: `The whole studio, with ${FREE_EXPORTS_PER_MONTH} exports a month. No card, no queue, no clock, no watermark.`,
    cta: { label: "Download", href: "/download" },
    features: [
      "Unlimited projects, scenes and chat",
      `${FREE_EXPORTS_PER_MONTH} exports a month, unbranded`,
      "1080p & 4K export",
      "Bring your own Claude Code or Codex",
      "No credit card",
    ],
  },
  {
    name: PLANS.pro.name,
    price: planPrice("pro"),
    cadence: "per month, one seat",
    blurb: "For anyone making videos more than once a month.",
    cta: { label: "Download", href: "/download" },
    highlighted: true,
    features: [
      "Everything in Free, uncapped",
      "One seat, just you",
      "Unlimited exports, at any resolution",
      `${PLUGIN_ALLOWANCE.characters.toLocaleString("en-US")} characters of voiceover a month (about ${Math.round(PLUGIN_ALLOWANCE.characters / 1500)} minutes)`,
      `${PLUGIN_ALLOWANCE.sfx} sound effects and ${PLUGIN_ALLOWANCE.images} generated images a month`,
      "Renders on your machine — no queue",
      "Priority support",
    ],
  },
  {
    name: PLANS.max.name,
    price: planPrice("max"),
    cadence: `per month, ${PLANS.max.includedSeats} seats`,
    blurb: "For a team that makes videos together.",
    cta: { label: "Download", href: "/download" },
    features: [
      "Everything in Pro",
      `${PLANS.max.includedSeats} seats — invite your team`,
      `${PLANS.max.allowanceMultiplier}× the generation of Pro, shared across the team`,
      "Need more than five? Talk to us",
    ],
  },
];

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: SITE_NAME,
  description:
    "GenMotion turns a plain-language description into an animated, pixel-identical MP4 video.",
  url: `${SITE_URL}/pricing`,
  offers: TIERS.map((t) => ({
    "@type": "Offer",
    name: t.name,
    price: t.price.replace(/[^0-9.]/g, "") || "0",
    priceCurrency: "USD",
    url: `${SITE_URL}${t.cta.href}`,
  })),
};

const FAQ: Faq[] = [
  {
    q: "Is there a free plan?",
    a: `Yes, and it does not expire. Free gives you the whole studio: unlimited projects, unlimited scenes, unlimited chat with your own coding agent, and ${FREE_EXPORTS_PER_MONTH} finished exports a month at any resolution. No card, and no watermark: a free export is the same file a paid one would be. One thing is reserved for Pro, the voiceover, sound effect and image generation in chat, which run on providers we pay for per call. Past ${FREE_EXPORTS_PER_MONTH} exports in a month it's ${planPrice("pro")} a month for as many as you like.`,
  },
  {
    q: "How does pricing work for a team?",
    a: `Pro is ${planPrice("pro")} a month for one person. Max is ${planPrice("max")} a month for a team of up to ${PLANS.max.includedSeats}, with ${PLANS.max.allowanceMultiplier}× the generation allowance shared across it. Need more seats than that? Contact us.`,
  },
  {
    q: "What counts as an export?",
    a: `One finished video file. Previewing, scrubbing, re-rendering a scene and editing cost nothing and are never counted, because they happen on your own machine. The count is per account, resets on the first of each month, and an export you cancel still counts, so it's worth previewing before you hit export.`,
  },
  {
    q: "How does rendering work?",
    a: "Videos render on your own machine, in the desktop app, using the same deterministic runtime as the preview — so the MP4 is pixel-identical to what you reviewed and there is no render queue on any plan.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pro is month-to-month; cancel from the billing page and you keep access until the end of the period you've paid for. Your projects are folders on your own disk, so they stay yours either way.",
  },
  {
    q: "Do I own what I create?",
    a: "Yes. The videos you produce are yours to use however you like, including commercially.",
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <>
      <JsonLd data={pricingJsonLd} />
      <Section className="pb-10">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">Pricing</Eyebrow>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Free to start, and it stays free
            </h1>
            <p className="mt-5 text-lg text-text-secondary">
              {FREE_EXPORTS_PER_MONTH} exports a month on the free plan, with no
              clock on it. {planPrice("pro")} a month for unlimited exports, or{" "}
              {planPrice("max")} for a team of five.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                style={
                  tier.highlighted
                    ? {
                        backgroundImage:
                          "radial-gradient(120% 70% at 50% 0%, rgba(198,249,30,0.18), rgba(22,245,189,0.07) 38%, transparent 62%)",
                      }
                    : undefined
                }
                className={cx(
                  "flex flex-col rounded-2xl border bg-surface",
                  tier.highlighted
                    ? "border-border-strong p-8 ring-1 ring-green/30 lg:-my-3"
                    : "border-border p-7",
                )}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">{tier.name}</h2>
                  {tier.highlighted && (
                    <span className="rounded-full bg-green-muted px-2.5 py-1 text-[0.786rem] font-medium text-green">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-semibold tracking-tight">
                    {tier.price}
                  </span>
                  {tier.cadence && (
                    <span className="text-[0.95rem] text-text-tertiary">
                      {tier.cadence}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[0.95rem] text-text-secondary">
                  {tier.blurb}
                </p>
                <div className="mt-6">
                  <LinkButton
                    href={tier.cta.href}
                    variant={tier.highlighted ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {tier.cta.label}
                  </LinkButton>
                </div>
                <ul className="mt-7 flex flex-col gap-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[0.95rem] text-text-secondary">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <FaqSection items={FAQ} />
    </>
  );
}
