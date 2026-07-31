import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { getAllPosts } from "@/lib/marketing/content";
import { formatDate } from "@/lib/marketing/format";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

const FAQS: Faq[] = [
  {
    q: "What does the GenMotion blog cover?",
    a: "Product news, engineering deep dives on topics like deterministic rendering, and practical craft tips for making better motion videos.",
  },
  {
    q: "How often do you publish?",
    a: "We post as we ship and as we learn. Check back regularly, or follow along for announcements and tutorials.",
  },
  {
    q: "Can I try GenMotion while I read?",
    a: "Yes — GenMotion is free to start with no credit card. Describe an idea on the homepage and the agent will animate it in minutes.",
  },
];

export const metadata: Metadata = pageMetadata({
  title: "Blog — GenMotion",
  description:
    "Product news, engineering deep dives, and motion-design craft from the GenMotion team.",
  path: "/blog",
});

export default function BlogIndexPage() {
  const posts = getAllPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    url: `${SITE_URL}/blog`,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.date || undefined,
      author: { "@type": "Person", name: p.author },
      url: `${SITE_URL}/blog/${p.slug}`,
    })),
  };

  return (
    <>
    <JsonLd data={jsonLd} />
    <Section>
      <Container>
        <div className="border-b border-border pb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Blog
          </h1>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3 text-[0.857rem] text-text-tertiary">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                {post.tags[0] && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{post.tags[0]}</span>
                  </>
                )}
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">
                {post.title}
              </h2>
              <p className="mt-2 flex-1 text-[0.95rem] text-text-secondary">
                {post.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-[0.9rem] text-accent">
                Read post
                <svg viewBox="0 0 24 24" className="size-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <p className="mt-10 rounded-xl border border-dashed border-border px-6 py-16 text-center text-text-tertiary">
            No posts yet — check back soon.
          </p>
        )}
      </Container>
    </Section>
    <FaqSection items={FAQS} />
    </>
  );
}
