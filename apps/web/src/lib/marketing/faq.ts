export type Faq = { q: string; a: string };

/** Build a schema.org FAQPage object from a list of Q&A pairs. */
export function faqPageJsonLd(items: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

/** Coerce arbitrary frontmatter into a clean Faq[] (drops malformed entries). */
export function parseFaqs(value: unknown): Faq[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const q = (entry as Record<string, unknown>).q;
        const a = (entry as Record<string, unknown>).a;
        if (typeof q === "string" && typeof a === "string") {
          return { q: q.trim(), a: a.trim() };
        }
      }
      return null;
    })
    .filter((x): x is Faq => x !== null);
}
