import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import { GENERATOR_SLUGS, type Tool } from "@/lib/marketing/tools";

/**
 * Structured data for one tool page.
 *
 * Emitted from the server `page.tsx` rather than the client component that
 * renders the tool: it's static, so shipping it in the client bundle would cost
 * bytes for nothing, and keeping it beside `generateMetadata` means the two
 * descriptions can't drift apart.
 *
 * The FAQ block is not here — `FaqSection` already emits its own `FAQPage` from
 * the same `tool.faqs` array.
 */
export function toolJsonLd(tool: Tool): object[] {
  const url = `${SITE_URL}/tools/${tool.slug}`;
  const generatesVideo = GENERATOR_SLUGS.has(tool.slug);

  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: tool.name,
      description: tool.metaDescription,
      url,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web browser",
      browserRequirements: generatesVideo
        ? "Requires JavaScript and a browser with WebCodecs support (Chrome, Edge, or Safari 16.4+)."
        : "Requires JavaScript.",
      // Both the flag and a zero-priced offer: the flag is what Google reads
      // for "free" queries, the offer is what older consumers still expect.
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: tool.steps.map((step) => step.title),
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Free Tools", item: `${SITE_URL}/tools` },
        { "@type": "ListItem", position: 3, name: tool.name, item: url },
      ],
    },
  ];
}
