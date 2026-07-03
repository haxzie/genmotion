"use client";

import { cx } from "@/lib/cx";

/** Map a YouTube or Vimeo watch URL to its embeddable form, or null if the
 *  URL is a direct media file we can hand to a native <video> element. */
function toEmbedUrl(url: string): string | null {
  const yt =
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/** Turn an aspect-ratio string like "16:9" into a CSS aspect-ratio value. */
function aspectStyle(aspectRatio?: string): string {
  if (!aspectRatio) return "16 / 9";
  const [w, h] = aspectRatio.split(/[:/]/).map((n) => Number(n.trim()));
  return w && h && w > 0 && h > 0 ? `${w} / ${h}` : "16 / 9";
}

export function VideoPlayer({
  src,
  poster,
  title,
  aspectRatio,
  className,
}: {
  src: string;
  poster?: string;
  title?: string;
  aspectRatio?: string;
  className?: string;
}) {
  const embed = toEmbedUrl(src);

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-xl border border-border bg-black",
        className,
      )}
      style={{ aspectRatio: aspectStyle(aspectRatio) }}
    >
      {embed ? (
        <iframe
          src={embed}
          title={title ?? "Showcase video"}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={src}
          poster={poster || undefined}
          controls
          playsInline
          preload="metadata"
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
}
