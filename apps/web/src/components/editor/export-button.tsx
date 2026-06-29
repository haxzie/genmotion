"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExportJobData } from "@genmotion/shared";
import { API_URL, api } from "@/lib/api";
import { Button, Spinner, cx } from "@/components/ui";

const ACTIVE_STATUSES = new Set(["queued", "rendering", "encoding", "uploading"]);

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued…",
  rendering: "Rendering frames…",
  encoding: "Encoding MP4…",
  uploading: "Uploading…",
  done: "Export ready",
  failed: "Export failed",
};

export function ExportButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<ExportJobData | null>(null);

  // Resume tracking an in-flight export after reload.
  const { data: latest } = useQuery({
    queryKey: ["export-latest", projectId],
    queryFn: () =>
      api<ExportJobData | null>(`/api/exports/latest?projectId=${projectId}`),
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (latest && !job) setJob(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest]);

  // Live progress over SSE while the job is active.
  const sourceRef = useRef<EventSource | null>(null);
  const jobActive = job ? ACTIVE_STATUSES.has(job.status) : false;
  useEffect(() => {
    if (!job || !jobActive) return;
    const source = new EventSource(`${API_URL}/api/exports/${job.id}/events`, {
      withCredentials: true,
    });
    sourceRef.current = source;
    source.addEventListener("progress", (event) => {
      const updated = JSON.parse((event as MessageEvent).data) as ExportJobData;
      setJob(updated);
      if (updated.status === "done" || updated.status === "failed") {
        source.close();
        queryClient.invalidateQueries({ queryKey: ["export-latest", projectId] });
      }
    });
    source.onerror = () => {
      // The API closes the stream at terminal states; rely on the next poll.
    };
    return () => source.close();
  }, [job?.id, jobActive, projectId, queryClient]);

  const startExport = useMutation({
    mutationFn: () =>
      api<ExportJobData>("/api/exports", { json: { projectId } }),
    onSuccess: (created) => {
      setJob(created);
      setOpen(true);
    },
  });

  const busy = jobActive || startExport.isPending;

  return (
    <div className="relative">
      <Button
        variant="primary"
        size="sm"
        disabled={disabled || startExport.isPending}
        onClick={() => {
          if (busy || (job && job.status === "done")) {
            setOpen((v) => !v);
          } else {
            startExport.mutate();
          }
        }}
      >
        {busy && <Spinner className="size-3 text-white" />}
        {busy ? `${job?.progress ?? 0}%` : "Export"}
      </Button>

      {open && job && (
        <div className="absolute right-0 top-9 z-50 w-72 rounded-md border border-border bg-surface-raised p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span
              className={cx(
                "text-[0.857rem] font-medium",
                job.status === "failed" ? "text-danger" : "text-text-primary",
              )}
            >
              {STATUS_LABELS[job.status] ?? job.status}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-text-tertiary hover:text-text-primary"
            >
              ✕
            </button>
          </div>

          {ACTIVE_STATUSES.has(job.status) && (
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}

          {job.status === "failed" && (
            <p className="mb-2 max-h-24 overflow-y-auto text-[0.786rem] text-text-secondary">
              {job.error}
            </p>
          )}

          {job.status === "done" && job.outputUrl && (
            <a
              href={job.outputUrl}
              download
              className="block w-full rounded-md bg-cta px-3 py-1.5 text-center font-medium text-white transition-colors hover:bg-cta-hover"
            >
              Download MP4
            </a>
          )}

          {(job.status === "done" || job.status === "failed") && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => startExport.mutate()}
              disabled={startExport.isPending}
            >
              Export again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
