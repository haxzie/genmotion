import type { Metadata } from "next";
import { Container, Section, Eyebrow } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { TemplatesBrowser } from "@/components/marketing/templates-browser";
import { getAllTemplateSummaries, getTemplatesPage, templateApiUrl } from "@/lib/marketing/templates";
import { TEMPLATE_CATEGORIES } from "@/lib/marketing/template-categories";
import { pageMetadata, TEMPLATES_OG_IMAGE } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

const FAQS: Faq[] = [
  {
    q: "What is a GenMotion template?",
    a: "A finished, working video — real scenes, real assets, nothing stubbed out. Open one, watch it play, and Remix it into a project of your own.",
  },
  {
    q: "Can I edit a template after remixing it?",
    a: "Yes. A remix is an ordinary GenMotion project from the moment it lands — edit it by chat, on the timeline, or scene by scene, exactly like a project you started from scratch.",
  },
  {
    q: "Do I need the desktop app to use a template?",
    a: "You can preview and read about every template right here. Remixing one into an editable project happens in the GenMotion desktop app.",
  },
];

export const metadata: Metadata = pageMetadata({
  title: "Video Templates — GenMotion",
  description:
    "Finished motion videos you can take apart — launch videos, announcements, and social ads. Remix one and it becomes a project of your own.",
  path: "/templates",
  ogDescription: "Finished motion videos, ready to remix into a project of your own.",
  image: TEMPLATES_OG_IMAGE,
});

export default async function TemplatesIndexPage() {
  const [firstPage, allSummaries] = await Promise.all([
    getTemplatesPage(),
    getAllTemplateSummaries(),
  ]);
  const initialTemplates = firstPage?.templates ?? [];
  const initialCursor = firstPage?.nextCursor ?? null;
  // Same "only link what isn't empty" rule as the category route's own
  // generateStaticParams — these are real, crawlable links, not the client-
  // side filter pills below, which is why they're worth having at all.
  const categories = TEMPLATE_CATEGORIES.filter((c) =>
    allSummaries.some((t) => t.tags.includes(c.tag)),
  );
  // Independent of `initialTemplates`/pagination on purpose: the pill row
  // reflects the whole catalog, not just whatever page happened to load.

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} Templates`,
    url: `${SITE_URL}/templates`,
    itemListElement: allSummaries.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "VideoObject",
        name: t.title,
        description: t.description,
        thumbnailUrl: templateApiUrl(t.posterPath),
        url: `${SITE_URL}/templates/${t.id}`,
      },
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Section>
        <Container>
          <div className="max-w-2xl">
            <Eyebrow className="mb-4">Templates</Eyebrow>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Start with a template
            </h1>
            <p className="mt-5 text-lg text-text-secondary">
              Real projects — real scenes, real assets — that you can watch, take apart, and
              remix into one of your own.
            </p>
          </div>

          <div className="mt-14">
            <TemplatesBrowser
              initialTemplates={initialTemplates}
              initialCursor={initialCursor}
              categories={categories}
            />
          </div>
        </Container>
      </Section>
      <FaqSection items={FAQS} />
    </>
  );
}
