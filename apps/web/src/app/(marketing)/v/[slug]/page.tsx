import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, LinkButton, Section } from "@/components/marketing/primitives";
import { VideoPlayer } from "@/components/marketing/video-player";
import { JsonLd } from "@/components/marketing/json-ld";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import {
  aspectRatioOf,
  formatDuration,
  getSharedVideo,
  shareDownloadUrl,
  sharePosterUrl,
  shareVideoUrl,
} from "@/lib/marketing/shares";

/**
 * A video someone shared.
 *
 * Every one of these is a page about a video made with GenMotion, which is why
 * it is indexed rather than unlisted — a share is the product demonstrating
 * itself, with the person who made it named on it.
 *
 * Rendered from the API on demand. Nothing about the viewer is read here: a
 * cookie read during render makes Next serve `private, no-cache`, which would
 * kill exactly the link previews this page exists to produce.
 */

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const video = await getSharedVideo(slug);
  if (!video || video === "gone") {
    return { title: `Video — ${SITE_NAME}`, robots: { index: false, follow: false } };
  }

  const description =
    video.description?.trim() ||
    `A motion video${video.author ? ` by ${video.author.name}` : ""}, made with ${SITE_NAME}.`;

  return pageMetadata({
    title: `${video.title} — ${SITE_NAME}`,
    description,
    path: `/v/${video.slug}`,
    type: "video.other",
    publishedTime: video.createdAt,
    ogTitle: video.title,
    // The poster is the card. Without one the site default is better than a
    // broken image, which is what `undefined` falls back to.
    image: video.hasPoster
      ? {
          url: sharePosterUrl(video.slug),
          width: video.width ?? 1280,
          height: video.height ?? 720,
          alt: video.title,
        }
      : undefined,
  });
}

export default async function SharedVideoPage({ params }: Params) {
  const { slug } = await params;
  const video = await getSharedVideo(slug);

  // Withdrawn, rather than never there. Said plainly, because whoever followed
  // the link did nothing wrong and a bare 404 reads like a broken site.
  if (video === "gone") {
    return (
      <Section>
        <Container className="max-w-xl text-center">
          <h1 className="font-display text-3xl tracking-tight">This video was removed</h1>
          <p className="mt-3 text-text-secondary">
            The person who shared it has taken it down.
          </p>
          <div className="mt-8 flex justify-center">
            <LinkButton href="/" variant="secondary">
              Go to {SITE_NAME}
            </LinkButton>
          </div>
        </Container>
      </Section>
    );
  }
  if (!video) notFound();

  const description = video.description?.trim();
  const meta = [
    video.durationSeconds ? formatDuration(video.durationSeconds) : null,
    video.width && video.height ? `${video.width} × ${video.height}` : null,
    new Date(video.createdAt).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  ].filter((part): part is string => Boolean(part));

  return (
    <Section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: video.title,
          description: description ?? `A motion video made with ${SITE_NAME}.`,
          contentUrl: shareVideoUrl(video.slug),
          embedUrl: `${SITE_URL}/v/${video.slug}`,
          uploadDate: video.createdAt,
          ...(video.hasPoster ? { thumbnailUrl: sharePosterUrl(video.slug) } : {}),
          ...(video.durationSeconds
            ? { duration: `PT${Math.round(video.durationSeconds)}S` }
            : {}),
          ...(video.width && video.height
            ? { width: video.width, height: video.height }
            : {}),
          ...(video.author ? { creator: { "@type": "Person", name: video.author.name } } : {}),
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        }}
      />

      <Container className="max-w-3xl">
        <header>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{video.title}</h1>
          {description && <p className="mt-4 text-lg text-text-secondary">{description}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.95rem] text-text-tertiary">
            {video.author && (
              <span className="flex items-center gap-2">
                {video.author.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.author.image}
                    alt=""
                    className="size-6 rounded-full object-cover"
                  />
                )}
                <span>By {video.author.name}</span>
              </span>
            )}
            {meta.map((part) => (
              <span key={part} className="flex items-center gap-2">
                <span aria-hidden>·</span>
                <span>{part}</span>
              </span>
            ))}
          </div>
        </header>

        <div className="mt-8">
          <VideoPlayer
            src={shareVideoUrl(video.slug)}
            poster={video.hasPoster ? sharePosterUrl(video.slug) : undefined}
            title={video.title}
            aspectRatio={aspectRatioOf(video.width, video.height)}
          />
        </div>

        {/* The conversion, and the honest version of it. There is no "remix
            this" here: sharing publishes the video, not the project behind it,
            so the only thing this page can truthfully offer a visitor is the
            tool that made it. */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-raised px-5 py-4">
          <p className="text-text-secondary">
            Made with {SITE_NAME} — an AI motion video studio.
          </p>
          <div className="flex items-center gap-2">
            <LinkButton href={shareDownloadUrl(video.slug)} variant="ghost">
              Download
            </LinkButton>
            <LinkButton href="/download" variant="primary">
              Make your own
            </LinkButton>
          </div>
        </div>
      </Container>
    </Section>
  );
}
