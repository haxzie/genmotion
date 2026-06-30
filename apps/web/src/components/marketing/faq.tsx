"use client";

import { useState } from "react";
import { Container, Section, Eyebrow } from "@/components/marketing/primitives";
import { JsonLd } from "@/components/marketing/json-ld";
import { faqPageJsonLd, type Faq } from "@/lib/marketing/faq";
import { cx } from "@/lib/cx";

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={cx(
        "size-4 shrink-0 text-text-tertiary transition-transform duration-300 ease-out",
        open && "rotate-180",
      )}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * One accordion row. The answer is always rendered in the DOM (so it's present
 * in the server HTML for crawlers); open/close is animated by transitioning the
 * grid row from 0fr → 1fr, which the inner overflow-hidden wrapper clips.
 */
function FaqItem({ item }: { item: Faq }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="py-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-[1.05rem] font-medium text-text-primary"
      >
        {item.q}
        <ChevronDownIcon open={open} />
      </button>
      <div
        className={cx(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="pt-3 text-[0.95rem] leading-relaxed text-text-secondary">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * A self-contained FAQ block: animated, accessible accordion plus matching
 * schema.org FAQPage JSON-LD. Answers stay in the rendered HTML even when
 * collapsed, so the structured data always reflects on-page content.
 */
export function FaqSection({
  items,
  title = "Frequently asked questions",
  eyebrow,
}: {
  items: Faq[];
  title?: string;
  eyebrow?: string;
}) {
  if (items.length === 0) return null;

  return (
    <Section className="border-t border-border">
      <Container>
        <div className="mx-auto max-w-2xl">
          {eyebrow && <Eyebrow className="mb-4 flex justify-center">{eyebrow}</Eyebrow>}
          <h2 className="text-center font-display text-3xl font-semibold tracking-tight">
            {title}
          </h2>
          <div className="mt-10 divide-y divide-border border-t border-border">
            {items.map((item) => (
              <FaqItem key={item.q} item={item} />
            ))}
          </div>
        </div>
      </Container>
      <JsonLd data={faqPageJsonLd(items)} />
    </Section>
  );
}
