"use client";

import { useEffect, useState } from "react";
import { API_URL, api as http } from "@/lib/api";
import { Button, Input, Spinner, cx } from "@/components/ui";
import { Modal } from "@/components/modal";
import type { DesktopExportJob, ShareJob } from "../../../electron/shared";
import type { SharedVideo } from "../../tabs/use-shares";

/**
 * Share, and the link once there is one — the trailing control on a row in the
 * Exports list.
 *
 * Sharing lives here rather than beside Export in the editor because what gets
 * shared is a finished file. In the editor there is nothing to publish yet;
 * in this list every row is a video that exists, and the only question is
 * whether it has a link.
 */
export function ShareAction({
  job,
  share,
  variant = "text",
  onChanged,
  onRemoved,
  onRequestShare,
}: {
  job: DesktopExportJob;
  /** The existing share for this export, if it has one. */
  share: SharedVideo | undefined;
  /**
   * `icon` for the tab-strip panel, which is a narrow popover with no room for
   * words. It also drops Unshare: taking a video off the web is not something
   * to put one mis-click away in a hover panel, and the Exports page and the
   * web app both carry it.
   */
  variant?: "text" | "icon";
  onChanged: () => void;
  /** Only the `text` variant offers Unshare, so the icon one need not supply this. */
  onRemoved?: (share: SharedVideo) => Promise<void>;
  /**
   * `icon` only: asks the owner to open the dialog, rather than rendering one
   * here. A `Modal` portals to `document.body`, so a dialog owned by a row
   * inside a popover is a dialog whose state dies the moment that popover
   * re-renders — which is what happened: the upload completed while the dialog
   * it belonged to had already been reset.
   */
  onRequestShare?: (job: DesktopExportJob) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  // Only a finished file can be shared. A render still going, one that failed,
  // or one whose file has been moved has nothing to upload.
  if (job.status !== "done" || job.fileMissing) return null;

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          title={share ? `Copy link — ${share.url}` : "Share this video"}
          aria-label={share ? "Copy link" : "Share"}
          onClick={(event) => {
            // The row itself reveals the file in Finder; these sit on top of it.
            event.stopPropagation();
            if (share) {
              void navigator.clipboard.writeText(share.url);
              setCopied(true);
              return;
            }
            onRequestShare?.(job);
          }}
          className={cx(
            "flex size-7 items-center justify-center rounded transition-colors",
            copied
              ? "text-green"
              : "text-text-tertiary hover:bg-surface-raised hover:text-text-primary",
          )}
        >
          {share ? (
            copied ? <CheckGlyph className="size-4" /> : <LinkGlyph className="size-4" />
          ) : (
            <ShareGlyph className="size-4" />
          )}
        </button>
      </>
    );
  }

  if (share) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(share.url);
            setCopied(true);
          }}
          title={share.url}
          className={cx(
            "rounded-md px-3 py-1.5 transition-colors",
            copied
              ? "text-green"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
          )}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md px-3 py-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-danger"
        >
          Unshare
        </button>
        {confirming && (
          <UnshareDialog
            share={share}
            onClose={() => setConfirming(false)}
            onConfirm={async () => {
              await onRemoved?.(share);
              setConfirming(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md px-3 py-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
      >
        Share
      </button>
      {open && (
        <ShareDialog
          job={job}
          onClose={() => setOpen(false)}
          onShared={() => setOpen(false)}
          onCompleted={onChanged}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

/**
 * The compact controls. Inline SVG, matching the editor's other hand-rolled
 * icons — `lucide-react` is for agent-authored scenes, not the app's chrome.
 */
function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

function LinkGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ShareDialog({
  job,
  onClose,
  onShared,
  onCompleted,
}: {
  job: DesktopExportJob;
  onClose: () => void;
  onShared: () => void;
  /**
   * The link now exists.
   *
   * Fired when the job finishes, not when a button is pressed. Hanging the
   * list refresh off "View page" meant that closing the dialog instead — the
   * ordinary thing to do once you have copied the link — left every list still
   * offering "Share" for a video that was already published.
   */
  onCompleted?: () => void;
}) {
  const [title, setTitle] = useState(job.projectName);
  const [description, setDescription] = useState("");
  const [shareJob, setShareJob] = useState<ShareJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const running = shareJob?.status === "running";
  const done = shareJob?.status === "done";

  // Progress over SSE, the same named-event stream export and publish use.
  useEffect(() => {
    if (!shareJob || shareJob.status !== "running") return;
    const source = new EventSource(`${API_URL}/api/share/jobs/${shareJob.id}/events`, {
      withCredentials: true,
    });
    source.addEventListener("progress", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as ShareJob;
      setShareJob(next);
      if (next.status !== "running") source.close();
      if (next.status === "done") onCompleted?.();
    });
    return () => source.close();
  }, [shareJob?.id, shareJob?.status]);

  async function start() {
    setError(null);
    try {
      const started = await http<ShareJob>("/api/share", {
        json: { exportId: job.id, projectDir: job.projectDir, title: title.trim(), description },
      });
      setShareJob(started);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal open onClose={onClose} dismissible={!running} labelledBy="share-modal-title">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id="share-modal-title" className="text-[1.05rem] font-semibold text-text-primary">
          Share this video
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <svg viewBox="0 0 14 14" className="size-3.5" stroke="currentColor" strokeWidth="1.6" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-4">
        {done ? (
          <div>
            <p className="text-[0.95rem] font-medium text-text-primary">Your link is ready.</p>
            <p className="mt-2 break-all rounded-md border border-border bg-surface-raised px-3 py-2 font-mono text-[0.786rem] text-text-secondary">
              {shareJob?.url}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[0.786rem] text-text-secondary">Title</span>
              <Input
                value={title}
                disabled={running}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is this video?"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[0.786rem] text-text-secondary">
                Description <span className="text-text-tertiary">(optional)</span>
              </span>
              <Input
                value={description}
                disabled={running}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A line about it."
              />
            </label>

            {/* Said before the press. "Share" reads as "send to a friend" to
                most people, and this is a page on the open web with their name
                on it — which is not a thing to discover afterwards. */}
            <p className="rounded-md border border-border bg-surface-raised px-3 py-2 text-[0.786rem] text-text-secondary">
              This publishes the video to a public page with your name on it. Anyone
              with the link can watch it, and it may appear in search results. Your
              project files are not uploaded — only the video.
            </p>

            {(error || shareJob?.status === "failed") && (
              <p className="max-h-24 overflow-y-auto rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[0.786rem] text-danger">
                {error ?? shareJob?.error}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 border-t border-border px-5 py-4">
        <Button variant="secondary" className="h-10 px-4" disabled={running} onClick={onClose}>
          {done ? "Close" : "Cancel"}
        </Button>

        {running ? (
          <div
            className="relative h-10 flex-1 overflow-hidden rounded-lg bg-surface-raised"
            aria-live="polite"
          >
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-all duration-500 ease-out"
              style={{ width: `${Math.max(shareJob?.progress ?? 0, 6)}%` }}
            />
            <div className="relative z-10 flex h-full items-center justify-center gap-2 text-[0.857rem] font-medium text-white">
              <Spinner className="size-3.5 text-white" />
              <span>{shareJob?.step ?? "Working…"}</span>
            </div>
          </div>
        ) : done ? (
          <>
            <Button
              variant="secondary"
              className="h-10 px-4"
              onClick={() => shareJob?.url && void navigator.clipboard.writeText(shareJob.url)}
            >
              Copy link
            </Button>
            <Button
              variant="primary"
              className="h-10 flex-1"
              onClick={() => {
                if (shareJob?.url) window.open(shareJob.url, "_blank", "noopener");
                onShared();
              }}
            >
              View page
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            className="h-10 flex-1"
            disabled={!title.trim()}
            onClick={() => void start()}
          >
            {shareJob?.status === "failed" ? "Try again" : "Share"}
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function UnshareDialog({
  share,
  onClose,
  onConfirm,
}: {
  share: SharedVideo;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal open onClose={onClose} dismissible={!busy} labelledBy="unshare-modal-title">
      <div className="px-5 py-5">
        <h2 id="unshare-modal-title" className="text-[1.05rem] font-semibold text-text-primary">
          Remove this video from the web?
        </h2>
        <p className="mt-2 text-[0.857rem] text-text-secondary">
          The link stops working and the video is deleted from our servers. Your
          exported file stays on this Mac.
        </p>
        {/* The part people do not expect. A page that has been indexed does not
            leave a search engine the moment it stops resolving, and not saying
            so turns a slow de-index into a bug report. */}
        <p className="mt-2 text-[0.786rem] text-text-tertiary">
          Search engines may keep showing it for a while after it is gone.
        </p>
      </div>
      <div className="flex items-center gap-2.5 border-t border-border px-5 py-4">
        <Button variant="secondary" className="h-10 flex-1" disabled={busy} onClick={onClose}>
          Keep it
        </Button>
        <Button
          variant="danger"
          className="h-10 flex-1 border-danger/30 bg-danger/10"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void onConfirm().finally(() => setBusy(false));
          }}
        >
          {busy ? "Removing…" : "Remove"}
        </Button>
      </div>
    </Modal>
  );
}
