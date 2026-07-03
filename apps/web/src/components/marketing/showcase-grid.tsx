import Link from "next/link";
import { cx } from "@/lib/cx";
import type { ShowcaseVideo } from "@/lib/marketing/content";

function PlayBadge() {
  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-background/70 text-text-primary backdrop-blur-sm transition-transform duration-150 group-hover:scale-110">
      <svg viewBox="0 0 24 24" className="size-5 translate-x-px" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

/** A single video tile: poster with a play overlay plus title/author/meta. */
export function ShowcaseCard({ video }: { video: ShowcaseVideo }) {
  return (
    <Link
      href={`/showcase/${video.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
    >
      <div
        className="relative overflow-hidden bg-surface-raised"
        style={{ aspectRatio: "16 / 9" }}
      >
        {video.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.poster}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="size-full bg-surface-raised" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/40 to-transparent">
          <PlayBadge />
        </div>
        {video.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[0.75rem] text-text-secondary backdrop-blur-sm">
            {video.duration}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {video.tags[0] && (
          <span className="text-[0.786rem] font-medium uppercase tracking-[0.12em] text-text-tertiary">
            {video.tags[0]}
          </span>
        )}
        <h3 className="mt-1.5 text-[1.05rem] font-medium tracking-tight group-hover:text-text-primary">
          {video.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[0.95rem] text-text-secondary">
          {video.description}
        </p>
        <div className="mt-4 flex items-center gap-2 text-[0.857rem] text-text-tertiary">
          {video.authorImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.authorImage}
              alt=""
              className="size-5 rounded-full object-cover"
              loading="lazy"
            />
          )}
          <span>
            {video.author}
            {video.authorRole && ` · ${video.authorRole}`}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Responsive grid of showcase tiles. */
export function ShowcaseGrid({
  videos,
  className,
}: {
  videos: ShowcaseVideo[];
  className?: string;
}) {
  return (
    <div
      className={cx(
        "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {videos.map((video) => (
        <ShowcaseCard key={video.slug} video={video} />
      ))}
    </div>
  );
}
