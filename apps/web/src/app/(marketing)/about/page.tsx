import type { Metadata } from "next";
import {
  Container,
  Section,
  Eyebrow,
  LinkButton,
  Card,
} from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `About ${SITE_NAME}`,
  url: `${SITE_URL}/about`,
  mainEntity: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
  },
};

const FAQS: Faq[] = [
  {
    q: "What does GenMotion do?",
    a: "GenMotion turns a plain-language description into an animated video: an agent writes the scenes, you preview them frame-accurately and arrange them on a timeline, and a headless worker renders a pixel-identical MP4.",
  },
  {
    q: "Who is GenMotion for?",
    a: "Anyone who needs animated video without a motion-design background or a studio budget — founders, marketers, creators, and teams shipping explainers, ads, and announcements.",
  },
  {
    q: "What makes GenMotion different?",
    a: "Fidelity and openness: what you preview is exactly what you ship, and every scene is real, inspectable React/TSX rather than a locked, proprietary format.",
  },
  {
    q: "How do I get in touch?",
    a: "Email hello@genmotion.app — we'd love to hear what you're building.",
  },
];

export const metadata: Metadata = {
  title: "About — GenMotion",
  description:
    "GenMotion is on a mission to make motion design as easy as describing it. Learn what we believe and why we build the way we do.",
};

const VALUES = [
  {
    title: "Fidelity over flash",
    body: "What you preview is what you ship — pixel-for-pixel, frame-for-frame. Determinism isn't a detail; it's the whole point.",
  },
  {
    title: "Real code, not a black box",
    body: "Every scene is inspectable React/TSX. You're never locked into a format you can't read, edit, or own.",
  },
  {
    title: "Conversation as the interface",
    body: "The fastest way to make a video is to describe it. We pair an agent that drafts with tools that let you take precise control.",
  },
  {
    title: "Craft in the details",
    body: "Easing curves, timing, kinetic type — the small things are what make motion feel alive. We sweat them so you don't have to.",
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutJsonLd} />
      <Section>
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow className="mb-4">About</Eyebrow>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Motion design, as easy as describing it
            </h1>
            <p className="mt-6 text-lg text-text-secondary">
              Animated video is one of the most effective ways to explain,
              announce, and sell — and one of the slowest and most expensive to
              make. Producing a thirty-second piece has traditionally meant
              specialist tools, a steep learning curve, and hours of keyframing.
            </p>
            <p className="mt-4 text-lg text-text-secondary">
              GenMotion exists to collapse that gap. You describe what you want;
              an agent writes the animated scenes; you preview them
              frame-accurately and arrange them on a timeline; a headless worker
              renders a pixel-identical MP4. The result is studio-quality motion
              without the studio.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-border pt-16">
        <Container>
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            What we believe
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {VALUES.map((value) => (
              <Card key={value.title}>
                <h3 className="text-[1.1rem] font-medium">{value.title}</h3>
                <p className="mt-2 text-[0.95rem] text-text-secondary">
                  {value.body}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <FaqSection items={FAQS} />

      <Section className="border-t border-border">
        <Container>
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-border bg-surface px-8 py-12 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Want to work with us or have a question?
              </h2>
              <p className="mt-2 text-text-secondary">
                We&apos;d love to hear what you&apos;re building.
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <LinkButton href="mailto:hello@genmotion.app" variant="secondary" size="lg">
                Say hello
              </LinkButton>
              <LinkButton href="/signup" size="lg">
                Start free
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
