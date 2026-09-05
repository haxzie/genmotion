"use client";

import { useState } from "react";
import Link from "next/link";
import type { TemplateCatalog, TemplateSummary } from "@genmotion/templates/types";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { TemplateMasonry } from "@/components/marketing/template-masonry";
import type { TemplateCategory } from "@/lib/marketing/template-categories";

/**
 * Gallery + pagination, for `/templates` and every `/templates/category/*`
 * page alike — one component, one pill row. The pills are real links to the
 * dedicated category pages, not a second, client-side-only filter: that used
 * to exist here too, and having both meant two nearly-identical pill rows
 * stacked on the same page for what was really one idea.
 */
export function TemplatesBrowser({
  initialTemplates,
  initialCursor,
  categories,
  activeSlug,
  emptyMessage = "No templates yet — check back soon.",
}: {
  initialTemplates: TemplateSummary[];
  initialCursor: string | null;
  /** Every category worth linking to (i.e. at least one template already
   *  carries its tag) — the same list on every page, so the pill row reads
   *  identically wherever it appears. */
  categories: TemplateCategory[];
  /** The category page currently being viewed, if any — its own pill renders
   *  as the active one instead of a link back to the page it's already on. */
  activeSlug?: string;
  /** Shown in place of the grid when `initialTemplates` starts empty — a thin
   *  category page still renders (so the pill row above stays a way out to
   *  one that isn't), it just has this instead of a grid. */
  emptyMessage?: string;
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await api<TemplateCatalog>(
        `/api/templates?cursor=${encodeURIComponent(cursor)}`,
      );
      setTemplates((current) => [...current, ...page.templates]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isActive = category.slug === activeSlug;
            return (
              <Link
                key={category.slug}
                href={`/templates/category/${category.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                  "rounded-full border px-4 py-1.5 text-[0.9rem] font-medium transition-colors duration-150",
                  isActive
                    ? "border-transparent bg-cta text-background"
                    : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
                )}
              >
                {category.heading}
              </Link>
            );
          })}
        </div>
      )}

      {templates.length > 0 ? (
        <div className="mt-10">
          <TemplateMasonry templates={templates} />
        </div>
      ) : (
        <p className="mt-10 text-text-tertiary">{emptyMessage}</p>
      )}

      {cursor && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-5 text-[0.95rem] font-medium text-text-secondary transition-colors duration-150 hover:border-border-strong hover:text-text-primary disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
