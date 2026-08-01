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
      dateModified: p.updated || p.date || undefined,
      author: { "@type": "Organization", name: p.author },
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

        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block"
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
              <h2 className="mt-2 font-display text-xl font-semibold tracking-tight transition-colors group-hover:text-green">
                {post.title}
              </h2>
              <p className="mt-2 text-[0.95rem] text-text-secondary">
                {post.description}
              </p>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <p className="mt-10 text-text-tertiary">
            No posts yet — check back soon.
          </p>
        )}
      </Container>
    </Section>
    <FaqSection items={FAQS} />
    </>
  );
}
