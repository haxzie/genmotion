import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { cx } from "@/components/ui";
import { api, type RecentProject } from "../api";
import { useTabActive } from "../tabs/active-tab";
import { useRecentProjectsStore } from "./recent-projects-store";
import { CloneFromGitHub } from "./clone-from-github";
import type { DesktopProject } from "../../electron/shared";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
const enterEase = [0.25, 1, 0.5, 1] as const;

/**
 * How the list is paged.
 *
 * The first six get the full treatment — a big card with the rendered frame —
 * and everything older falls back to a compact row with a small one. Fetching a
 * page means opening that many manifests and inlining that many images, so the
 * page size is what this screen's speed actually depends on.
 */
const GRID_COUNT = 6;
const LIST_PAGE = 12;

/**
 * How long after returning to this screen the list is asked once more.
 *
 * Only when a card came back without a picture. Comfortably past the main
 * process's own settle before it photographs a project (4s), plus the capture.
 */
const THUMBNAIL_RETRY_MS = 6000;

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: enterEase } },
};

/** "12 Mar 2026" — short, unambiguous, and the same width all year. */
function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 12h18M3 8h4M3 16h4M17 8h4M17 16h4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 7h16M10 4h4M9.5 7l.6 12M14.5 7l-.6 12M6.5 7l.8 13.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7" />
    </svg>
  );
}

/**
 * Delete, revealed on hover.
 *
 * Kept visible on keyboard focus as well: a control that only exists under a
 * pointer is a control a keyboard cannot reach.
 */
function DeleteButton({
  name,
  onDelete,
  className,
}: {
  name: string;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Delete ${name}`}
      title={`Delete ${name}`}
      onClick={(event) => {
        // The whole card and the whole row are click targets that open the
        // project. Without this, deleting would open it first.
        event.stopPropagation();
        onDelete();
      }}
      className={cx(
        "shrink-0 rounded p-1.5 text-text-tertiary opacity-0 transition-all duration-150",
        "hover:bg-danger/10 hover:text-danger focus-visible:opacity-100",
        "group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40",
        className,
      )}
    >
      <TrashIcon className="size-4" />
    </button>
  );
}

/**
 * Every project, newest first.
 *
 * This used to sit under the start screen's composer, where it was the only
 * thing below the fold and competed with the gallery for the same space. It is
 * its own destination now, and the start screen shows templates instead: one
 * screen for starting something, one for coming back to it.
 */
export function Projects({
  onOpen,
  onAdopt,
}: {
  onOpen: (dir: string) => void;
  /** A cloned repository arrives as a whole project, ready to open. */
  onAdopt: (project: DesktopProject) => void;
}) {
  const [projects, setProjects] = useState<RecentProject[] | null>(null);
  const [total, setTotal] = useState(0);
  // Projects adopted into a tab this session, ahead of the fetch below — see
  // `recent-projects-store.ts` for why the fetched list alone isn't enough.
  const pending = useRecentProjectsStore((s) => s.pending);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  // How many have been *asked* for, which is what the next offset follows from.
  // Counting what came back instead would stall the moment a project's manifest
  // failed to parse and it dropped out of its page.
  const cursorRef = useRef(0);
  const busyRef = useRef(false);
  // This screen is part of the Home tab; it stays mounted behind the project
  // tabs. See the refresh effect below for what that means for the grid.
  const tabActive = useTabActive();

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    const offset = cursorRef.current;
    const limit = offset === 0 ? GRID_COUNT : LIST_PAGE;
    try {
      const page = await api.recentProjects({ offset, limit });
      cursorRef.current = offset + limit;
      setCursor(cursorRef.current);
      setTotal(page.total);
      setProjects((prev) => [...(prev ?? []), ...page.items]);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, []);

  /**
   * Drop the project from the list rather than refetching.
   *
   * The list is paged, so a refetch would mean replaying every page. The
   * cursor steps back one because it counts what has been *asked* for: leave
   * it, and the next page starts one entry late and silently skips a project.
   */
  const remove = useCallback(async (dir: string) => {
    const { deleted } = await api.deleteProject(dir);
    if (!deleted) return;
    setProjects((prev) => prev?.filter((project) => project.dir !== dir) ?? prev);
    setTotal((count) => Math.max(0, count - 1));
    cursorRef.current = Math.max(0, cursorRef.current - 1);
    setCursor(cursorRef.current);
    useRecentProjectsStore.getState().clear(dir);
  }, []);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  /**
   * Coming back to this screen, re-ask for the pages already on it.
   *
   * The Home tab is never unmounted — it is a tab like any other — so without
   * this the grid is exactly as old as the last visit. A project made or opened
   * since then is standing in from `pending` with no card image, because the
   * picture is captured in the main process a moment after the folder settles,
   * long after the entry was put on the grid. One call for everything loaded
   * rather than replaying each page; the cursor counts what has been asked for,
   * so it is the limit.
   */
  useEffect(() => {
    if (!tabActive || cursorRef.current === 0 || busyRef.current) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = (retry: boolean) => {
      busyRef.current = true;
      void api
        .recentProjects({ offset: 0, limit: cursorRef.current })
        .then((page) => {
          if (!live) return;
          setProjects(page.items);
          setTotal(page.total);
          // Leaving a project seconds after making it can beat its own card
          // image: the capture runs once the folder stops changing. Ask once
          // more, late, rather than poll — and only when something on screen
          // is actually missing a picture.
          if (retry && page.items.some((project) => !project.thumbnail)) {
            timer = setTimeout(() => refresh(false), THUMBNAIL_RETRY_MS);
          }
        })
        .catch(() => {
          // A failed refresh leaves the list it already had, which is still
          // true enough to click on.
        })
        .finally(() => {
          busyRef.current = false;
        });
    };

    refresh(true);
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [tabActive]);

  // Once the fetched list itself carries a pending project — its real
  // thumbnail included — there is nothing left for the pending copy to add.
  useEffect(() => {
    if (!projects) return;
    for (const p of pending) {
      if (projects.some((q) => q.dir === p.dir)) useRecentProjectsStore.getState().clear(p.dir);
    }
  }, [projects, pending]);

  // Pending entries lead the grid; anything the fetch already has for the same
  // project is preferred (a real thumbnail beats none), just pulled forward to
  // sit with the rest of what's pending.
  const merged = useMemo(() => {
    if (projects === null) return null;
    if (pending.length === 0) return projects;
    const byDir = new Map(projects.map((p) => [p.dir, p]));
    const fronted = pending.map((p) => byDir.get(p.dir) ?? p);
    const frontedDirs = new Set(fronted.map((p) => p.dir));
    return [...fronted, ...projects.filter((p) => !frontedDirs.has(p.dir))];
  }, [projects, pending]);
  // Projects created this session but not yet folded into a fetched page —
  // the header count and "left" total need to include them too.
  const newCount = useMemo(
    () => pending.filter((p) => !projects?.some((q) => q.dir === p.dir)).length,
    [pending, projects],
  );

  /**
   * A new account's first visit fills the list with the sample projects.
   *
   * Asked alongside the first page rather than before it: for everyone but a
   * new user the answer is an immediate zero, and the list should not wait on
   * it. When something *was* written, the list starts over from the top —
   * which is safe to do here, because the seed only ever writes into a
   * workspace that was empty, so the page it replaces was empty too.
   */
  const [seeding, setSeeding] = useState(true);
  useEffect(() => {
    let live = true;
    void api
      .seedSampleProjects()
      .then(({ seeded }) => {
        if (!live || seeded === 0) return;
        cursorRef.current = 0;
        setCursor(0);
        setProjects(null);
        void loadMore();
      })
      .finally(() => {
        if (live) setSeeding(false);
      });
    return () => {
      live = false;
    };
  }, [loadMore]);

  // An empty list is not yet an empty workspace while the seed is still out:
  // for a new user it is about to hold three projects, and the skeleton is
  // the honest thing to show in the meantime. Anyone with projects never
  // sees this — their list is not empty.
  const settling = projects === null || (projects.length === 0 && seeding);

  const hasMore = projects !== null && cursor < total;

  // Pull the next page in as the trigger comes into view. It is a real button
  // too, so this stays usable by keyboard and if the observer never fires.
  const scrollRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = moreRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { root: scrollRef.current, rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const cards = merged?.slice(0, GRID_COUNT) ?? [];
  const rows = merged?.slice(GRID_COUNT) ?? [];

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-5 flex items-center gap-2">
          <h1 className="font-display text-2xl tracking-tight">Projects</h1>
          {total + newCount > 0 && (
            <span className="text-[0.857rem] text-text-tertiary">{total + newCount}</span>
          )}
          {/* Next to the list it joins, rather than up beside the composer:
              this opens something that already exists. */}
          <div className="ml-auto">
            <CloneFromGitHub onCloned={onAdopt} />
          </div>
        </div>

        {settling ? (
          <div className={GRID}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-md border border-border bg-surface-raised">
                <div className="aspect-video animate-pulse bg-surface-hover" />
                <div className="p-3">
                  <div className="h-3.5 w-2/5 animate-pulse rounded bg-surface-hover" />
                </div>
              </div>
            ))}
          </div>
        ) : merged && merged.length > 0 ? (
          <>
            <motion.div className={GRID} variants={listVariants} initial="hidden" animate="show">
              {cards.map((project) => (
                <motion.div
                  key={project.dir}
                  variants={cardVariants}
                  onClick={() => onOpen(project.dir)}
                  className={cx(
                    "group cursor-pointer overflow-hidden rounded-md border border-border bg-surface-raised",
                    "transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover",
                  )}
                >
                  <div className="flex aspect-video items-center justify-center overflow-hidden bg-background text-text-tertiary">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt=""
                        className="size-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <FilmIcon className="size-8 opacity-40" />
                    )}
                  </div>
                  <div className="flex items-start gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.929rem] text-text-primary">{project.name}</div>
                      <div className="mt-0.5 text-[0.786rem] text-text-tertiary">
                        {project.sceneCount} {project.sceneCount === 1 ? "scene" : "scenes"}
                        {project.totalFrames > 0 &&
                          ` · ${formatDuration(project.totalFrames / project.fps)}`}
                      </div>
                    </div>
                    <DeleteButton
                      name={project.name}
                      onDelete={() => void remove(project.dir)}
                      className="-mr-1 -mt-0.5"
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {rows.length > 0 && (
              <div className="mt-6 border-t border-border">
                {rows.map((project) => (
                  // A row, not a button: the delete control is a button of
                  // its own and nesting one inside another is invalid, so the
                  // open target is the button and the row is what holds them.
                  <div
                    key={project.dir}
                    className={cx(
                      "group flex items-center gap-3 border-b border-border px-1",
                      "transition-colors duration-150 hover:bg-surface-hover",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onOpen(project.dir)}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
                    >
                      <span className="flex aspect-video w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-background text-text-tertiary">
                        {project.thumbnail ? (
                          <img
                            src={project.thumbnail}
                            alt=""
                            className="size-full object-cover"
                            draggable={false}
                          />
                        ) : (
                          <FilmIcon className="size-4 opacity-40" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.929rem] text-text-primary">
                          {project.name}
                        </span>
                        <span className="mt-0.5 block text-[0.786rem] text-text-tertiary">
                          {formatDate(project.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.786rem] text-text-tertiary">
                        {project.sceneCount} {project.sceneCount === 1 ? "scene" : "scenes"}
                        {project.totalFrames > 0 &&
                          ` · ${formatDuration(project.totalFrames / project.fps)}`}
                      </span>
                    </button>
                    <DeleteButton name={project.name} onDelete={() => void remove(project.dir)} />
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  ref={moreRef}
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loading}
                  className={cx(
                    "rounded-full border border-border px-3.5 py-1.5 text-[0.857rem] text-text-secondary",
                    "transition-colors duration-150 hover:border-border-strong hover:text-text-primary",
                    "disabled:cursor-default disabled:opacity-60",
                  )}
                >
                  {loading ? "Loading…" : `Show more (${total - cursor} left)`}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="py-8 text-center text-text-tertiary">
            No projects yet. Describe a video on the Create screen to make your first one.
          </p>
        )}
      </div>
    </div>
  );
}
