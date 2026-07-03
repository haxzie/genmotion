import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, Eyebrow } from "@/components/marketing/primitives";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { getAllPosts } from "@/lib/marketing/content";
import { formatDate } from "@/lib/marketing/format";
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

export const metadata: Metadata = {
  title: "Blog — GenMotion",
  description:
    "Product news, engineering deep dives, and motion-design craft from the GenMotion team.",
};

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
        <div className="max-w-2xl">
          <Eyebrow className="mb-4">Blog</Eyebrow>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            News, deep dives, and craft
          </h1>
          <p className="mt-5 text-lg text-text-secondary">
            What we&apos;re building and what we&apos;re learning about making
            motion video.
          </p>
        </div>

        <div className="mt-14 flex flex-col divide-y divide-border border-t border-border">
          {posts.map((post) => (
            <article key={post.slug} className="group py-8">
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="flex items-center gap-3 text-[0.857rem] text-text-tertiary">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  {post.tags[0] && (
                    <>
                      <span>·</span>
                      <span className="capitalize">{post.tags[0]}</span>
                    </>
                  )}
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight transition-colors group-hover:text-text-primary">
                  {post.title}
                </h2>
                <p className="mt-2 max-w-2xl text-text-secondary">
                  {post.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[0.9rem] text-text-tertiary transition-colors group-hover:text-text-primary">
                  Read post
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </article>
          ))}
          {posts.length === 0 && (
            <p className="py-12 text-text-tertiary">No posts yet — check back soon.</p>
          )}
        </div>
      </Container>
    </Section>
    <FaqSection items={FAQS} />
    </>
  );
}
