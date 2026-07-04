"use client";

import { useQuery } from "@tanstack/react-query";
import { Spinner, cx } from "@/components/ui";
import { adminApi } from "@/lib/admin/client";

type RenderJob = {
  id: string;
  status: "queued" | "rendering" | "encoding" | "uploading" | "done" | "failed" | "cancelled";
  progress: number;
  format: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  projectId: string;
  projectName: string;
  thumbnailUrl: string | null;
};

const IN_PROGRESS = new Set(["queued", "rendering", "encoding", "uploading"]);
const STATUS_LABEL: Record<RenderJob["status"], string> = {
  queued: "Queued",
  rendering: "Rendering",
  encoding: "Encoding",
  uploading: "Uploading",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

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
  // failed / cancelled
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

export default function AdminRenders() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "renders"],
    queryFn: () => adminApi<RenderJob[]>("/renders"),
    // Poll so in-flight jobs update live; back off when nothing is active.
    refetchInterval: (q) =>
      (q.state.data ?? []).some((j) => IN_PROGRESS.has(j.status)) ? 3000 : 15000,
  });

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
        {data?.map((j) => {
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
        {data && data.length === 0 && (
          <div className="px-4 py-10 text-center text-text-tertiary">No render jobs yet.</div>
        )}
      </div>
    </div>
  );
}
