"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TemplateSummary } from "@genmotion/templates/types";
import { templateApiUrl } from "@/lib/marketing/templates";

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * A single template tile: poster at its real aspect ratio, title, tags.
 *
 * Sits inside a CSS-columns masonry layout rather than a uniform grid — a
 * template's own aspect ratio (16:9, 9:16, 1:1) is part of what it's
 * showing, and letterboxing every card to one shape would hide that.
 *
 * Hovering plays the template's own rendered video, muted and looping, the
 * same as the desktop app's gallery — debounced so a pointer just passing
 * through the grid on its way somewhere else doesn't start loading a video
 * for every card it crosses.
 */
export function TemplateCard({ template }: { template: TemplateSummary }) {
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
      className="group mb-5 block w-full break-inside-avoid overflow-hidden rounded-xl border border-border bg-surface transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
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
      </div>
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
    </Link>
  );
}
