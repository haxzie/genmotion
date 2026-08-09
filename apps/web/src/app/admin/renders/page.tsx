"use client";

import { Spinner, cx } from "@/components/ui";
import { InfiniteSentinel, useAdminInfinite } from "@/lib/admin/client";

type RenderJob = {
  id: string;
  status: "queued" | "rendering" | "encoding" | "uploading" | "done" | "failed" | "cancelled";
  progress: number;
  format: string;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  projectId: string;
  projectName: string;
  thumbnailUrl: string | null;
};

const IN_PROGRESS = new Set(["queued", "rendering", "encoding", "uploading"]);
/** In progress *and* already picked up — i.e. the render clock is running. */
const IN_PROGRESS_RUNNING = new Set(["rendering", "encoding", "uploading"]);
const STATUS_LABEL: Record<RenderJob["status"], string> = {
  queued: "Queued",
  rendering: "Rendering",
  encoding: "Encoding",
  uploading: "Uploading",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** "1m 42s" / "8.4s" — a duration, not a clock time. */
function formatDuration(ms: number) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

/** Wall-clock time of day, for "when did this start". */
function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * How long the job waited for a worker, and how long the render itself took.
 * Split deliberately: a slow queue and a slow render are different problems,
 * and a single "took 4m" number hides which one you have.
 */
function timings(j: RenderJob) {
  const created = new Date(j.createdAt).getTime();
  const started = j.startedAt ? new Date(j.startedAt).getTime() : null;
  const ended = j.completedAt ? new Date(j.completedAt).getTime() : null;
  // Still running: measure against now so the number ticks up as it polls.
  const renderEnd = ended ?? (started && IN_PROGRESS_RUNNING.has(j.status) ? Date.now() : null);
  return {
    waited: started ? started - created : null,
    rendered: started && renderEnd ? renderEnd - started : null,
    running: !ended && started !== null,
  };
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function StatusIcon({ status }: { status: RenderJob["status"] }) {
  if (IN_PROGRESS.has(status)) {
    return <Spinner className="size-4 text-accent" />;
  }
  if (status === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-green/15 text-green">
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={cx(
        "flex size-5 items-center justify-center rounded-full",
        status === "failed" ? "bg-danger/15 text-danger" : "bg-text-tertiary/15 text-text-tertiary",
      )}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </span>
  );
}

function RenderTimings({ job }: { job: RenderJob }) {
  const { waited, rendered, running } = timings(job);
  if (waited === null && rendered === null) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[0.72rem] text-text-tertiary">
      {job.startedAt && (
        <span title={new Date(job.startedAt).toLocaleString()}>
          started {formatClock(job.startedAt)}
        </span>
      )}
      {waited !== null && waited > 0 && <span>queued {formatDuration(waited)}</span>}
      {rendered !== null && (
        <span className={running ? "text-accent" : "text-text-secondary"}>
          {running ? "rendering" : "took"} {formatDuration(rendered)}
        </span>
      )}
    </div>
  );
}

export default function AdminRenders() {
  const { items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminInfinite<RenderJob>(["renders"], "/renders", (rows) =>
      // Poll fast while anything is in progress, slowly otherwise.
      rows.some((j) => IN_PROGRESS.has(j.status)) ? 3000 : 15000,
    );

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Render Queue</h1>
      <p className="mt-1 text-[0.95rem] text-text-secondary">Recent render jobs.</p>

      {isLoading && (
        <div className="mt-10 flex justify-center">
          <Spinner className="size-5 text-text-tertiary" />
        </div>
      )}

      <div className="mt-6 divide-y divide-border/60 overflow-hidden rounded-xl border border-border">
        {items.map((j) => {
          const active = IN_PROGRESS.has(j.status);
          return (
            <div key={j.id} className="flex items-center gap-3 px-4 py-3">
              <StatusIcon status={j.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[0.92rem] font-medium">{j.projectName}</span>
                  <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[0.68rem] uppercase text-text-tertiary">
                    {j.format}
                  </span>
                </div>
                {j.status === "failed" && j.error ? (
                  <div className="mt-0.5 truncate text-[0.8rem] text-danger" title={j.error}>
                    {j.error}
                  </div>
                ) : (
                  <div className="mt-0.5 text-[0.8rem] text-text-tertiary">
                    {STATUS_LABEL[j.status]}
                    {active ? ` · ${j.progress}%` : ` · ${timeAgo(j.createdAt)}`}
                  </div>
                )}
                <RenderTimings job={j} />
              </div>
              {active && (
                <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${Math.max(j.progress, 4)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {!isLoading && items.length === 0 && (
          <div className="px-4 py-10 text-center text-text-tertiary">No render jobs yet.</div>
        )}
      </div>

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner className="size-4 text-text-tertiary" />
        </div>
      )}
      <InfiniteSentinel
        enabled={hasNextPage && !isFetchingNextPage}
        onReach={() => fetchNextPage()}
      />
    </div>
  );
}
