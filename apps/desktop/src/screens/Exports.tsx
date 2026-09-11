import { cx } from "@/components/ui";
import { api as http } from "@/lib/api";
import { api } from "../api";
import type { DesktopExportJob } from "../../electron/shared";
import {
  ACTIVE_EXPORT,
  EXPORT_STATUS_LABEL,
  formatBytes,
  formatClipLength,
  useExports,
} from "../tabs/use-exports";

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 12h18M3 8h4M3 16h4M17 8h4M17 16h4" />
    </svg>
  );
}

/** "Today", "Yesterday", or a date — the headings the list is grouped under. */
function dayLabel(ms: number): string {
  const date = new Date(ms);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: days < 7 ? "long" : undefined,
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function timeOfDay(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function Card({
  job,
  onOpenProject,
}: {
  job: DesktopExportJob;
  onOpenProject: (dir: string) => void;
}) {
  const active = ACTIVE_EXPORT.has(job.status);
  const stamp = job.finishedAt ?? job.startedAt ?? job.createdAt;
  const meta = [
    job.format.toUpperCase(),
    job.width && job.height ? `${job.width} × ${job.height}` : null,
    job.durationSeconds ? formatClipLength(job.durationSeconds) : null,
    job.sizeBytes ? formatBytes(job.sizeBytes) : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <li className="flex items-center gap-4 rounded-lg bg-surface-raised p-3">
      {/* The project's card image stands in for the file: the export is that
          composition, and its own first frame would cost a decode per row.
          While it renders, a dark veil covers what is not done yet and pulls
          back from the left as the frames land — the picture is revealed at
          the rate the file is written. */}
      <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-md bg-surface">
        {job.thumbnail ? (
          <img src={job.thumbnail} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-text-tertiary">
            <FilmIcon className="size-6" />
          </div>
        )}
        {active && (
          <div
            aria-hidden
            className={cx(
              "gm-card-shimmer absolute inset-y-0 right-0 overflow-hidden transition-[width] duration-300",
              // Encoding has no per-frame progress; the whole picture waits
              // under a lighter veil until the file is muxed.
              job.status === "encoding" ? "bg-black/30" : "bg-black/60",
            )}
            style={{ width: `${job.status === "rendering" ? 100 - job.progress : 100}%` }}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpenProject(job.projectDir)}
          title="Open project"
          className="block max-w-full truncate text-left font-medium text-text-primary hover:underline"
        >
          {job.projectName}
        </button>
        <p className="mt-0.5 truncate text-[0.857rem] text-text-tertiary">{meta.join(" · ")}</p>
        <p
          className={cx(
            "mt-1 text-[0.786rem]",
            job.status === "failed" ? "text-danger" : "text-text-secondary",
          )}
        >
          {job.status === "done"
            ? job.fileMissing
              ? `Exported at ${timeOfDay(stamp)} — the file has since been moved or deleted`
              : `Exported at ${timeOfDay(stamp)}`
            : job.status === "rendering"
              ? `${EXPORT_STATUS_LABEL[job.status]} ${job.progress}%`
              : job.status === "failed"
                ? job.error || "Export failed"
                : EXPORT_STATUS_LABEL[job.status]}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 text-[0.857rem]">
        {job.status === "done" && !job.fileMissing && (
          <button
            type="button"
            onClick={() => void api.revealExport(job.id)}
            className="rounded-md px-3 py-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            Show in Finder
          </button>
        )}
        {active && (
          <button
            type="button"
            onClick={() => void http(`/api/exports/${job.id}/cancel`, { method: "POST" })}
            className="rounded-md px-3 py-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-danger"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenProject(job.projectDir)}
          className="rounded-md px-3 py-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          Open project
        </button>
      </div>
    </li>
  );
}

/**
 * Every export the app has made, newest first, grouped by day.
 *
 * The panel in the tab strip shows the latest few; this is the rest of the
 * list — and it is live, so an export started a moment ago renders its
 * progress here too.
 */
export function Exports({ onOpenProject }: { onOpenProject: (dir: string) => void }) {
  const { jobs, loaded } = useExports({ live: true, thumbnails: true });

  const groups: { label: string; jobs: DesktopExportJob[] }[] = [];
  for (const job of jobs) {
    const label = dayLabel(job.finishedAt ?? job.startedAt ?? job.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.jobs.push(job);
    else groups.push({ label, jobs: [job] });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl tracking-tight">Exports</h1>
            <p className="mt-1 text-text-secondary">
              Every video rendered on this Mac, from every project.
            </p>
          </div>
          {jobs.length > 0 && (
            <span className="text-[0.857rem] text-text-tertiary">
              {jobs.length} {jobs.length === 1 ? "export" : "exports"}
            </span>
          )}
        </div>

        {loaded && jobs.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg bg-surface-raised px-6 py-16 text-center">
            <FilmIcon className="size-8 text-text-tertiary" />
            <p className="text-text-secondary">Nothing exported yet.</p>
            <p className="max-w-sm text-[0.857rem] text-text-tertiary">
              Open a project and press Export. Finished videos are listed here, and the
              latest few are always a click away in the tab strip.
            </p>
          </div>
        )}

        {groups.map((group) => (
          <section key={group.label} className="mb-8">
            <h2 className="mb-3 text-[0.786rem] font-medium uppercase tracking-wider text-text-tertiary">
              {group.label}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.jobs.map((job) => (
                <Card key={job.id} job={job} onOpenProject={onOpenProject} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
