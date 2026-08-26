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
  SEAT_PRICE_USD,
  TRIAL_DAYS,
  planPrice,
} from "@genmotion/shared";

export const metadata: Metadata = pageMetadata({
  title: "Pricing — GenMotion",
  description:
    "Simple plans for every creator. Download the app free, upgrade when you need more renders, longer videos, and higher resolution.",
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
    cadence: `${TRIAL_DAYS} days`,
    blurb: "The whole app, for a week. No card, no watermark, nothing withheld.",
    cta: { label: "Download", href: "/download" },
    features: [
      "Every feature Pro has",
      "Unlimited projects and exports",
      "1080p & 4K export, no watermark",
      "Bring your own Claude Code or Codex",
      "No credit card",
    ],
  },
  {
    name: PLANS.pro.name,
    price: planPrice("pro"),
    cadence: "per person, per month",
    blurb: "For anyone still making videos after the first week.",
    cta: { label: "Download", href: "/download" },
    highlighted: true,
    features: [
      "Everything in the trial, without the clock",
      "Unlimited projects, exports and scenes",
      `Add teammates at $${SEAT_PRICE_USD} each`,
      "Renders on your machine — no queue",
      "Priority support",
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
    q: "Is there really a free plan?",
    a: "Yes. The Free plan lets you create projects, preview frame-accurately, and export watermarked 720p MP4s with no time limit. Upgrade only when you need higher resolution, no watermark, or more capacity.",
  },
  {
    q: "How does rendering work?",
    a: "Exports are rendered on a headless worker that shares the same deterministic runtime as the in-browser preview, so the MP4 is pixel-identical to what you reviewed. Paid plans get a priority queue.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Plans are month-to-month and you can cancel or downgrade at any time — your projects stay accessible on the Free plan.",
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
              Simple plans for every creator
            </h1>
            <p className="mt-5 text-lg text-text-secondary">
              Download free. Upgrade when you need more renders, longer videos, and
              higher resolution.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
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
