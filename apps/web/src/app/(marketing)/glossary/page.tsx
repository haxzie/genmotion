import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, Eyebrow } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { getAllTerms } from "@/lib/marketing/content";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

const FAQS: Faq[] = [
  {
    q: "What is the GenMotion glossary?",
    a: "A plain-language reference defining the motion and video terms you'll meet while making animated video — from frame rate and easing to timecode and aspect ratio.",
  },
  {
    q: "Who is the glossary for?",
    a: "Anyone learning motion design or video production, whether you're brand new or just want a quick, jargon-free refresher.",
  },
  {
    q: "Do I need these terms to use GenMotion?",
    a: "Not at all — you can describe a video in plain language and let the agent handle the details. The glossary is here for when you want to understand what's happening under the hood.",
  },
];

export const metadata: Metadata = {
  title: "Glossary — GenMotion",
  description:
    "Plain-language definitions of motion and video terms — frame rate, easing, interpolation, timecode, and more.",
};

export default function GlossaryIndexPage() {
  const terms = getAllTerms();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: `${SITE_NAME} Glossary`,
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.description,
      url: `${SITE_URL}/glossary/${t.slug}`,
    })),
  };

  // Group alphabetically by first letter for a clean index.
  const groups = new Map<string, typeof terms>();
  for (const term of terms) {
    const letter = term.term[0]!.toUpperCase();
    const arr = groups.get(letter) ?? [];
    arr.push(term);
    groups.set(letter, arr);
  }

  return (
    <>
    <JsonLd data={jsonLd} />
    <Section>
      <Container>
        <div className="max-w-2xl">
          <Eyebrow className="mb-4">Glossary</Eyebrow>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Motion &amp; video, defined
          </h1>
          <p className="mt-5 text-lg text-text-secondary">
            A plain-language reference for the terms you&apos;ll meet while making
            animated video.
          </p>
        </div>

        <div className="mt-14 flex flex-col gap-10">
          {[...groups.entries()].map(([letter, items]) => (
            <div key={letter} className="grid gap-4 sm:grid-cols-[3rem_1fr]">
              <div className="font-display text-2xl font-semibold text-text-tertiary">
                {letter}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((term) => (
                  <Link
                    key={term.slug}
                    href={`/glossary/${term.slug}`}
                    className="group rounded-xl border border-border bg-surface p-5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
                  >
                    <h2 className="text-[1.05rem] font-medium transition-colors group-hover:text-text-primary">
                      {term.term}
                    </h2>
                    <p className="mt-1.5 text-[0.95rem] text-text-secondary">
                      {term.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
    <FaqSection items={FAQS} />
    </>
  );
}
