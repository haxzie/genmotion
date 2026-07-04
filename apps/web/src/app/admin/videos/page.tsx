"use client";

import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui";
import { adminApi } from "@/lib/admin/client";

type Video = {
  id: string;
  url: string;
  filename: string;
  createdAt: string;
  durationSeconds: number | null;
  projectId: string;
  projectName: string;
  thumbnailUrl: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminVideos() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "videos"],
    queryFn: () => adminApi<Video[]>("/videos"),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Videos</h1>
      <p className="mt-1 text-[0.95rem] text-text-secondary">Recently exported videos.</p>

      {isLoading && (
        <div className="mt-10 flex justify-center">
          <Spinner className="size-5 text-text-tertiary" />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((v) => (
          <a
            key={v.id}
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong hover:bg-surface-hover"
          >
            <div className="relative aspect-video overflow-hidden bg-surface-raised">
              {v.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnailUrl}
                  alt=""
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="size-full" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex size-11 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm">
                  <svg viewBox="0 0 24 24" className="size-5 translate-x-px" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="p-3">
              <div className="truncate text-[0.9rem] font-medium">{v.projectName}</div>
              <div className="mt-0.5 flex items-center justify-between text-[0.78rem] text-text-tertiary">
                <span className="truncate">{v.filename}</span>
                <span className="shrink-0 pl-2">{formatDate(v.createdAt)}</span>
              </div>
            </div>
          </a>
        ))}
        {data && data.length === 0 && (
          <div className="col-span-full py-10 text-center text-text-tertiary">
            No exported videos yet.
          </div>
        )}
      </div>
    </div>
  );
}
