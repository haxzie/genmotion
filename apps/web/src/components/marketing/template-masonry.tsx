"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateSummary } from "@genmotion/templates/types";
import { TemplateCard } from "@/components/marketing/template-card";

/** Matches the `sm`/`lg` breakpoints the old `sm:columns-2 lg:columns-3` used. */
function useColumnCount(): number {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const update = () => setCount(lg.matches ? 3 : sm.matches ? 2 : 1);
    update();
    sm.addEventListener("change", update);
    lg.addEventListener("change", update);
    return () => {
      sm.removeEventListener("change", update);
      lg.removeEventListener("change", update);
    };
  }, []);
  return count;
}

/** `gap-5`. */
const GAP_PX = 20;
/** A card's own text block below the poster — padding, title, the 2-line
 *  clamped description, the meta line, and a tag row — is close enough in
 *  height across every card (they all follow the same shape) that this
 *  constant, added to the poster's own real aspect ratio, is enough to
 *  compare columns by by without measuring anything in the real DOM. */
const TEXT_BLOCK_PX = 168;

function estimateHeight(template: TemplateSummary, columnWidth: number): number {
  const posterHeight = columnWidth * (template.height / template.width);
  return posterHeight + TEXT_BLOCK_PX;
}

/**
 * True masonry: each card goes into whichever column is currently shortest,
 * not into columns balanced by total height the way CSS's own `columns-*`
 * does. That balancing is what left visible empty space under a short card
 * sitting next to a tall one — this places by an actual running height
 * instead, so a column only ever gets ahead of the others by one card's
 * worth of "no shorter option existed yet".
 */
export function TemplateMasonry({ templates }: { templates: TemplateSummary[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const columnCount = useColumnCount();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columnWidth =
    columnCount > 0 ? (containerWidth - GAP_PX * (columnCount - 1)) / columnCount : 0;

  const columns: TemplateSummary[][] = Array.from({ length: columnCount }, () => []);
  if (columnWidth > 0) {
    const heights = new Array(columnCount).fill(0);
    for (const template of templates) {
      let shortest = 0;
      for (let i = 1; i < columnCount; i++) {
        if (heights[i]! < heights[shortest]!) shortest = i;
      }
      columns[shortest]!.push(template);
      heights[shortest] += estimateHeight(template, columnWidth) + GAP_PX;
    }
  } else {
    // Before the container has been measured once, round-robin rather than
    // render nothing — close enough for an instant that resolves itself.
    templates.forEach((template, i) => columns[i % columnCount]!.push(template));
  }

  return (
    <div ref={containerRef} className="flex gap-5">
      {columns.map((column, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-5">
          {column.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ))}
    </div>
  );
}
