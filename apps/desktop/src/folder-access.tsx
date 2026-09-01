import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cx, Spinner } from "@/components/ui";
import { folderName, prettyPath } from "./lib/paths";

interface ReadRoot {
  path: string;
  grantedAt: number;
}

interface ReadRootsState {
  roots: ReadRoot[];
  /** No project is open yet, so these apply to the next one created. */
  pending: boolean;
  /** The picker was dismissed — not an error, and not a change either. */
  cancelled?: boolean;
}

export const readRootsKey = ["read-roots"] as const;

/**
 * Open the native folder picker and share what comes back.
 *
 * Exported because the composer's `+` offers the same thing: two entry points,
 * one request, and one cache the answer lands in — so a folder added from
 * either place shows up in the other without a refetch.
 */
export function useShareFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<ReadRootsState>("/api/read-roots", { json: {} }),
    onSuccess: (next) => queryClient.setQueryData(readRootsKey, next),
  });
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.6.8l.9 1.2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

/**
 * Folders outside the project the agent may read.
 *
 * Sits beside the harness picker in the composer, because it belongs to the
 * same question — what is answering, and what it can see. The count on the
 * button is the point of it being here at all: access the user granted a week
 * ago should not be invisible while the agent is using it.
 *
 * Read-only is stated on the control rather than left to documentation. It is
 * the whole shape of the feature — sharing a folder never lets the agent
 * change anything in it, and a user who assumes otherwise shares less than
 * they safely could.
 */
export function FolderAccess({ placement = "up" }: { placement?: "up" | "down" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: readRootsKey,
    queryFn: () => api<ReadRootsState>("/api/read-roots"),
    staleTime: 0,
  });

  // The picker is native and opens in the main process, so this mutation is
  // pending for as long as the user is looking at a Finder window.
  const share = useShareFolder();

  const revoke = useMutation({
    mutationFn: (dir: string) =>
      api<ReadRootsState>(`/api/read-roots?path=${encodeURIComponent(dir)}`, {
        method: "DELETE",
      }),
    onSuccess: (next) => queryClient.setQueryData(readRootsKey, next),
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const roots = data?.roots ?? [];
  const pending = data?.pending ?? false;
  const error = share.error ?? revoke.error;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={
          roots.length === 0
            ? "Let the agent read a folder outside the project"
            : `${roots.length} shared folder${roots.length === 1 ? "" : "s"}`
        }
        className={cx(
          "flex h-8 items-center gap-1.5 rounded-full px-2 text-[0.786rem] transition-colors",
          "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
          open && "bg-surface-hover text-text-primary",
        )}
      >
        <FolderIcon className="size-[0.95rem] shrink-0" />
        <span>Folders</span>
        {roots.length > 0 && (
          <span className="rounded-full bg-accent-muted px-1.5 text-[0.714rem] tabular-nums text-accent">
            {roots.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cx(
            "absolute left-0 z-50 w-80 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[0_16px_50px_rgba(0,0,0,0.5)]",
            // In the editor the composer sits at the bottom of the panel, so
            // the menu opens upward; on the start screen there is room below.
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <p className="px-3 pb-1 pt-2.5 text-[0.72rem] uppercase tracking-wider text-text-tertiary">
            Folders the agent can read
          </p>

          {roots.length === 0 ? (
            <p className="px-3 pb-2 text-[0.786rem] leading-snug text-text-tertiary">
              {pending
                ? "Share a folder and the video you make next can draw on it — a brief, your brand files, an existing project."
                : "The agent only sees this project. Share a folder to let it read your brief, your brand files, or an existing project."}
            </p>
          ) : (
            roots.map((root) => (
              <div
                key={root.path}
                className="flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-surface-hover"
              >
                <FolderIcon className="size-4 shrink-0 text-text-tertiary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.929rem] text-text-primary">
                    {folderName(root.path)}
                  </span>
                  <span
                    className="block truncate text-[0.786rem] text-text-tertiary"
                    title={root.path}
                  >
                    {prettyPath(root.path)}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Stop sharing ${folderName(root.path)}`}
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(root.path)}
                  className="flex size-6 shrink-0 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-surface hover:text-text-primary"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            ))
          )}

          <button
            type="button"
            disabled={share.isPending}
            onClick={() => share.mutate()}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-[0.929rem] text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-60"
          >
            {share.isPending ? (
              <Spinner className="size-3.5" />
            ) : (
              <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-text-tertiary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
            {share.isPending ? "Choose a folder…" : "Share a folder…"}
          </button>

          <p className="border-t border-border px-3 py-2 text-[0.786rem] leading-snug text-text-tertiary">
            {pending && roots.length > 0
              ? "Shared with the project you create next. "
              : null}
            Read-only. The agent can never write outside the project folder, and
            never reads credential files like <code>.ssh</code> or{" "}
            <code>.env</code>.
          </p>

          {error && (
            <p className="border-t border-border px-3 py-2 text-[0.786rem] text-warning">
              {error instanceof Error ? error.message : "Couldn't update folders"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
