import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section } from "@/components/marketing/primitives";
import { AnswerSections, AnswersHeader } from "@/components/marketing/answers";
import { JsonLd } from "@/components/marketing/json-ld";
import { TOOL_META, getAnswersByTool } from "@/lib/marketing/answers";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_URL } from "@/lib/marketing/site";

const TOOL = "hyperframes" as const;
const META = TOOL_META[TOOL];

export const metadata: Metadata = pageMetadata({
  title: `${META.name} troubleshooting: errors, fixes and answers — GenMotion`,
  description: META.intro.split(". ").slice(0, 2).join(". ") + ".",
  path: "/answers/hyperframes",
});

export default function ToolAnswersPage() {
  const answers = getAnswersByTool(TOOL);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${META.name} troubleshooting`,
      url: `${SITE_URL}/answers/${TOOL}`,
      hasPart: answers.map((a) => ({
        "@type": "TechArticle",
        headline: a.title,
        description: a.description,
        url: `${SITE_URL}/answers/${a.slug}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Answers", item: `${SITE_URL}/answers` },
        { "@type": "ListItem", position: 3, name: META.name, item: `${SITE_URL}/answers/${TOOL}` },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Section>
        <Container>
          <AnswersHeader
            eyebrow={META.name}
            title={META.tagline}
            lede={META.intro}
            tool={TOOL}
          />
          <div className="mt-14">
            <AnswerSections answers={answers} />
          </div>
          {META.elsewhere.length > 0 && (
            <div className="mt-16 border-t border-border pt-10">
              <h2 className="font-display text-xl font-semibold tracking-tight">Also worth reading</h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {META.elsewhere.map((e) => (
                  <li key={e.href}>
                    <Link
                      href={e.href}
                      className="group block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-hover"
                    >
                      <span className="font-medium">{e.label}</span>
                      <span className="mt-1.5 block text-[0.95rem] text-text-secondary">{e.note}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
