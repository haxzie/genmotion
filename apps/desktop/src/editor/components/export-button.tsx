"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EXPORT_FORMATS,
  type ExportFormat,
  type ExportJobData,
  type ProjectData,
  totalDurationInFrames,
} from "@genmotion/shared";
import { API_URL, api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { Button, Spinner, cx } from "@/components/ui";
import { Modal } from "@/components/modal";
import { limitsQueryKey, useUpgrade } from "@/components/upgrade-modal";
import { flyToExports } from "../../tabs/fly-to-exports";

const ACTIVE_STATUSES = new Set(["queued", "rendering", "encoding", "uploading"]);

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued…",
  rendering: "Rendering frames…",
  encoding: "Encoding…",
  uploading: "Uploading…",
};

/** FNV-1a — small, fast, stable hash for change detection. */
function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Content fingerprint of everything that affects the rendered video — scene
 * code, order, durations, audio, and the composition config. Two exports of
 * the same signature produce the same MP4, so a changed signature means the
 * project is "dirty" relative to a finished export.
 */
function projectSignature(p: ProjectData): string {
  const parts = [
    `${p.fps}x${p.width}x${p.height}`,
    ...p.scenes.map(
      (s) =>
        `${s.id}:${s.order}:${s.durationInFrames}:${s.audioUrl ?? ""}:${s.audioVolume ?? 1}:${s.code}`,
    ),
  ];
  return hashString(parts.join("\u0000"));
}

function formatLength(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  if (minutes === 0) return `${seconds.toFixed(1)}s`;
  return `${minutes}m ${Math.round(seconds)}s`;
}

const FORMAT_KEY = "gm-export-format";
const DEFAULT_FORMAT: ExportFormat = "mp4";
// Quality is no longer user-adjustable — always export near-lossless.
const EXPORT_QUALITY = 95;

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function triggerDownload(url: string) {
  const dl = url + (url.includes("?") ? "&" : "?") + "download=1";
  const a = document.createElement("a");
  a.href = dl;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ExportButton({
  projectId,
  project,
  disabled,
}: {
  projectId: string;
  project: ProjectData;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { openUpgrade, handleLimitError, plan } = useUpgrade();
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<ExportJobData | null>(null);
  const [format, setFormat] = useState<ExportFormat>(() => {
    if (typeof window === "undefined") return DEFAULT_FORMAT;
    const saved = localStorage.getItem(FORMAT_KEY);
    return EXPORT_FORMATS.some((f) => f.id === saved)
      ? (saved as ExportFormat)
      : DEFAULT_FORMAT;
  });
  useEffect(() => {
    try {
      localStorage.setItem(FORMAT_KEY, format);
    } catch {
      /* private mode / quota — preference just won't persist */
    }
  }, [format]);

  // Resume tracking an in-flight export after reload.
  const { data: latest } = useQuery({
    queryKey: ["export-latest", projectId],
    queryFn: () =>
      api<ExportJobData | null>(
        `/api/exports/latest?projectId=${encodeURIComponent(projectId)}`,
      ),
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (latest && !job) setJob(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest]);

  // Live progress over SSE while the job is active.
  const jobActive = job ? ACTIVE_STATUSES.has(job.status) : false;
  useEffect(() => {
    if (!job || !jobActive) return;
    const source = new EventSource(`${API_URL}/api/exports/${job.id}/events`, {
      withCredentials: true,
    });
    source.addEventListener("progress", (event) => {
      const updated = JSON.parse((event as MessageEvent).data) as ExportJobData;
      setJob(updated);
      if (updated.status === "done" || updated.status === "failed") {
        source.close();
        queryClient.invalidateQueries({ queryKey: ["export-latest", projectId] });
      }
    });
    return () => source.close();
  }, [job?.id, jobActive, projectId, queryClient]);

  const done = job?.status === "done";
  const failed = job?.status === "failed";

  // Brief "Downloaded ✓" confirmation after a download fires, then revert.
  const [justDownloaded, setJustDownloaded] = useState(false);
  const downloadedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function download(url: string) {
    triggerDownload(url);
    track("export_downloaded", { format });
    setJustDownloaded(true);
    if (downloadedTimer.current) clearTimeout(downloadedTimer.current);
    downloadedTimer.current = setTimeout(() => setJustDownloaded(false), 3000);
  }
  useEffect(
    () => () => {
      if (downloadedTimer.current) clearTimeout(downloadedTimer.current);
    },
    [],
  );


  const startExport = useMutation({
    mutationFn: (fmt: ExportFormat) =>
      api<ExportJobData>("/api/exports", {
        json: { projectId, format: fmt, quality: EXPORT_QUALITY },
      }),
    onSuccess: (created, fmt) => {
      track("export_started", { format: fmt });
      setJob(created);
      queryClient.invalidateQueries({ queryKey: limitsQueryKey });
    },
    onError: handleLimitError,
  });


  // Cancel a still-queued export (pulls it from the render queue). The API
  // rejects this once rendering has started (409), so the button is only shown
  // while the job is queued.
  const cancelExport = useMutation({
    mutationFn: (id: string) =>
      api<ExportJobData>(`/api/exports/${id}/cancel`, { method: "POST" }),
    onSuccess: (updated) => {
      track("export_cancelled");
      setJob(updated);
    },
    onError: () => {
      // Likely a 409 (rendering already started) — resync from the live job.
      queryClient.invalidateQueries({ queryKey: ["export-latest", projectId] });
    },
  });

  // Track the project signature that was last exported so we can tell whether
  // the video has changed since. Persisted so it survives a reload (the resumed
  // job otherwise has no memory of what it rendered).
  const sigKey = `gm-export-sig-${projectId}`;
  const exportedSig = useRef<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(sigKey) : null,
  );
  const currentSig = useMemo(() => projectSignature(project), [project]);

  function runExport(event: ReactMouseEvent<HTMLButtonElement>) {
    // No client-side pre-gate: exports are unmetered, and the trial paywall is
    // enforced by the server, which answers 402 and opens the modal via
    // handleLimitError below.
    exportedSig.current = currentSig;
    try {
      localStorage.setItem(sigKey, currentSig);
    } catch {
      /* private mode / quota — change detection just won't survive reload */
    }
    startExport.mutate(format);
    // The render carries on in the queue; the dialog has nothing more to say.
    // Close it and point at where the export went — the Exports icon in the
    // tab strip — the way a browser does for a download. The rect is read
    // before the dialog unmounts under us.
    const from = event.currentTarget.getBoundingClientRect();
    setOpen(false);
    flyToExports(from, format);
  }

  const frames = totalDurationInFrames(project.scenes);
  const length = formatLength(frames / project.fps);
  const progress = job?.progress ?? 0;
  const starting = startExport.isPending;
  const active = jobActive || starting;
  // Only a queued job (not yet rendering) can be cancelled + pulled from the queue.
  const queued = job?.status === "queued" && !starting;
  const cancelled = job?.status === "cancelled";
  // Finished export no longer matches the current project → offer a re-export.
  const dirty = done && exportedSig.current !== null && exportedSig.current !== currentSig;

  const fmtMeta = EXPORT_FORMATS.find((f) => f.id === format) ?? EXPORT_FORMATS[0]!;
  // The actual exported file's extension (from its URL), for the button label.
  const downloadExt = job?.outputUrl
    ? (job.outputUrl.split("?")[0]?.split(".").pop() ?? "").toUpperCase()
    : "";
  // The selected format differs from what was actually exported → a fresh render
  // is needed, so treat it like "dirty" (offer re-export, not a stale download).
  const formatChanged =
    done && !!job?.outputUrl && downloadExt.toLowerCase() !== format;
  const needsExport = dirty || formatChanged;
  const details: Array<[string, string]> = [
    ["Resolution", `${project.width} × ${project.height}`],
    ["Frame rate", `${project.fps} fps`],
    ["Length", length],
    ["Frames", frames.toLocaleString()],
    ["Scenes", String(project.scenes.length)],
    ["Format", fmtMeta.label],
  ];

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {active && <Spinner className="size-3 text-background" />}
        {active ? `${progress}%` : "Export"}
      </Button>

      {/* Dismissible even mid-render: the export carries on in the queue, the
          button shows its progress, and the Exports panel in the tab strip
          lists it — so there is no reason to hold the user in a dialog, and
          a modal that could not be closed would also block switching tabs. */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="export-modal-title"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="export-modal-title" className="text-[1.05rem] font-semibold text-text-primary">
            Export video
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
          >
            <svg viewBox="0 0 14 14" className="size-3.5" stroke="currentColor" strokeWidth="1.6" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {details.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 bg-surface-raised px-3.5 py-2.5">
                <dt className="text-[0.75rem] text-text-tertiary">{label}</dt>
                <dd className="text-[0.95rem] tabular-nums text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4">
            <div className="mb-1.5 text-[0.786rem] text-text-secondary">Format</div>
            <div className="flex gap-1 rounded-lg border border-border bg-surface-raised p-1">
              {EXPORT_FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  disabled={active}
                  onClick={() => setFormat(f.id)}
                  className={cx(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-2 text-center transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
                    format === f.id
                      ? "bg-surface text-text-primary shadow-sm ring-1 ring-border-strong"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <span className="text-[0.95rem] font-medium">{f.label}</span>
                  <span className="text-[0.68rem] leading-tight text-text-tertiary">
                    {f.note}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* The server decides this from the plan; mirrored here so a Free
              export is never a surprise once the file is downloaded. A button,
              not a link: this window has no /settings/billing to navigate to —
              the upgrade modal is what knows how to get there (the browser). */}
          {plan?.id === "free" && (
            <p className="mt-3 rounded-md border border-border bg-surface-raised px-3 py-2 text-[0.786rem] text-text-secondary">
              Free exports include a small GenMotion badge in the bottom-right
              corner.{" "}
              <button
                type="button"
                onClick={() => openUpgrade("trial")}
                className="cursor-pointer font-medium text-text-primary underline underline-offset-2 hover:text-accent"
              >
                Upgrade
              </button>{" "}
              to export without it.
            </p>
          )}

          {failed && (
            <p className="mt-3 max-h-24 overflow-y-auto rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[0.786rem] text-danger">
              {job?.error || "Export failed. Try again."}
            </p>
          )}

          {cancelled && (
            <p className="mt-3 rounded-md border border-border bg-surface-raised px-3 py-2 text-[0.786rem] text-text-secondary">
              Render cancelled. Export again when you&apos;re ready.
            </p>
          )}

          {needsExport && (
            <p className="mt-3 rounded-md border border-border bg-surface-raised px-3 py-2 text-[0.786rem] text-text-secondary">
              {dirty
                ? "You've changed the project since the last export. Re-export to update the video."
                : `Selected ${fmtMeta.label} — re-export to render it in this format.`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-t border-border px-5 py-4">
          <Button
            variant="secondary"
            className="h-10 px-4"
            // While the job is queued or rendering this cancels it — a running
            // render stops at the next frame; otherwise it closes the dialog.
            disabled={cancelExport.isPending}
            onClick={
              active ? () => cancelExport.mutate(job!.id) : () => setOpen(false)
            }
          >
            {active
              ? cancelExport.isPending
                ? "Cancelling…"
                : queued
                  ? "Cancel"
                  : "Cancel render"
              : done
                ? "Close"
                : "Cancel"}
          </Button>

          {done && job?.outputUrl && !needsExport ? (
            <button
              type="button"
              onClick={() => download(job.outputUrl!)}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-green font-medium text-white outline-none transition-colors duration-150 hover:bg-green/90 focus-visible:ring-2 focus-visible:ring-green/40"
            >
              {justDownloaded ? (
                <>
                  <CheckIcon className="size-4" />
                  Downloaded
                </>
              ) : (
                <>
                  <DownloadIcon className="size-4" />
                  Download{downloadExt ? ` ${downloadExt}` : ""}
                </>
              )}
            </button>
          ) : active ? (
            <div className="relative h-10 flex-1 overflow-hidden rounded-lg bg-surface-raised" aria-live="polite">
              <div
                className="absolute inset-y-0 left-0 bg-accent transition-all duration-500 ease-out"
                style={{ width: `${Math.max(progress, 6)}%` }}
              />
              <div className="relative z-10 flex h-full items-center justify-center gap-2 text-[0.857rem] font-medium text-white">
                <Spinner className="size-3.5 text-white" />
                <span>{STATUS_LABELS[job?.status ?? "queued"] ?? "Working…"}</span>
                <span className="tabular-nums opacity-80">{progress}%</span>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              className="h-10 flex-1"
              onClick={runExport}
            >
              {failed ? "Try again" : needsExport ? "Re-export" : "Export"}
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
