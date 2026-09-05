import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section, Eyebrow } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { TemplatesBrowser } from "@/components/marketing/templates-browser";
import { getAllTemplateSummaries, templateApiUrl } from "@/lib/marketing/templates";
import { TEMPLATE_CATEGORIES, getTemplateCategory } from "@/lib/marketing/template-categories";
import { pageMetadata, TEMPLATES_OG_IMAGE } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

type Params = { params: Promise<{ slug: string }> };

// Same questions as the main gallery — a category page is that same gallery,
// scoped, not a different product.
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

export async function generateStaticParams() {
  try {
    const summaries = await getAllTemplateSummaries();
    // Only a category something already fills — an empty landing page is
    // thin content, and the tag still exists in the filter row on /templates
    // for whenever the first one for it ships.
    return TEMPLATE_CATEGORIES.filter((c) =>
      summaries.some((t) => t.tags.includes(c.tag)),
    ).map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = getTemplateCategory(slug);
  if (!category) return { title: "Templates — GenMotion" };
  return pageMetadata({
    title: category.metaTitle,
    description: category.description,
    path: `/templates/category/${category.slug}`,
    image: TEMPLATES_OG_IMAGE,
  });
}

export default async function TemplateCategoryPage({ params }: Params) {
  const { slug } = await params;
  const category = getTemplateCategory(slug);
  if (!category) notFound();

  const allSummaries = await getAllTemplateSummaries();
  const templates = allSummaries.filter((t) => t.tags.includes(category.tag));
  // The same cross-page pill row `/templates` shows — computed from the whole
  // catalog, not this category's own (possibly empty) result set, so it's
  // still a way out to somewhere with content on a thin category page.
  const categories = TEMPLATE_CATEGORIES.filter((c) =>
    allSummaries.some((t) => t.tags.includes(c.tag)),
  );

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${SITE_NAME} ${category.heading}`,
      url: `${SITE_URL}/templates/category/${category.slug}`,
      itemListElement: templates.map((t, i) => ({
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
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Templates", item: `${SITE_URL}/templates` },
        {
          "@type": "ListItem",
          position: 3,
          name: category.heading,
          item: `${SITE_URL}/templates/category/${category.slug}`,
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Section>
        <Container>
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 text-[0.9rem] text-text-tertiary transition-colors hover:text-green"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H6M11 6l-6 6 6 6" />
            </svg>
            All templates
          </Link>

          <div className="mt-6 max-w-2xl">
            <Eyebrow className="mb-4">Templates</Eyebrow>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {category.heading}
            </h1>
            <p className="mt-5 text-lg text-text-secondary">{category.description}</p>
          </div>

          <div className="mt-14">
            <TemplatesBrowser
              initialTemplates={templates}
              initialCursor={null}
              categories={categories}
              activeSlug={category.slug}
              emptyMessage={`No ${category.heading.toLowerCase()} yet — check back soon.`}
            />
          </div>
        </Container>
      </Section>
      <FaqSection items={FAQS} />
    </>
  );
}
