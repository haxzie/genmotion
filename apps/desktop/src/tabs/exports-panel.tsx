import { useEffect, useRef, useState } from "react";
import { api as http } from "@/lib/api";
import { cx } from "@/components/ui";
import { api } from "../api";
import type { DesktopExportJob } from "../../electron/shared";
import { EXPORTS_TARGET_ID, onExportsPulse } from "./fly-to-exports";
import { ACTIVE_EXPORT, EXPORT_STATUS_LABEL, formatBytes, timeAgo, useExports } from "./use-exports";

/** How many the panel shows; the rest are on the Exports page. */
const PANEL_LIMIT = 6;

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function Row({
  job,
  onOpenProject,
}: {
  job: DesktopExportJob;
  onOpenProject: (dir: string) => void;
}) {
  const active = ACTIVE_EXPORT.has(job.status);
  const showProgress = job.status === "rendering" || job.status === "encoding";
  const detail =
    job.status === "done"
      ? [job.sizeBytes ? formatBytes(job.sizeBytes) : null, job.fileMissing ? "file moved" : null]
      : [EXPORT_STATUS_LABEL[job.status], job.status === "rendering" ? `${job.progress}%` : null];
  return (
    <li className="flex flex-col gap-1.5 rounded-md px-2.5 py-2 hover:bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onOpenProject(job.projectDir)}
            title="Open project"
            className="block max-w-full truncate text-left text-[0.857rem] font-medium text-text-primary hover:underline"
          >
            {job.projectName}
          </button>
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-text-tertiary">
            <span className="uppercase">{job.format}</span>
            {detail.filter(Boolean).map((part) => (
              <span key={part} className={cx("flex items-center gap-1.5", job.status === "failed" && "text-danger")}>
                <span aria-hidden>·</span>
                {part}
              </span>
            ))}
            <span aria-hidden>·</span>
            <span>{timeAgo(job.finishedAt ?? job.startedAt ?? job.createdAt)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[0.786rem]">
          {job.status === "done" && !job.fileMissing && (
            <button
              type="button"
              onClick={() => void api.revealExport(job.id)}
              className="rounded px-2 py-1 text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              Show in Finder
            </button>
          )}
          {active && (
            <button
              type="button"
              onClick={() => void http(`/api/exports/${job.id}/cancel`, { method: "POST" })}
              className="rounded px-2 py-1 text-text-secondary transition-colors hover:bg-surface-raised hover:text-danger"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {showProgress && (
        <div className="h-1 overflow-hidden rounded-full bg-surface-raised">
          <div
            className={cx(
              "h-full rounded-full bg-accent transition-[width] duration-300",
              job.status === "encoding" && "animate-pulse",
            )}
            style={{ width: `${job.status === "encoding" ? 100 : job.progress}%` }}
          />
        </div>
      )}
      {job.status === "failed" && job.error && (
        <p className="truncate text-[0.75rem] text-danger" title={job.error}>
          {job.error}
        </p>
      )}
    </li>
  );
}

/**
 * The export queue, pinned to the right end of the tab strip.
 *
 * Reads like a browser's downloads panel: the button shows how many exports
 * are in flight, and the panel lists the latest few — from every project — with
 * progress and a way to the file or the project that made it. The rest are a
 * click away on the Exports page.
 */
export function ExportsButton({
  onOpenProject,
  onShowAll,
}: {
  onOpenProject: (dir: string) => void;
  onShowAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Fetched at mount for the badge, then live while the panel is open; the
  // badge also refreshes whenever an export is started (see `onExportsPulse`).
  const [tick, setTick] = useState(0);
  const { jobs } = useExports({ live: open || tick > 0, limit: PANEL_LIMIT });
  const root = useRef<HTMLDivElement>(null);

  const activeJobs = jobs.filter((job) => ACTIVE_EXPORT.has(job.status));
  const running = jobs.find((job) => job.status === "rendering" || job.status === "encoding");

  // An export finished while the panel was closed and nobody has looked yet:
  // the icon goes green until the panel is opened. Detected as a transition —
  // a job seen active on one snapshot and done on the next — so history from
  // before this launch never lights it up.
  const [unseenDone, setUnseenDone] = useState(false);
  const previous = useRef(new Map<string, DesktopExportJob["status"]>());
  useEffect(() => {
    const seen = previous.current;
    let finished = false;
    for (const job of jobs) {
      const was = seen.get(job.id);
      if (was && ACTIVE_EXPORT.has(was) && job.status === "done") finished = true;
      seen.set(job.id, job.status);
    }
    if (finished && !open) setUnseenDone(true);
  }, [jobs, open]);
  useEffect(() => {
    if (open) setUnseenDone(false);
  }, [open]);

  // Click-away and Escape, bound only while open.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // The chip flying in from an export button lands here: bump, and start
  // listening so the badge counts the job it announced.
  const [pulsing, setPulsing] = useState(false);
  useEffect(
    () =>
      onExportsPulse(() => {
        setTick((n) => n + 1);
        setPulsing(true);
        setTimeout(() => setPulsing(false), 450);
      }),
    [],
  );

  // Determinate ring for the running job, drawn as a conic gradient.
  const progress = running ? (running.status === "encoding" ? 100 : running.progress) : 0;

  return (
    <div ref={root} className="no-drag relative shrink-0">
      <button
        id={EXPORTS_TARGET_ID}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          activeJobs.length
            ? `Exports, ${activeJobs.length} in progress`
            : unseenDone
              ? "Exports, finished"
              : "Exports"
        }
        className={cx(
          "relative flex h-7 items-center gap-1.5 rounded-md px-2 text-[0.857rem]",
          "transition-[background-color,color,transform] duration-150 outline-none",
          "hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40",
          // One colour utility at a time: two would both set `color`, and
          // which wins is decided by the stylesheet, not by this list.
          unseenDone && !open
            ? "text-green hover:text-green-strong"
            : open || pulsing
              ? "text-text-primary"
              : "text-text-secondary hover:text-text-primary",
          open && "bg-surface-hover",
          pulsing && "scale-125",
        )}
      >
        <span className="relative flex size-5 items-center justify-center">
          {unseenDone && !open && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-green ring-2 ring-background"
            />
          )}
          {running && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(var(--color-accent) ${progress}%, transparent 0)`,
                mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)",
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)",
              }}
            />
          )}
          <DownloadIcon className="size-4" />
        </span>
        {activeJobs.length > 0 && (
          <span className="rounded-full bg-accent px-1.5 text-[0.7rem] font-medium leading-4 text-white">
            {activeJobs.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Exports"
          className={cx(
            "absolute right-0 top-9 z-50 w-96 rounded-lg border border-border bg-surface-raised p-1.5",
            "shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
          )}
        >
          <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1">
            <span className="text-[0.857rem] font-medium text-text-primary">Exports</span>
            {activeJobs.length > 0 && (
              <span className="text-[0.75rem] text-text-tertiary">
                {activeJobs.length} in progress
              </span>
            )}
          </div>
          {jobs.length === 0 ? (
            <p className="px-2.5 pb-3 pt-1 text-[0.857rem] text-text-tertiary">
              Nothing exported yet. Exports from every project show up here.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {jobs.map((job) => (
                <Row
                  key={job.id}
                  job={job}
                  onOpenProject={(dir) => {
                    setOpen(false);
                    onOpenProject(dir);
                  }}
                />
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onShowAll();
            }}
            className="mt-1 flex w-full items-center justify-center rounded-md px-2.5 py-2 text-[0.857rem] text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            Show all exports
          </button>
        </div>
      )}
    </div>
  );
}
