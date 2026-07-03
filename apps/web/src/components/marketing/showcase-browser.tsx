"use client";

import { useMemo, useState } from "react";
import { cx } from "@/lib/cx";
import type { ShowcaseVideo } from "@/lib/marketing/content";
import { ShowcaseGrid } from "@/components/marketing/showcase-grid";

const ALL = "All";

/** Filterable gallery: top-level category tabs above a responsive video grid. */
export function ShowcaseBrowser({ videos }: { videos: ShowcaseVideo[] }) {
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const v of videos) {
      if (v.category && !seen.includes(v.category)) seen.push(v.category);
    }
    return [ALL, ...seen];
  }, [videos]);

  const [active, setActive] = useState(ALL);

  const filtered =
    active === ALL ? videos : videos.filter((v) => v.category === active);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filter videos by category"
        className="flex flex-wrap gap-2"
      >
        {categories.map((category) => {
          const isActive = category === active;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(category)}
              className={cx(
                "rounded-full border px-4 py-1.5 text-[0.9rem] font-medium transition-colors duration-150",
                isActive
                  ? "border-transparent bg-cta text-background"
                  : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
              )}
            >
              {category}
            </button>
          );
        })}
      </div>

      <ShowcaseGrid videos={filtered} className="mt-10" />

      {filtered.length === 0 && (
        <p className="mt-10 text-text-tertiary">
          No videos in this category yet.
        </p>
      )}
    </div>
  );
}
