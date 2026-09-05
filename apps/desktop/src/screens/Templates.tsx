import { useEffect, useRef, useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button, Spinner, cx } from "@/components/ui";
import type { TemplateCatalog, TemplateSummary, TemplateTag } from "@genmotion/templates/types";
import { api as desktop } from "../api";
import type { DesktopProject } from "../../electron/shared";

// Multi-column, not `grid`: a real grid lays items into rows, so a 9:16
// card and a 16:9 card in the same row both take the taller one's height and
// letterbox to fill it. Columns instead let each card stand at its own
// designed aspect ratio and pack the gaps a uniform grid would leave.
const GRID = "columns-1 gap-4 sm:columns-2 xl:columns-3";
const enterEase = [0.25, 1, 0.5, 1] as const;
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: enterEase } },
};

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** A tag, wherever it's shown — card, filter row, or detail page. */
function TagPill({
  children,
  active,
  onClick,
  size = "sm",
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(
        "inline-flex items-center rounded-full border text-text-tertiary",
        size === "sm" ? "px-2 py-0.5 text-[0.714rem]" : "px-2.5 py-1 text-[0.786rem]",
        active
          ? "border-accent/40 bg-accent-muted text-accent"
          : "border-border bg-surface-raised",
        onClick &&
          "transition-colors duration-150 hover:border-border-strong hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
      )}
    >
      {children}
    </Tag>
  );
}

function PlayGlyph({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <rect x="3" y="2" width="4" height="12" rx="1" />
      <rect x="9" y="2" width="4" height="12" rx="1" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <path d="M4.5 2.7a1 1 0 0 1 1.53-.85l8 5.3a1 1 0 0 1 0 1.7l-8 5.3a1 1 0 0 1-1.53-.85V2.7Z" />
    </svg>
  );
}

/**
 * Play/pause and a scrubber for a plain `<video>` element.
 *
 * Reads and drives it entirely through the ref — no store, no props beyond
 * that: a native `<video>` already owns its own clock, so this is just a
 * prettier face on `HTMLMediaElement`'s own API.
 */
function Transport({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    // A video already mid-load by the time this effect attaches (the ref was
    // there first) would otherwise sit at duration 0 until the next event.
    onMeta();
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
    };
  }, [videoRef]);

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <button
        type="button"
        onClick={() => {
          const el = videoRef.current;
          if (!el) return;
          if (el.paused) void el.play().catch(() => {});
          else el.pause();
        }}
        aria-label={isPlaying ? "Pause" : "Play"}
        className={cx(
          "flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary",
          "transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        )}
      >
        <PlayGlyph playing={isPlaying} />
      </button>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.01}
        value={Math.min(currentTime, duration)}
        onChange={(e) => {
          const el = videoRef.current;
          if (el) el.currentTime = Number(e.target.value);
        }}
        aria-label="Seek"
        className="h-1 flex-1 cursor-pointer accent-accent"
      />
      <span className="shrink-0 font-mono text-[0.786rem] tabular-nums text-text-tertiary">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </span>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

// Solar "Clapperboard Edit" (line duotone) — https://creativecommons.org/licenses/by/4.0/
function ClapperboardEditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
 * Absolute URL for a path the API handed back.
 *
 * Every path in a template payload is relative on purpose, so it can be joined
 * onto whichever base the client reached the API on. Here that is the loopback
 * server, which makes posters and audio same-origin — the only source the
 * renderer's CSP allows for `media-src`.
 */
function apiUrl(path: string): string {
  return `${window.__GM_API_URL__}${path}`;
}

/**
 * A silently looping preview of the template's own pre-rendered video —
 * `object-cover` does the scale-to-fill a card needs on its own, so this
 * carries none of the manual measuring a live composition used to need.
 */
function CardPreview({ src }: { src: string }) {
  return (
    <video
      src={src}
      className="absolute inset-0 size-full object-cover"
      autoPlay
      loop
      muted
      playsInline
    />
  );
}

function TemplateCard({
  template,
  onOpen,
}: {
  template: TemplateSummary;
  onOpen: () => void;
}) {
  // Debounced: a mouse passing over the gallery on its way somewhere else
  // shouldn't fire a fetch for every card it crosses.
  const [hovered, setHovered] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    if (!hovered) return;
    const timer = setTimeout(() => setPreviewing(true), 150);
    return () => clearTimeout(timer);
  }, [hovered]);

  return (
    <motion.button
      type="button"
      variants={cardVariants}
      onClick={onOpen}
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
        "mb-4 block w-full break-inside-avoid overflow-hidden rounded-md border border-border bg-surface-raised text-left",
        "transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
      )}
    >
      <div
        className="relative bg-background"
        // The card's actual height: reserved up front from the template's
        // real ratio so the column doesn't jump once the image decodes.
        style={{ aspectRatio: `${template.width} / ${template.height}` }}
      >
        <img
          src={apiUrl(`${template.posterPath}?v=${template.revision}`)}
          alt=""
          draggable={false}
          className="block size-full object-cover"
        />
        {previewing && (
          <CardPreview src={apiUrl(`${template.videoPath}?v=${template.revision}`)} />
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-[0.929rem] text-text-primary">{template.title}</div>
        <div className="mt-0.5 line-clamp-2 text-[0.786rem] leading-snug text-text-tertiary">
          {template.description}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[0.786rem] text-text-tertiary">
          <span>
            {template.width}×{template.height}
          </span>
          <span aria-hidden>·</span>
          <span>{formatDuration(template.durationInFrames / template.fps)}</span>
          <span aria-hidden>·</span>
          <span>
            {template.sceneCount} {template.sceneCount === 1 ? "scene" : "scenes"}
          </span>
        </div>
        {template.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {template.tags.map((tag) => (
              <TagPill key={tag}>{tag}</TagPill>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}

/**
 * The template, playing.
 *
 * Its own pre-rendered MP4 — `render-video.mjs` produced it once, offline,
 * from these exact same scenes, and every public surface plays that instead
 * of live-compiling and evaluating them the way the editor does. `summary`
 * alone is enough for this: nothing here needs a project's scenes or assets.
 */
function TemplatePlayer({ summary }: { summary: TemplateSummary }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  // Autoplay from the top the moment a template is opened — the whole point
  // of the detail page is watching it, not pressing play to find out what it
  // is. Own element, own clock: unlike the old shared playback store, there's
  // no stale state from a previous template to reset first.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }, [summary.id]);

  if (failed) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md border border-border bg-background text-[0.857rem] text-text-tertiary">
        This template hasn’t been rendered yet. It should still remix — the scenes are there.
      </div>
    );
  }

  return (
    <div>
      {/* The video scales to fit its container, so the container is what
          decides the size: the template's own aspect, capped by height so a
          9:16 does not run off the page. */}
      <div
        className="mx-auto w-full overflow-hidden rounded-md border border-border bg-background"
        style={{ maxWidth: `calc(56vh * ${summary.width} / ${summary.height})` }}
      >
        <div style={{ aspectRatio: `${summary.width} / ${summary.height}` }}>
          <video
            ref={videoRef}
            src={apiUrl(`${summary.videoPath}?v=${summary.revision}`)}
            poster={apiUrl(`${summary.posterPath}?v=${summary.revision}`)}
            className="size-full object-cover"
            loop
            playsInline
            onError={() => setFailed(true)}
          />
        </div>
      </div>

      {/* Its own width rather than the video's: at 9:16 the video box leaves
          the timecode no room. */}
      <div className="mx-auto mt-2 max-w-xl rounded-md border border-border bg-surface-raised">
        <Transport videoRef={videoRef} />
      </div>
    </div>
  );
}

function TemplateDetailView({
  summary,
  onBack,
  onRemixed,
}: {
  summary: TemplateSummary;
  onBack: () => void;
  onRemixed: (project: DesktopProject) => void;
}) {
  const [remixing, setRemixing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remix() {
    setRemixing(true);
    setError(null);
    desktop
      .remixTemplate({ templateId: summary.id })
      .then(onRemixed)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "That didn’t work.");
        setRemixing(false);
      });
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-[0.857rem] text-text-tertiary transition-colors duration-150 hover:text-text-primary"
      >
        <ArrowLeftIcon className="size-4" />
        All templates
      </button>

      <div className="mb-5 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl tracking-tight">{summary.title}</h1>
          <p className="mt-1.5 text-text-secondary">{summary.description}</p>
          <p className="mt-2 text-[0.786rem] text-text-tertiary">
            {summary.width}×{summary.height} · {summary.fps}fps ·{" "}
            {formatDuration(summary.durationInFrames / summary.fps)} · {summary.sceneCount}{" "}
            {summary.sceneCount === 1 ? "scene" : "scenes"}
          </p>
          {summary.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {summary.tags.map((tag) => (
                <TagPill key={tag} size="md">
                  {tag}
                </TagPill>
              ))}
            </div>
          )}
        </div>
        <Button variant="primary" onClick={remix} disabled={remixing} className="shrink-0">
          {remixing ? <Spinner className="size-4" /> : <ClapperboardEditIcon className="size-4" />}
          {remixing ? "Making a copy…" : "Remix"}
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[0.857rem] text-danger">
          {error}
        </p>
      )}

      <TemplatePlayer summary={summary} />
    </div>
  );
}

/**
 * The template gallery.
 *
 * A card is a poster, because a grid that compiled everything it showed would
 * get slower with every template added. Opening one compiles it and plays the
 * real thing, so what you press Remix on is what you watched.
 */
export function Templates({ onRemixed }: { onRemixed: (project: DesktopProject) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<TemplateTag | null>(null);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
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
  // click. This can grow as more pages load, same as the grid it filters.
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

  // Fetches the next page itself once the sentinel at the bottom of the grid
  // scrolls into view — the scroll container is the root, not the viewport,
  // since this list is the one thing on the screen that scrolls.
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = scrollRef.current;
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
    // `openId` is read only to force this to re-run when the gallery remounts
    // after a detail view closes — `scrollRef`/`sentinelRef` point at fresh
    // nodes then, and the observer watching the old ones is long gone.
  }, [hasNextPage, fetchNextPage, templates.length, openId]);

  const open = loaded.find((t) => t.id === openId) ?? null;
  if (open) {
    return (
      <div className="h-full overflow-y-auto">
        <TemplateDetailView
          summary={open}
          onBack={() => setOpenId(null)}
          onRemixed={onRemixed}
        />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-1 flex items-baseline gap-2">
          <h1 className="font-display text-2xl tracking-tight">Templates</h1>
          {data && (
            <span className="text-[0.857rem] text-text-tertiary">
              {loaded.length}
              {hasNextPage ? "+" : ""}
            </span>
          )}
        </div>
        <p className="mb-6 text-text-secondary">
          Finished videos you can take apart. Remix one and it becomes a project of your own —
          edit it by chat like any other.
        </p>

        {availableTags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <TagPill
                key={tag}
                size="md"
                active={activeTag === tag}
                onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
              >
                {tag}
              </TagPill>
            ))}
          </div>
        )}

        {error ? (
          <p className="py-8 text-center text-text-tertiary">
            Couldn’t load the templates. Check your connection and try again.
          </p>
        ) : isLoading || !data ? (
          <div className={GRID}>
            {/* Real cards land at their own aspect ratio; the skeleton can't
                know that yet, so it varies its own height per placeholder
                instead of drawing three identical boxes in one column. */}
            {[9 / 16, 16 / 9, 1].map((ratio, i) => (
              <div
                key={i}
                className="mb-4 block w-full break-inside-avoid overflow-hidden rounded-md border border-border bg-surface-raised"
              >
                <div className="animate-pulse bg-surface-hover" style={{ aspectRatio: ratio }} />
                <div className="p-3">
                  <div className="h-3.5 w-2/5 animate-pulse rounded bg-surface-hover" />
                </div>
              </div>
            ))}
          </div>
        ) : loaded.length === 0 ? (
          <p className="py-8 text-center text-text-tertiary">No templates yet.</p>
        ) : templates.length === 0 ? (
          <p className="py-8 text-center text-text-tertiary">
            No templates tagged “{activeTag}”.
          </p>
        ) : (
          <>
            <motion.div className={GRID} variants={listVariants} initial="hidden" animate="show">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onOpen={() => setOpenId(template.id)}
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
    </div>
  );
}
