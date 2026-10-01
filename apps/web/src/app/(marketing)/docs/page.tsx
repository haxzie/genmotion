import type { Metadata } from "next";
import { Container, Eyebrow, Section } from "@/components/marketing/primitives";
import { Prose } from "@/components/marketing/prose";
import { CopyTextButton } from "@/components/marketing/copy";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_URL } from "@/lib/marketing/site";
import { DOC_SECTIONS, DOCS_PATH, SETUP_PROMPT } from "@/lib/marketing/setup";

export const metadata: Metadata = pageMetadata({
  title: "Docs: install and set up GenMotion",
  description:
    "Install GenMotion Studio on your Mac or the genmotion CLI with npm, connect Claude Code, Codex or Cursor, and render your first video.",
  path: DOCS_PATH,
});

/**
 * One long page rather than a docs site: there is not yet enough to split,
 * and a single page is what an agent handed the URL can read in one fetch.
 * The sections come from `lib/marketing/setup.ts`, which the download page
 * and the home page's prompt button also read.
 */
export default function DocsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Install and set up GenMotion",
    url: `${SITE_URL}${DOCS_PATH}`,
    articleSection: DOC_SECTIONS.map((s) => s.title),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Section>
        <Container className="max-w-6xl">
          <header className="max-w-3xl border-b border-border pb-10">
            <Eyebrow className="mb-4">Docs</Eyebrow>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Install and set up GenMotion
            </h1>
            <p className="mt-5 text-lg text-text-secondary">
              Get the Studio or the CLI running, connect your coding agent, and
              render your first video.
            </p>
          </header>

          <div className="mt-12 grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)]">
            <nav aria-label="On this page" className="hidden lg:block">
              <ul className="sticky top-24 flex flex-col gap-2 text-[0.9rem]">
                {DOC_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-text-tertiary transition-colors hover:text-text-primary"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex min-w-0 max-w-3xl flex-col gap-16">
              {DOC_SECTIONS.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                      <a href={`#${section.id}`} className="hover:text-green">
                        {section.title}
                      </a>
                    </h2>
                    {section.id === "setup-prompt" && (
                      <CopyTextButton text={SETUP_PROMPT} label="Copy prompt" />
                    )}
                  </div>
                  <div className="mt-6">
                    <Prose>{section.body}</Prose>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
