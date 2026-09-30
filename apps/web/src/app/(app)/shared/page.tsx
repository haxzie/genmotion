"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL, api } from "@/lib/api";
import { Button, Spinner, cx } from "@/components/ui";
import { Modal } from "@/components/modal";

/**
 * Videos this account has published to public pages.
 *
 * Sharing happens in the desktop app, where the rendered file is. This page
 * exists for the other half — seeing what is out there under your name, and
 * taking one down. That belongs on the web precisely because the desktop app
 * may not be to hand: the moment you most want a public video gone is not
 * reliably a moment you are sitting at the Mac that made it.
 */

interface SharedVideo {
  id: string;
  slug: string;
  title: string;
  url: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  hasPoster: boolean;
  createdAt: string;
}

const QUERY_KEY = ["shares"] as const;

export default function SharedVideosPage() {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<SharedVideo | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api<{ items: SharedVideo[] }>("/api/shares"),
    staleTime: 30_000,
  });

  async function remove(video: SharedVideo) {
    setBusyId(video.id);
    try {
      await api(`/api/shares/${video.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setConfirming(null);
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl px-8 pb-20 pt-10">
      <h1 className="text-2xl font-medium">Shared videos</h1>
      <p className="mb-8 text-[0.95rem] text-text-secondary">
        Videos you have published to a public page. Anyone with the link can watch
        them, and they may appear in search results.
      </p>

      {isPending && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {error && (
        <p className="text-[0.9rem] text-danger">
          {error instanceof Error ? error.message : "Could not load your shared videos."}
        </p>
      )}

      {!isPending && !error && items.length === 0 && (
        <div className="rounded-md border border-dashed border-border py-14 text-center text-text-tertiary">
          <p>Nothing shared yet.</p>
          <p className="mt-1 text-[0.857rem]">
            Export a video in the desktop app, then press Share on it — the link
            you get back will be listed here.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          {items.map((video, i) => (
            <div
              key={video.id}
              className={cx(
                "flex items-center gap-3 px-4 py-3",
                i > 0 && "border-t border-border",
              )}
            >
              <div className="aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-surface-raised">
                {video.hasPoster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${API_URL}/api/shares/s/${video.slug}/poster`}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium text-text-primary hover:underline"
                >
                  {video.title}
                </a>
                <p className="mt-0.5 truncate text-[0.857rem] text-text-tertiary">
                  {[
                    video.durationSeconds ? formatDuration(video.durationSeconds) : null,
                    video.width && video.height ? `${video.width} × ${video.height}` : null,
                    video.sizeBytes ? formatBytes(video.sizeBytes) : null,
                    new Date(video.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(video.url);
                  setCopiedId(video.id);
                  setTimeout(() => setCopiedId((id) => (id === video.id ? null : id)), 1600);
                }}
                className={cx(
                  "shrink-0 rounded-md px-2.5 py-1 text-[0.857rem] transition-colors",
                  copiedId === video.id
                    ? "text-green"
                    : "text-text-tertiary hover:text-text-primary",
                )}
              >
                {copiedId === video.id ? "Copied" : "Copy link"}
              </button>

              <button
                type="button"
                onClick={() => setConfirming(video)}
                disabled={busyId === video.id}
                aria-label={`Remove ${video.title}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {confirming && (
        <Modal
          open
          onClose={() => setConfirming(null)}
          dismissible={busyId === null}
          labelledBy="unshare-title"
        >
          <div className="px-5 py-5">
            <h2 id="unshare-title" className="text-[1.05rem] font-semibold text-text-primary">
              Remove “{confirming.title}”?
            </h2>
            <p className="mt-2 text-[0.857rem] text-text-secondary">
              The link stops working and the video is deleted from our servers. The
              exported file on your own machine is untouched.
            </p>
            {/* The part nobody expects, said before the press rather than in a
                support reply afterwards. */}
            <p className="mt-2 text-[0.786rem] text-text-tertiary">
              Search engines may keep showing it for a while after it is gone.
            </p>
          </div>
          <div className="flex items-center gap-2.5 border-t border-border px-5 py-4">
            <Button
              variant="secondary"
              className="h-10 flex-1"
              disabled={busyId !== null}
              onClick={() => setConfirming(null)}
            >
              Keep it
            </Button>
            <Button
              variant="danger"
              className="h-10 flex-1 border-danger/30 bg-danger/10"
              disabled={busyId !== null}
              onClick={() => void remove(confirming)}
            >
              {busyId === confirming.id ? "Removing…" : "Remove"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole - minutes * 60).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  // Stepping down to KB matters: a short clip rounds to "0.0 MB", which reads
  // as a broken upload rather than a small one.
  if (kb < 1024) return `${Math.max(Math.round(kb), 1)} KB`;
  const mb = kb / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}
