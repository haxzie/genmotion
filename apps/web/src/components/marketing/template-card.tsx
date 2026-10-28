"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TemplateSummary } from "@genmotion/templates/types";
import {
  formatPublished,
  templateApiUrl,
  templatePreviewSrc,
  templateVideoSrc,
} from "@/lib/marketing/templates";

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * How tall a card's text block is, in pixels.
 *
 * The masonry grid works in aspect ratios, and a detail card is a poster at
 * its real ratio plus this — the one number in the layout that is pixels. So
 * it is also the height the block is actually *given* below, rather than a
 * guess at what it will come out as: one number, used twice, which is the
 * only way the grid's arithmetic and the DOM cannot drift apart. Everything
 * inside is clamped to fit (one-line title, two-line description, one meta
 * row, one row of tags) and the block clips, so a larger root font size
 * loses a descender rather than the layout.
 */
export function templateDetailsHeight(template: TemplateSummary): number {
  return template.tags.length > 0 ? 154 : 121;
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
 * Sits inside a `TemplateMasonry` frame rather than a uniform grid — a
 * template's own aspect ratio (16:9, 9:16, 1:1) is part of what it's
 * showing, and letterboxing every card to one shape would hide that. The
 * frame owns the card's height, so the card fills it: poster at its real
 * ratio, text block (when shown) beneath at the fixed height
 * `templateDetailsHeight` promises the layout.
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
      className="group flex size-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
    >
      <div
        className="relative shrink-0 overflow-hidden bg-surface-raised"
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
            // The small rendition when the template has one — a card is a few
            // hundred pixels wide, and the full file is the same video at two
            // orders of magnitude the weight.
            src={templatePreviewSrc(template) ?? templateVideoSrc(template)}
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
        <div
          className="shrink-0 overflow-hidden p-5"
          style={{ height: templateDetailsHeight(template) }}
        >
          <h3 className="line-clamp-1 text-[1.05rem] font-medium leading-6 tracking-tight group-hover:text-text-primary">
            {template.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 h-10 text-[0.9rem] leading-5 text-text-secondary">
            {template.description}
          </p>
          <div className="mt-3 flex h-4 items-center gap-1.5 text-[0.8rem] leading-4 text-text-tertiary">
            <span>
              {template.width}×{template.height}
            </span>
            <span aria-hidden>·</span>
            <span>{formatDuration(template.durationInFrames / template.fps)}</span>
            <span aria-hidden>·</span>
            <time dateTime={template.publishedAt}>{formatPublished(template.publishedAt)}</time>
          </div>
          {template.tags.length > 0 && (
            <div className="mt-3 flex h-[22px] gap-1.5 overflow-hidden">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex shrink-0 items-center rounded-full border border-border px-2.5 text-[0.75rem] leading-5 text-text-tertiary"
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
