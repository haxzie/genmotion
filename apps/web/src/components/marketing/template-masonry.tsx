"use client";

import { useEffect, useRef, useState } from "react";
import { Frame, RegularMasonryGrid } from "@masonry-grid/react";
import type { TemplateSummary } from "@genmotion/templates/types";
import { TemplateCard, templateDetailsHeight } from "@/components/marketing/template-card";

/** `gap-5`, as a number the grid can also do arithmetic with. */
const GAP_PX = 20;
/**
 * Narrowest a column may get before the grid drops one. `auto-fill` +
 * `minmax()` does the rest, so there are no breakpoints here: 1104px of
 * content (`max-w-6xl` less its gutter) gives three columns, a tablet two,
 * a phone one, and the wider homepage strip four.
 */
const MIN_COLUMN_PX = 280;

/** What CSS's own `repeat(auto-fill, minmax(min, 1fr))` resolves to. */
function columnWidth(containerWidth: number, min: number): number {
  if (containerWidth <= 0) return 0;
  const count = Math.max(1, Math.floor((containerWidth + GAP_PX) / (min + GAP_PX)));
  return (containerWidth - GAP_PX * (count - 1)) / count;
}

/**
 * Column width assumed until the container has been measured, so the first
 * paint — including the server's — lands somewhere sane rather than stacking
 * everything into one column and then jumping. Only the detail cards care:
 * a video-only card's height is pure aspect ratio, which needs no pixels.
 */
const ASSUMED_COLUMN_PX = 354;

/**
 * The template gallery, laid out by `@masonry-grid/react`.
 *
 * `RegularMasonryGrid` rather than its balanced sibling because reading order
 * is the point: cards fill left to right, newest first, each one pulled up
 * under the card above it to close the gap a plain grid would leave. The
 * balanced variant reshuffles items within a row to minimise total height,
 * which buys a flatter bottom edge at the cost of the recency order.
 *
 * Every card declares its own aspect ratio, so the layout is arithmetic over
 * the catalog rather than a measure-then-reflow pass over the DOM — nothing
 * waits on a poster decoding, and the column count comes from CSS
 * (`auto-fill`) instead of a `matchMedia` list that only resolves after
 * hydration. That last part is what used to make this jump: the server, and
 * the first client paint, laid every card out in a single column.
 */
export function TemplateMasonry({
  templates,
  showDetails = true,
  minColumnWidth = MIN_COLUMN_PX,
}: {
  templates: TemplateSummary[];
  /** Passed straight to each `TemplateCard`. */
  showDetails?: boolean;
  minColumnWidth?: number;
}) {
  // Measured on a wrapper of our own rather than on the grid: the grid
  // component assigns a forwarded ref during render, so it is still null in
  // the effect that would observe it.
  const outerRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);

  // Only the detail cards need this: their height is a poster at its real
  // ratio plus a text block of a fixed pixel height, and the grid works in
  // ratios, so the text block has to be converted into ratio units — which
  // takes the column's width in pixels. A video-only card skips it entirely.
  useEffect(() => {
    if (!showDetails) return;
    const el = outerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setMeasured(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [showDetails]);

  const column = showDetails
    ? columnWidth(measured, minColumnWidth) || ASSUMED_COLUMN_PX
    : 0;

  return (
    <div ref={outerRef}>
      <RegularMasonryGrid
        frameWidth={minColumnWidth}
        gap={GAP_PX}
        style={{ alignItems: "start" }}
      >
        {templates.map((template) => {
          // A detail card is taller than its poster by the text block beneath
          // it. Expressed in the poster's own width units so the whole card
          // still reduces to one ratio.
          const extra = showDetails
            ? (templateDetailsHeight(template) * template.width) / column
            : 0;
          return (
            <Frame key={template.id} width={template.width} height={template.height + extra}>
              <TemplateCard template={template} showDetails={showDetails} />
            </Frame>
          );
        })}
      </RegularMasonryGrid>
    </div>
  );
}
