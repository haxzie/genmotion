import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section, LinkButton } from "@/components/marketing/primitives";
import { DownloadButton } from "@/components/marketing/download-button";
import { Prose } from "@/components/marketing/prose";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { VideoPlayer } from "@/components/marketing/video-player";
import { SidebarCard } from "@/components/marketing/sidebar-card";
import { getAllPosts, getPostBySlug, parseBody } from "@/lib/marketing/content";
import { formatDate } from "@/lib/marketing/format";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Blog — GenMotion" };
  return pageMetadata({
    title: `${post.title} — GenMotion`,
    description: post.description,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.date,
    modifiedTime: post.updated || post.date,
    ogTitle: post.title,
    image: null, // generated per-post by ./opengraph-image.tsx
  });
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated || post.date,
      author: { "@type": "Organization", name: post.author },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
      },
      url: `${SITE_URL}/blog/${post.slug}`,
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title,
          item: `${SITE_URL}/blog/${post.slug}`,
        },
      ],
    },
  ];

  return (
    <>
    <JsonLd data={jsonLd} />
    <Section>
      <Container className="max-w-6xl">
        {/* Two columns from xl: the post, and a card that stays in view beside it.
            Below that it is one column and the card is not shown; the page's own
            call to action at the end carries the offer. */}
        <div className="grid justify-center gap-x-14 xl:grid-cols-[minmax(0,48rem)_19rem]">
        <article className="mx-auto w-full max-w-3xl xl:max-w-none">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[0.9rem] text-text-tertiary transition-colors hover:text-green"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H6M11 6l-6 6 6 6" />
          </svg>
          All posts
        </Link>

        <header className="mt-8 border-b border-border pb-8">
          <div className="flex flex-wrap items-center gap-3 text-[0.857rem] text-text-tertiary">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span>·</span>
            <span>{post.author}</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border px-2.5 py-0.5 capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-text-secondary">{post.description}</p>
        </header>

        <div className="mt-10 space-y-8">
          {parseBody(post.body).map((block, i) =>
            block.type === "video" ? (
              <figure key={i}>
                <VideoPlayer src={block.url} poster={block.poster} title={block.caption} />
                {block.caption && (
                  <figcaption className="mt-3 text-center text-[0.9rem] text-text-tertiary">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            ) : (
              <Prose key={i}>{block.content}</Prose>
            ),
          )}
        </div>

        <div className="mt-16 flex items-center justify-between gap-4 border-t border-border pt-10">
          <p className="text-text-secondary">Ready to make your own?</p>
          <DownloadButton />
        </div>
        </article>
        <aside className="hidden xl:block" aria-label="About GenMotion">
          <div className="sticky top-24 pt-[4.5rem]">
            <SidebarCard tool="general" />
          </div>
        </aside>
        </div>
      </Container>
    </Section>
    <FaqSection items={post.faqs} />
    </>
  );
}
