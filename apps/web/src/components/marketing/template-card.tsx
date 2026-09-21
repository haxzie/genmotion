"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TemplateSummary } from "@genmotion/templates/types";
import { formatPublished, templateApiUrl } from "@/lib/marketing/templates";

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * A single template tile: poster at its real aspect ratio, title, tags.
 *
 * Sits inside `TemplateMasonry`'s own columns rather than a uniform grid — a
 * template's own aspect ratio (16:9, 9:16, 1:1) is part of what it's
 * showing, and letterboxing every card to one shape would hide that. Not
 * `break-inside-avoid`/margin-based spacing: that was for CSS's own
 * `columns-*`, which `TemplateMasonry` replaced — its flex columns own
 * spacing via `gap` instead.
 *
 * Hovering plays the template's own rendered video, muted and looping, the
 * same as the desktop app's gallery — debounced so a pointer just passing
 * through the grid on its way somewhere else doesn't start loading a video
 * for every card it crosses. In the video-only presentation (`showDetails`
 * off), that same hover also fades in a bottom bar carrying the title and an
 * arrow — everything here sits inside the one card-wide `Link`, so nothing
 * needs its own click handling.
 *
 * `showDetails` drops the title/description/meta/tags below the poster, for
 * spots (the homepage teaser) where the grid is meant to read as pure video.
 */
export function TemplateCard({
  template,
  showDetails = true,
}: {
  template: TemplateSummary;
  showDetails?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    if (!hovered) return;
    const timer = setTimeout(() => setPreviewing(true), 150);
    return () => clearTimeout(timer);
  }, [hovered]);

  return (
    <Link
      href={`/templates/${template.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPreviewing(false);
      }}
      className="group block w-full overflow-hidden rounded-xl border border-border bg-surface transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
    >
      <div
        className="relative overflow-hidden bg-surface-raised"
        style={{ aspectRatio: `${template.width} / ${template.height}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={templateApiUrl(`${template.posterPath}?v=${template.revision}`)}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {previewing && (
          <video
            src={templateApiUrl(`${template.videoPath}?v=${template.revision}`)}
            className="absolute inset-0 size-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        )}
        {!showDetails && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-3 pt-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="truncate text-[0.9rem] font-medium text-white">
              {template.title}
            </span>
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-background">
              <ArrowIcon />
            </span>
          </div>
        )}
      </div>
      {showDetails && (
        <div className="p-5">
          <h3 className="text-[1.05rem] font-medium tracking-tight group-hover:text-text-primary">
            {template.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[0.9rem] text-text-secondary">
            {template.description}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[0.8rem] text-text-tertiary">
            <span>
              {template.width}×{template.height}
            </span>
            <span aria-hidden>·</span>
            <span>{formatDuration(template.durationInFrames / template.fps)}</span>
            <span aria-hidden>·</span>
            <time dateTime={template.publishedAt}>{formatPublished(template.publishedAt)}</time>
          </div>
          {template.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[0.75rem] text-text-tertiary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
