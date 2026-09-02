import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { HeroComposer } from "@/components/composer";
import { cx } from "@/components/ui";
import { HarnessPicker } from "../harness-picker";
import { FolderAccess } from "../folder-access";
import { api, type RecentProject } from "../api";
import { AccountMenu } from "../components/account-menu";
import { UpdateModal } from "../components/update-modal";
import { hasUpdate, useUpdate } from "../lib/use-update";
import type { AuthOrganization, AuthUser, UpdateState } from "../../electron/shared";

// Gentle on-load entrance: fade + a small slide up, composer trailing the heading.
const enter = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};
const enterEase = [0.25, 1, 0.5, 1] as const;

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

/**
 * The update, said again under the composer.
 *
 * There is already a pill for this in the top-right corner, and on a screen
 * whose entire point is the box in the middle it goes unread — the corner is
 * where the window controls and the avatar live, which is exactly the region
 * people have learned to skip. This puts the same sentence where they are
 * already looking, in the quietest form that still reads as a thing you can
 * press.
 *
 * It opens the same dialog and does nothing else. Downloading is ~140MB and
 * installing quits the app; neither belongs behind a hint someone glanced at
 * on their way to typing a prompt.
 */
function UpdateHint({ state, onOpen }: { state: UpdateState; onOpen: () => void }) {
  if (!hasUpdate(state)) return null;
  const version = "version" in state ? state.version : "";
  const ready = state.status === "ready";

  return (
    <motion.div
      className="mt-3 flex justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Trailing the composer, which is itself trailing the heading: an update
      // is the least urgent thing on this screen and should arrive last.
      transition={{ duration: 0.4, ease: enterEase, delay: 0.35 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cx(
          "group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
          "text-[0.786rem] text-text-tertiary transition-colors duration-150",
          "hover:text-text-secondary",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        )}
      >
        <span
          className={cx("size-1.5 rounded-full", ready ? "bg-green" : "bg-accent")}
          aria-hidden
        />
        {state.status === "downloading" ? (
          <>
            Downloading GenMotion {version} · {state.percent}%
          </>
        ) : (
          <>
            GenMotion {version} {ready ? "is ready to install" : "is available"} ·{" "}
            <span className={cx("group-hover:underline", ready ? "text-green" : "text-accent")}>
              {ready ? "Restart" : "Update"}
            </span>
          </>
        )}
      </button>
    </motion.div>
  );
}

/**
 * How the list is paged.
 *
 * The first six get the full treatment — a big card with the rendered frame —
 * and everything older falls back to a compact row with a small one. Fetching a
 * page means opening that many manifests and inlining that many images, so the
 * page size is what the start screen's speed actually depends on.
 */
const GRID_COUNT = 6;
const LIST_PAGE = 12;

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
 * The start screen, mirroring the web app's dashboard: the same drifting hue
 * blobs, the same composer, the same project cards.
 *
 * Creating a project never asks where to put it — a prompt is enough. The app
 * allocates a folder, opens the editor, and the chat panel sends that first
 * message itself (it already looks for `gm-initial-prompt-<id>`).
 */
export function Home({
  busy,
  onOpen,
  onCreate,
  user,
  organization,
}: {
  busy: boolean;
  onOpen: (dir: string) => void;
  onCreate: (input: { prompt: string; width: number; height: number }) => void;
  user: AuthUser;
  organization: AuthOrganization | null;
}) {
  const [projects, setProjects] = useState<RecentProject[] | null>(null);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  // How many have been *asked* for, which is what the next offset follows from.
  // Counting what came back instead would stall the moment a project's manifest
  // failed to parse and it dropped out of its page.
  const cursorRef = useRef(0);
  const busyRef = useRef(false);
  const update = useUpdate();
  const [updateOpen, setUpdateOpen] = useState(false);

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
  }, []);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  const hasMore = projects !== null && cursor < total;

  // Pull the next page in as the trigger comes into view. It is a real button
  // too, so this stays usable by keyboard and if the observer never fires.
  const moreRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = moreRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const cards = projects?.slice(0, GRID_COUNT) ?? [];
  const rows = projects?.slice(GRID_COUNT) ?? [];

  return (
    <div className="h-screen overflow-y-auto bg-background">
      {updateOpen && <UpdateModal state={update} onClose={() => setUpdateOpen(false)} />}
      <div className="titlebar-drag fixed inset-x-0 top-0 z-50 h-9" />
      {/* Above the drag strip, and outside it — a draggable region swallows
          clicks, so the button has to sit on top rather than inside. */}
      <div className="no-drag fixed right-4 top-4 z-[60] flex items-center gap-2">
        {hasUpdate(update) && (
          <button
            type="button"
            onClick={() => setUpdateOpen(true)}
            title={
              update.status === "ready"
                ? "Update downloaded — restart to install"
                : `GenMotion ${"version" in update ? update.version : ""} is available`
            }
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.786rem] font-medium",
              "transition-colors duration-150",
              update.status === "ready"
                ? "border-green/40 bg-green-muted text-green hover:border-green"
                : "border-accent/40 bg-accent-muted text-accent hover:border-accent",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {update.status === "downloading" ? `${update.percent}%` : "Update"}
          </button>
        )}
        <AccountMenu user={user} organization={organization} />
      </div>

      {/* The section deliberately does NOT clip: the composer's menus open
          downward from here, and an `overflow-hidden` on the section cut them
          off with no way to scroll. Only the blob layer needs clipping, so
          that is where it lives now. */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 pt-9">
        {/* Lightweight animated hue blobs — large circles half-hidden below the
            section, heavily blurred, drifting slowly. */}
        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ transformOrigin: "bottom" }}
          initial={{ opacity: 0, scaleY: 0.6 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        >
          <div
            className="absolute bottom-0 left-[6%] size-[44vw] max-w-[640px] rounded-full blur-[120px] animate-[blob-a_16s_ease-in-out_infinite]"
            style={{ background: "#C6F91E", opacity: 0.4 }}
          />
          <div
            className="absolute bottom-0 right-[6%] size-[46vw] max-w-[680px] rounded-full blur-[130px] animate-[blob-b_20s_ease-in-out_infinite]"
            style={{ background: "#16F5BD", opacity: 0.38 }}
          />
          <div
            className="absolute bottom-0 left-[40%] size-[30vw] max-w-[440px] rounded-full blur-[120px] animate-[blob-c_18s_ease-in-out_infinite]"
            style={{ background: "#FFD60A", opacity: 0.28 }}
          />
        </motion.div>
        {/* Fades the hue down into the background toward the projects card. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <motion.div
          className="relative mb-8 text-center"
          initial={enter.initial}
          animate={enter.animate}
          transition={{ duration: 0.45, ease: enterEase }}
        >
          <h1 className="font-display text-3xl tracking-tight">
            What do you want to animate?
          </h1>
        </motion.div>

        <motion.div
          className="relative w-full max-w-2xl"
          initial={enter.initial}
          animate={enter.animate}
          transition={{ duration: 0.45, ease: enterEase, delay: 0.1 }}
        >
          <HeroComposer
            onSubmit={(prompt, dims) => onCreate({ prompt, ...dims })}
            pending={busy}
            // The first prompt goes straight to the agent, so which agent that
            // is belongs here rather than only inside the editor — and so does
            // what it can see, which is where a `genmotion .` launch shows up.
            accessory={
              <>
                <HarnessPicker placement="down" />
                <FolderAccess placement="down" />
              </>
            }
          />
          <UpdateHint state={update} onOpen={() => setUpdateOpen(true)} />
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto -mt-24 w-full max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-border bg-background p-5 shadow-[0_-8px_40px_rgba(10,10,20,0.35)] sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-xl font-medium">Projects</h2>
            {total > 0 && (
              <span className="text-[0.857rem] text-text-tertiary">{total}</span>
            )}
          </div>

          {projects === null ? (
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
          ) : projects.length > 0 ? (
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
                      <DeleteButton
                        name={project.name}
                        onDelete={() => void remove(project.dir)}
                      />
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
              No projects yet. Describe a video above to make your first one.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
