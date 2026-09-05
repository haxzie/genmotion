"use client";

import { useMemo, useState } from "react";
import type { TemplateCatalog, TemplateSummary, TemplateTag } from "@genmotion/templates/types";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { TemplateCard } from "@/components/marketing/template-card";

const GRID = "columns-1 gap-5 sm:columns-2 lg:columns-3";

/**
 * Filterable, paginated gallery — the marketing-site twin of the desktop
 * app's Templates screen. The first page renders server-side (so the page
 * has real content before any JS runs); "Load more" fetches the rest from
 * here, straight against the API the desktop app already talks to.
 */
export function TemplatesBrowser({
  initialTemplates,
  initialCursor,
}: {
  initialTemplates: TemplateSummary[];
  initialCursor: string | null;
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState<TemplateTag | null>(null);

  const availableTags = useMemo(() => {
    const seen = new Set<TemplateTag>();
    const tags: TemplateTag[] = [];
    for (const template of templates) {
      for (const tag of template.tags) {
        if (!seen.has(tag)) {
          seen.add(tag);
          tags.push(tag);
        }
      }
    }
    return tags;
  }, [templates]);

  const filtered = activeTag ? templates.filter((t) => t.tags.includes(activeTag)) : templates;

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
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const isActive = tag === activeTag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
                aria-pressed={isActive}
                className={cx(
                  "rounded-full border px-4 py-1.5 text-[0.9rem] font-medium transition-colors duration-150",
                  isActive
                    ? "border-transparent bg-cta text-background"
                    : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      <div className={cx(GRID, "mt-10")}>
        {filtered.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-text-tertiary">No templates tagged “{activeTag}” yet.</p>
      )}

      {/* Filtering is client-side over whatever has loaded so far, active tag
          or not — loading more can surface further matches for it. */}
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
