import { useEffect, useState } from "react";
import { API_URL, api as http } from "@/lib/api";
import type { DesktopExportJob } from "../../electron/shared";

export const ACTIVE_EXPORT = new Set(["queued", "rendering", "encoding", "uploading"]);

export const EXPORT_STATUS_LABEL: Record<DesktopExportJob["status"], string> = {
  queued: "Waiting",
  rendering: "Rendering",
  encoding: "Encoding",
  uploading: "Finishing",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

/**
 * Every export across every project, live.
 *
 * Seeded by one request and then kept current over the queue's own event
 * stream — one stream for the whole list, so nothing here has to know which
 * jobs exist to subscribe to them. `limit` is for the panel, which shows a
 * handful; `thumbnails` is for the page. The stream carries no pictures, so an
 * update keeps whatever picture the row already had.
 */
export function useExports({
  live,
  limit,
  thumbnails = false,
}: {
  /** Open the stream. Off, the list is fetched once and left. */
  live: boolean;
  limit?: number;
  thumbnails?: boolean;
}): { jobs: DesktopExportJob[]; loaded: boolean } {
  const [jobs, setJobs] = useState<DesktopExportJob[]>([]);
  const [loaded, setLoaded] = useState(false);

  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  if (thumbnails) query.set("thumbnails", "1");
  const search = query.toString();

  useEffect(() => {
    let cancelled = false;
    void http<DesktopExportJob[]>(`/api/exports${search ? `?${search}` : ""}`)
      .then((list) => {
        if (cancelled) return;
        setJobs(list);
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [search, live]);

  useEffect(() => {
    if (!live) return;
    const feed = new URLSearchParams();
    if (limit) feed.set("limit", String(limit));
    const source = new EventSource(`${API_URL}/api/exports/feed?${feed.toString()}`, {
      withCredentials: true,
    });
    source.addEventListener("exports", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as DesktopExportJob[];
      setJobs((previous) => {
        if (!thumbnails) return next;
        const pictures = new Map(previous.map((job) => [job.projectDir, job.thumbnail]));
        return next.map((job) => ({ ...job, thumbnail: pictures.get(job.projectDir) ?? null }));
      });
    });
    return () => source.close();
  }, [live, limit, thumbnails]);

  return { jobs, loaded };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatClipLength(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function timeAgo(ms: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
