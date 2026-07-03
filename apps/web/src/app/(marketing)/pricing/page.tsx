import type { Metadata } from "next";
import {
  Container,
  Section,
  Eyebrow,
  LinkButton,
} from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";
import { cx } from "@/lib/cx";

export const metadata: Metadata = {
  title: "Pricing — GenMotion",
  description:
    "Simple plans for every creator. Start free, upgrade when you need more renders, longer videos, and higher resolution.",
};

type Tier = {
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
  cta: { label: string; href: string };
  highlighted?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Make your first videos and learn the workflow.",
    cta: { label: "Start free", href: "/signup" },
    features: [
      "Up to 5 projects",
      "720p MP4 export with watermark",
      "Frame-accurate browser preview",
      "Timeline editor",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$30",
    cadence: "per user / month",
    blurb: "For creators shipping videos regularly.",
    cta: { label: "Start Pro trial", href: "/signup" },
    highlighted: true,
    features: [
      "$30 in AI credits included every month",
      "Unlimited projects",
      "1080p & 4K export, no watermark",
      "AI voiceover with premium voices",
      "Brand extraction from any URL",
      "Priority rendering queue",
      "Email support",
    ],
  },
  {
    name: "Team",
    price: "$100",
    cadence: "per user / month",
    blurb: "Shared brand assets and collaboration for teams.",
    cta: { label: "Contact sales", href: "/about" },
    features: [
      "$100 in AI credits per user every month",
      "Everything in Pro",
      "Centralized billing for every seat",
      "Shared brand assets library",
      "Reusable scene skills",
      "SSO & priority support",
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
    q: "How do AI credits work?",
    a: "Every paid plan includes AI credits equal to its price — Pro gives you $30 in credits each month, and Team gives $100 per user each month. Credits cover AI usage like scene generation, voiceover, and brand extraction, so your subscription effectively pays for itself in usage.",
  },
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
              Start free. Upgrade when you need more renders, longer videos, and
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
