import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section, LinkButton } from "@/components/marketing/primitives";
import { Prose } from "@/components/marketing/prose";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { VideoPlayer } from "@/components/marketing/video-player";
import {
  getAllShowcaseVideos,
  getShowcaseVideoBySlug,
} from "@/lib/marketing/content";
import { formatDate } from "@/lib/marketing/format";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getAllShowcaseVideos().map((v) => ({ id: v.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const video = getShowcaseVideoBySlug(id);
  if (!video) return { title: "Showcase — GenMotion" };
  return {
    title: `${video.title} — GenMotion Showcase`,
    description: video.description,
    openGraph: {
      title: video.title,
      description: video.description,
      type: "video.other",
      images: video.poster ? [{ url: video.poster }] : undefined,
    },
  };
}

export default async function ShowcaseVideoPage({ params }: Params) {
  const { id } = await params;
  const video = getShowcaseVideoBySlug(id);
  if (!video) notFound();

  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description,
    thumbnailUrl: video.poster || undefined,
    uploadDate: video.date,
    contentUrl: video.videoUrl,
    creator: { "@type": "Person", name: video.author },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
    },
    url: `${SITE_URL}/showcase/${video.slug}`,
  };

  return (
    <>
      <JsonLd data={videoJsonLd} />
      <Section>
        <Container className="max-w-4xl">
          <Link
            href="/showcase"
            className="inline-flex items-center gap-1.5 text-[0.9rem] text-text-tertiary transition-colors hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H6M11 6l-6 6 6 6" />
            </svg>
            All videos
          </Link>

          <header className="mt-8">
            <div className="flex flex-wrap items-center gap-3 text-[0.857rem] text-text-tertiary">
              {video.date && (
                <time dateTime={video.date}>{formatDate(video.date)}</time>
              )}
              {video.duration && (
                <>
                  <span>·</span>
                  <span>{video.duration}</span>
                </>
              )}
              {video.aspectRatio && (
                <>
                  <span>·</span>
                  <span>{video.aspectRatio}</span>
                </>
              )}
              {video.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-2.5 py-0.5 capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
              {video.title}
            </h1>
            <p className="mt-4 text-lg text-text-secondary">
              {video.description}
            </p>
            <div className="mt-4 flex items-center gap-2 text-[0.95rem] text-text-tertiary">
              {video.authorImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.authorImage}
                  alt=""
                  className="size-6 rounded-full object-cover"
                />
              )}
              <span>
                By {video.author}
                {video.authorRole && ` · ${video.authorRole}`}
              </span>
            </div>
          </header>

          <div className="mt-8">
            <VideoPlayer
              src={video.videoUrl}
              poster={video.poster}
              title={video.title}
              aspectRatio={video.aspectRatio}
            />
          </div>

          {video.body && (
            <div className="mt-10 border-t border-border pt-10">
              <Prose>{video.body}</Prose>
            </div>
          )}

          <div className="mt-16 flex items-center justify-between gap-4 border-t border-border pt-10">
            <p className="text-text-secondary">Ready to make your own?</p>
            <LinkButton href="/signup">Start free</LinkButton>
          </div>
        </Container>
      </Section>
      <FaqSection items={video.faqs} />
    </>
  );
}
