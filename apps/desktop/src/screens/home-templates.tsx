import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { motion } from "motion/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Spinner, cx } from "@/components/ui";
import type { TemplateCatalog, TemplateSummary, TemplateTag } from "@genmotion/templates/types";
import { usePendingTemplateStore } from "./pending-template-store";

// Multi-column, not `grid`: a real grid lays items into rows, so a 9:16
// card and a 16:9 card in the same row both take the taller one's height and
// letterbox to fill it. Columns instead let each card stand at its own
// designed aspect ratio and pack the gaps a uniform grid would leave.
const GRID = "columns-2 gap-4 lg:columns-3";
const enterEase = [0.25, 1, 0.5, 1] as const;
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: enterEase } },
};

/**
 * Absolute URL for a path the API handed back.
 *
 * Every path in a template payload is relative on purpose, so it can be joined
 * onto whichever base the client reached the API on. Here that is the loopback
 * server, which makes posters and video same-origin — the only source the
 * renderer's CSP allows for `media-src`.
 */
export function templateAssetUrl(path: string, revision?: string | null): string {
  return `${window.__GM_API_URL__}${path}${revision ? `?v=${revision}` : ""}`;
}

/**
 * The glyph each filter wears.
 *
 * Drawn rather than typed: an emoji is a different typeface on every machine,
 * carries its own colour into a monochrome row, and sits on its own baseline.
 * These are the same weight as every other icon in the app.
 *
 * A `Record` over the tag union rather than a lookup with a fallback: adding a
 * tag to `TEMPLATE_TAGS` upstream should fail this file's typecheck and make
 * somebody draw one, not quietly ship a pill with a gap where the others have
 * a picture.
 */
type TagIcon = (props: { className?: string }) => ReactElement;

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const TAG_ICON: Record<TemplateTag, TagIcon> = {
  Announcement: ({ className }) => (
    <svg {...stroke} className={className}>
      <path d="M3.5 9.6v4.1a1 1 0 0 0 1 1h2.2l7.3 4.3V4.3L6.7 8.6H4.5a1 1 0 0 0-1 1Z" />
      <path d="M17.8 8.9a4.4 4.4 0 0 1 0 6.3" />
    </svg>
  ),
  Promotional: ({ className }) => (
    <svg {...stroke} className={className}>
      <path d="M11.6 3H5.5A2.5 2.5 0 0 0 3 5.5v6.1a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8L13 3.6A2 2 0 0 0 11.6 3Z" />
      <path d="M7.5 7.5h.01" />
    </svg>
  ),
  "Social Media": ({ className }) => (
    <svg {...stroke} className={className}>
      {/* A like, not a share graph: it is the one gesture every one of these
          platforms has, and it reads at 14px where three nodes and two edges
          turned into a smudge. */}
      <path d="M6.6 10.9h2.1L11.5 4.6a2 2 0 0 1 3.8 1.1l-.5 2.8h3.4a2 2 0 0 1 2 2.4l-1 5a2 2 0 0 1-2 1.6H6.6" />
      <rect x="3" y="10.9" width="3.6" height="8.6" rx="1" />
    </svg>
  ),
  "Launch Video": ({ className }) => (
    <svg {...stroke} className={className}>
      <path d="M12 2.5c2.9 2.3 4.4 5.5 4.4 9.1v2.6H7.6v-2.6c0-3.6 1.5-6.8 4.4-9.1Z" />
      <path d="M7.6 11.1 4.8 13.6v3.7l2.8-2.1m8.8-3.1 2.8 2.5v3.7l-2.8-2.1" />
      <circle cx="12" cy="9" r="1.4" />
    </svg>
  ),
  Educational: ({ className }) => (
    <svg {...stroke} className={className}>
      <path d="m3 9 9-4 9 4-9 4Z" />
      <path d="M7 11.4V16c0 1.1 2.2 2 5 2s5-.9 5-2v-4.6" />
    </svg>
  ),
  Tutorial: ({ className }) => (
    <svg {...stroke} className={className}>
      <path d="M12 7c-1.5-1.3-3.6-2-6-2H3v12h3c2.4 0 4.5.7 6 2m0-12c1.5-1.3 3.6-2 6-2h3v12h-3c-2.4 0-4.5.7-6 2m0-12v12" />
    </svg>
  ),
};

/**
 * The section's mark: a clapperboard with a spark where the play triangle goes.
 *
 * Bold duotone, the same family as the nav rail's icons, so the heading reads
 * as part of the app rather than a decoration dropped on top of it. Based on
 * Solar "Clapperboard Play" (https://creativecommons.org/licenses/by/4.0/),
 * with the triangle swapped for a spark: this gallery is for taking a finished
 * video apart, not for playing one.
 *
 * Filled with the logo's own gradient — the same two stops running the same
 * top-left to bottom-right — rather than a flat token, so the one mark on this
 * screen that is purely decorative is the brand's green instead of the blue
 * that means "interactive" everywhere else in the app.
 */
function RemixMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="url(#gm-remix-mark)" aria-hidden>
      <defs>
        <linearGradient id="gm-remix-mark" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16F5BD" />
          <stop offset="1" stopColor="#C6F91E" />
        </linearGradient>
      </defs>
      <path
        fillRule="evenodd"
        d="M2 12c0-1.237 0-2.311.026-3.25h19.948C22 9.689 22 10.763 22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12"
        clipRule="evenodd"
        opacity=".5"
      />
      <path d="M12 2c1.845 0 3.33 0 4.54.088L13.098 7.25H8.401l3.5-5.25zM3.464 3.464c1.253-1.252 3.158-1.433 6.631-1.46L6.599 7.25H2.104c.147-1.764.503-2.928 1.36-3.786M21.896 7.25c-.148-1.764-.503-2.928-1.36-3.786c-.598-.597-1.344-.95-2.338-1.16L14.901 7.25z" />
      {/* Large enough to carry: a small spark on a half-opacity body is two
          shades of the same colour and disappears at 22px. */}
      <path d="M12 10.6c.42 2.96 1.42 3.96 4.38 4.38c-2.96.42-3.96 1.42-4.38 4.38c-.42-2.96-1.42-3.96-4.38-4.38c2.96-.42 3.96-1.42 4.38-4.38" />
    </svg>
  );
}

/** The unfiltered gallery — the chip that leads the row. */
const AllIcon: TagIcon = ({ className }) => (
  <svg {...stroke} className={className}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </svg>
);

/** One filter, in the row above the gallery. */
function FilterPill({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon: TagIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.786rem]",
        "transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        active
          ? "border-accent/40 bg-accent-muted text-accent"
          : "border-border bg-surface-raised text-text-tertiary hover:border-border-strong hover:text-text-primary",
      )}
    >
      {/* Decorative: the word beside it already names the filter. */}
      <Icon className="size-3.5 shrink-0" />
      {label}
    </button>
  );
}

// Solar "Clapperboard Edit" (line duotone) — https://creativecommons.org/licenses/by/4.0/
function ClapperboardEditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        d="M21.998 10.5c-.016-3.732-.162-5.735-1.463-7.036C19.072 2 16.714 2 12 2S4.929 2 3.464 3.464C2 4.93 2 7.286 2 12s0 7.071 1.464 8.535c1.241 1.241 3.123 1.43 6.536 1.46"
      />
      <path strokeLinecap="round" d="M21.5 8h-19M7 8l3.5-5.5m3 5.5L17 2.5" opacity=".5" />
      <path d="m18.562 13.935l.417-.417a1.77 1.77 0 1 1 2.503 2.503l-.417.417m-2.503-2.503s.052.887.834 1.669s1.669.834 1.669.834m-2.503-2.503l-3.835 3.835c-.26.26-.39.39-.5.533a3 3 0 0 0-.338.545c-.078.164-.136.338-.252.686l-.372 1.116l-.12.36m7.92-4.572l-3.835 3.835c-.26.26-.39.39-.533.5a3 3 0 0 1-.545.338c-.164.078-.338.136-.686.252l-1.116.372l-.36.12m0 0l-.362.12a.477.477 0 0 1-.604-.603l.12-.361m.845.844l-.844-.844" />
    </svg>
  );
}

/**
 * One template: its poster, and its own pre-rendered video on hover.
 *
 * No title, no description, no metadata row. A gallery of finished videos is
 * read by looking at it, and the words were competing with the thing they
 * described — the title is in the chip once it is picked, which is the only
 * place it is actually needed.
 *
 * The whole card picks the template; the icon in the corner is the affordance
 * saying so. Neither downloads anything — see `pending-template-store`.
 */
function TemplateCard({ template, onPick }: { template: TemplateSummary; onPick: () => void }) {
  // Debounced: a mouse crossing the gallery on its way somewhere else
  // shouldn't start a video fetch for every card it passes over.
  const [hovered, setHovered] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    if (!hovered) return;
    const timer = setTimeout(() => setPreviewing(true), 150);
    return () => clearTimeout(timer);
  }, [hovered]);

  return (
    <motion.div
      variants={cardVariants}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPreviewing(false);
      }}
      className={cx(
        // `break-inside-avoid` is load-bearing in a column layout — without
        // it a card can be sliced across the column boundary. `mb-4` rather
        // than the grid's `gap-4`: columns only have a `column-gap` between
        // columns, nothing for the vertical space between stacked items.
        "group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg border border-border bg-background",
        "transition-colors duration-150 hover:border-border-strong",
      )}
      // The card's actual height: reserved up front from the template's real
      // ratio so the column doesn't jump once the poster decodes.
      style={{ aspectRatio: `${template.width} / ${template.height}` }}
    >
      <button
        type="button"
        onClick={onPick}
        aria-label={`Remix ${template.title}`}
        className="absolute inset-0 block size-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
      >
        <img
          src={templateAssetUrl(template.posterPath, template.revision)}
          alt=""
          draggable={false}
          className="block size-full object-cover"
        />
        {previewing && (
          <video
            src={templateAssetUrl(template.videoPath, template.revision)}
            className="absolute inset-0 size-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        )}
      </button>

      {/* On top of the button rather than inside it: nesting a button in a
          button is invalid, and this one has its own label anyway. Both do
          the same thing, so a click that lands on either is the same pick. */}
      <button
        type="button"
        onClick={onPick}
        aria-label={`Remix ${template.title}`}
        title={`Remix ${template.title}`}
        className={cx(
          "absolute right-2 top-2 flex h-8 items-center gap-1.5 rounded-full pl-2 pr-3",
          // Dark rather than a light frost: a poster can be any colour, and a
          // white pill vanished on every pale one.
          "border border-white/15 bg-black/65 text-[0.857rem] font-medium text-white backdrop-blur-xl",
          "opacity-0 transition-all duration-150 group-hover:opacity-100 focus-visible:opacity-100",
          "hover:bg-black/85 outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        )}
      >
        <ClapperboardEditIcon className="size-[1.05rem]" />
        Remix
      </button>
    </motion.div>
  );
}

/**
 * The template gallery, under the start screen's composer.
 *
 * Pressing Remix on a card does not make a project: it loads the template into
 * the composer above as a chip, and the copy happens when that message is
 * sent. So the gallery can be browsed freely, and the prompt you arrive with
 * is the first thing the agent is told about the video you took apart.
 *
 * `scrollRoot` is the start screen's own scroll container — the sentinel at the
 * foot of the gallery is clipped by it, not by the window, so that is what the
 * observer has to watch against.
 */
export function HomeTemplates({
  scrollRoot,
  action,
}: {
  scrollRoot: React.RefObject<HTMLElement | null>;
  /**
   * The corner of the gallery's header — "Open from GitHub" lives here.
   *
   * It is the other way to arrive at a project you did not write from scratch,
   * so it belongs beside the templates rather than only on the Projects screen:
   * this is the screen you start on.
   */
  action?: ReactNode;
}) {
  const [activeTag, setActiveTag] = useState<TemplateTag | null>(null);
  const pick = usePendingTemplateStore((s) => s.pick);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["templates"],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) =>
        api<TemplateCatalog>(
          `/api/templates${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        ),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  // Every page fetched so far, flattened in load order — which is also
  // catalog order, since the cursor walks the same sort the API sorts by.
  const loaded = useMemo(() => data?.pages.flatMap((page) => page.templates) ?? [], [data]);

  // The row only offers tags a template actually carries — an always-empty
  // filter (say, a category with no template yet) would be a dead end to
  // click. This can grow as more pages load, same as the gallery it filters.
  const availableTags = useMemo(() => {
    const seen = new Set<TemplateTag>();
    const tags: TemplateTag[] = [];
    for (const template of loaded) {
      for (const tag of template.tags) {
        if (!seen.has(tag)) {
          seen.add(tag);
          tags.push(tag);
        }
      }
    }
    return tags;
  }, [loaded]);

  const templates = useMemo(
    () => (activeTag ? loaded.filter((t) => t.tags.includes(activeTag)) : loaded),
    [loaded, activeTag],
  );

  // Fetches the next page itself once the sentinel at the foot of the gallery
  // scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = scrollRoot.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) fetchNextPage();
      },
      { root, rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, templates.length, scrollRoot]);

  return (
    <div>
      {/* Title and action on one line, filters on their own below: the tags
          grow with the catalog, and sharing a line with the heading left them
          reflowing around it at every window width. */}
      <div className="flex items-center gap-3">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-xl font-medium">
          <RemixMarkIcon className="size-[1.4rem] shrink-0" />
          Remix a video
        </h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {availableTags.length > 0 && (
        // Room above so the row reads as its own band rather than a second
        // line of the title.
        <div className="mb-5 mt-6 flex flex-wrap gap-1.5">
          {/* Clearing the filter is a chip of its own rather than a second
              press on the active one: with six tags the way back to everything
              should be somewhere you can see, not something you remember. */}
          <FilterPill
            label="All"
            Icon={AllIcon}
            active={activeTag === null}
            onClick={() => setActiveTag(null)}
          />
          {availableTags.map((tag) => (
            <FilterPill
              key={tag}
              label={tag}
              Icon={TAG_ICON[tag]}
              active={activeTag === tag}
              onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
            />
          ))}
        </div>
      )}

      {error ? (
        <p className="py-8 text-center text-text-tertiary">
          Couldn’t load these. Check your connection and try again.
        </p>
      ) : isLoading || !data ? (
        <div className={GRID}>
          {/* Real cards land at their own aspect ratio; the skeleton can't
              know that yet, so it varies its own height per placeholder
              instead of drawing identical boxes down one column. */}
          {[9 / 16, 16 / 9, 1, 16 / 9, 9 / 16, 4 / 5].map((ratio, i) => (
            <div
              key={i}
              className="mb-4 block w-full break-inside-avoid animate-pulse rounded-lg border border-border bg-surface-hover"
              style={{ aspectRatio: ratio }}
            />
          ))}
        </div>
      ) : loaded.length === 0 ? (
        <p className="py-8 text-center text-text-tertiary">Nothing here yet.</p>
      ) : templates.length === 0 ? (
        <p className="py-8 text-center text-text-tertiary">Nothing tagged “{activeTag}”.</p>
      ) : (
        <>
          <motion.div className={GRID} variants={listVariants} initial="hidden" animate="show">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPick={() => pick(template)}
              />
            ))}
          </motion.div>
          {/* Invisible; the IntersectionObserver above fires fetchNextPage
              when this scrolls into view. A visible spinner only shows up
              while that fetch is actually in flight. */}
          {hasNextPage && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              {isFetchingNextPage && <Spinner className="size-5 text-text-tertiary" />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
