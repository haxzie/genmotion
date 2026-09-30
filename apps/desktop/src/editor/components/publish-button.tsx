"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL, api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { Button, Input, Spinner, cx } from "@/components/ui";
import { Modal } from "@/components/modal";
import type { GitCliStatus, GitJob, GitRepoStatus } from "../../../electron/shared";
import { GitHubMark } from "./github-mark";
import { api as desktop } from "../../api";

/**
 * Publish to GitHub, and keep it there.
 *
 * One control rather than two, because the two verbs are mutually exclusive
 * and the header row is narrow: a project that isn't on GitHub can only be
 * published, and one that is can only be synced. The label says which. A
 * permanently disabled second button would take the same space and tell the
 * user nothing.
 */

export function PublishButton({
  projectId,
  projectName,
  disabled,
}: {
  projectId: string;
  projectName: string;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<GitJob | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const statusKey = ["git-status", projectId];
  const { data: repo } = useQuery({
    queryKey: statusKey,
    queryFn: () =>
      api<GitRepoStatus>(`/api/git/status?projectId=${encodeURIComponent(projectId)}`),
    // Cheap — four local `git` calls, no network — but not free, and the
    // answer only changes when the folder does. So it is driven by the
    // watcher below rather than polled.
    staleTime: 3000,
    refetchOnWindowFocus: true,
  });

  // The folder changed: a scene written, an asset added, a commit made in a
  // terminal. Without this the button keeps whatever it last read — an agent
  // could write six scenes and it would still claim the project was up to
  // date until the window happened to regain focus.
  useEffect(() => {
    return desktop.onProjectChanged((next) => {
      if (next.dir !== projectId) return;
      void queryClient.invalidateQueries({ queryKey: ["git-status", projectId] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const published = Boolean(repo?.remoteUrl);
  const pending = (repo?.changedFiles ?? 0) + (repo?.ahead ?? 0);
  const running = job?.status === "running";

  // Live progress, the same named-event stream the export button uses.
  useEffect(() => {
    if (!job || job.status !== "running") return;
    const source = new EventSource(`${API_URL}/api/git/jobs/${job.id}/events`, {
      withCredentials: true,
    });
    source.addEventListener("progress", (event) => {
      const updated = JSON.parse((event as MessageEvent).data) as GitJob;
      setJob(updated);
      if (updated.status !== "running") {
        source.close();
        void queryClient.invalidateQueries({ queryKey: statusKey });
        // The publish may have written a README and repaired .gitignore.
        void queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      }
    });
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.status, projectId]);

  const syncNow = useMutation({
    mutationFn: () => api<GitJob>("/api/git/sync", { json: { projectId } }),
    onSuccess: (started) => {
      track("git_sync_started");
      setJob(started);
    },
    onError: (err: unknown) => {
      setJob({
        id: "local",
        kind: "sync",
        projectId,
        projectDir: projectId,
        status: "failed",
        step: "",
        progress: 0,
        createdAt: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const failed = job?.status === "failed";

  return (
    <div className="relative flex items-center">
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || running || syncNow.isPending}
        title={
          failed
            ? job?.error
            : published
              ? pending > 0
                ? `${pending} change${pending === 1 ? "" : "s"} to push`
                : `Up to date with ${repo?.remoteUrl}`
              : "Publish this project to GitHub"
        }
        onClick={() => {
          if (!published) {
            setOpen(true);
            return;
          }
          if (pending > 0 || failed) {
            syncNow.mutate();
            return;
          }
          if (repo?.remoteUrl) void desktop.openRepo(projectId);
        }}
        className={cx(failed && "text-danger")}
      >
        {running || syncNow.isPending ? (
          <Spinner className="size-3" />
        ) : (
          <GitHubMark className="size-3.5" />
        )}
        {/* The arrows say there is something to send, the label says what
            pressing will do, and the badge says how much. */}
        {published && !running && !failed && pending > 0 && (
          <SyncArrows className="size-3.5" />
        )}
        {running
          ? `${job?.progress ?? 0}%`
          : !published
            ? "Publish"
            : failed
              ? "Retry sync"
              : pending > 0
                ? "Sync changes"
                : null}
        {published && !running && !failed && pending > 0 && (
          // `min-w-4` with padding so a single digit is a circle and two are a
          // pill, rather than the badge changing shape per digit. Capped
          // because the header has a fixed width and a four-digit count would
          // push Export off the edge — past a hundred the exact number stops
          // being information anyway.
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-hover px-1 text-[0.7rem] font-medium tabular-nums text-text-secondary">
            {pending > 99 ? "99+" : pending}
          </span>
        )}
      </Button>

      {published && (
        <RepoMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          url={repo?.remoteUrl ?? null}
          onOpen={() => desktop.openRepo(projectId)}
          onUnlink={async () => {
            await api<GitRepoStatus>("/api/git/unlink", { json: { projectId } });
            setJob(null);
            void queryClient.invalidateQueries({ queryKey: statusKey });
          }}
        />
      )}

      {/* The failure of a Sync has nowhere else to go — the button itself is
          the whole interaction, and there is no dialog open to put a banner
          in. A line under the header is how the editor reports its other
          background failures (the HyperFrames compile bar). */}
      {failed && job?.kind === "sync" && (
        <div className="absolute right-0 top-9 z-20 w-80 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[0.786rem] text-danger shadow-lg">
          {job.error}
          <button
            type="button"
            onClick={() => setJob(null)}
            className="mt-1 block cursor-pointer text-[0.75rem] underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <PublishDialog
        open={open}
        onClose={() => setOpen(false)}
        projectId={projectId}
        projectName={projectName}
        job={job?.kind === "publish" ? job : null}
        onStarted={setJob}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function PublishDialog({
  open,
  onClose,
  projectId,
  projectName,
  job,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  job: GitJob | null;
  onStarted: (job: GitJob) => void;
}) {
  const [name, setName] = useState(() => slugify(projectName));
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [description, setDescription] = useState("");
  const [writeReadme, setWriteReadme] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The name follows the project until the user types their own.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) setName(slugify(projectName));
  }, [projectName]);

  const { data: cli, refetch: recheckCli } = useQuery({
    queryKey: ["git-cli"],
    queryFn: () => api<GitCliStatus>("/api/git/cli?fresh=1"),
    enabled: open,
    // The user fixes this in a terminal while this dialog is open, so a cached
    // "still missing" would outlive the problem.
    staleTime: 0,
  });

  const publish = useMutation({
    mutationFn: () =>
      api<GitJob>("/api/git/publish", {
        json: { projectId, name: name.trim(), visibility, description, writeReadme },
      }),
    onSuccess: (started) => {
      track("git_publish_started", { visibility });
      onStarted(started);
      setError(null);
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : String(err)),
  });

  const running = job?.status === "running";
  const done = job?.status === "done";
  const guidance = cli ? guidanceFor(cli) : null;

  return (
    <Modal open={open} onClose={onClose} dismissible={!running} labelledBy="publish-modal-title">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id="publish-modal-title" className="text-[1.05rem] font-semibold text-text-primary">
          Publish to GitHub
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
        {guidance ? (
          <div>
            <p className="text-[0.95rem] font-medium text-text-primary">{guidance.title}</p>
            <p className="mt-1 text-[0.786rem] text-text-secondary">
              GenMotion publishes through your own GitHub CLI, so it never holds a
              token of yours. Run this in a terminal, then check again.
            </p>
            <div className="mt-3 space-y-1 rounded-md border border-border bg-surface-raised px-3 py-2.5 font-mono text-[0.786rem] text-text-primary">
              {guidance.steps.map((step) => (
                <div key={step}>{step}</div>
              ))}
            </div>
          </div>
        ) : done ? (
          <div>
            <p className="text-[0.95rem] font-medium text-text-primary">Published.</p>
            <p className="mt-1 break-all text-[0.786rem] text-text-secondary">{job?.url}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[0.786rem] text-text-secondary">
                Repository name
              </span>
              <Input
                value={name}
                disabled={running}
                onChange={(e) => {
                  touched.current = true;
                  setName(e.target.value);
                }}
                placeholder="my-launch-film"
              />
              {cli?.login && (
                <span className="mt-1 block text-[0.75rem] text-text-tertiary">
                  github.com/{cli.login}/{slugify(name) || "…"}
                </span>
              )}
            </label>

            <div>
              <span className="mb-1.5 block text-[0.786rem] text-text-secondary">Visibility</span>
              <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                {(["public", "private"] as const).map((option) => {
                  const Icon = option === "public" ? GlobeIcon : LockIcon;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={running}
                      onClick={() => setVisibility(option)}
                      aria-pressed={visibility === option}
                      className={cx(
                        "inline-flex items-center gap-1.5 rounded px-3 py-1 text-[0.857rem] capitalize transition-colors duration-150",
                        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                        visibility === option
                          ? "bg-surface-hover text-text-primary"
                          : "text-text-secondary hover:text-text-primary",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[0.786rem] text-text-secondary">
                Description <span className="text-text-tertiary">(optional)</span>
              </span>
              <Input
                value={description}
                disabled={running}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A motion video, written as code."
              />
            </label>

            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={writeReadme}
                disabled={running}
                onChange={(e) => setWriteReadme(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span className="text-[0.786rem] text-text-secondary">
                Add a README, if this project hasn&apos;t got one
              </span>
            </label>

            {/* Said before the press, not after. The folder holds the whole
                conversation with the agent, and "public" has to mean something
                the user actually pictured. */}
            <p className="rounded-md border border-border bg-surface-raised px-3 py-2 text-[0.786rem] text-text-secondary">
              Your chat history, rendered exports and <code>node_modules</code> stay
              out of the repository.
            </p>

            {error && (
              <p className="max-h-24 overflow-y-auto rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[0.786rem] text-danger">
                {error}
              </p>
            )}
            {job?.status === "failed" && !error && (
              <p className="max-h-24 overflow-y-auto rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[0.786rem] text-danger">
                {job.error}
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
              style={{ width: `${Math.max(job?.progress ?? 0, 6)}%` }}
            />
            <div className="relative z-10 flex h-full items-center justify-center gap-2 text-[0.857rem] font-medium text-white">
              <Spinner className="size-3.5 text-white" />
              <span>{job?.step ?? "Working…"}</span>
            </div>
          </div>
        ) : guidance ? (
          <Button variant="primary" className="h-10 flex-1" onClick={() => void recheckCli()}>
            Check again
          </Button>
        ) : done ? (
          <Button
            variant="primary"
            className="h-10 flex-1"
            onClick={() => void desktop.openRepo(projectId)}
          >
            View on GitHub
          </Button>
        ) : (
          <Button
            variant="primary"
            className="h-10 flex-1"
            disabled={!name.trim() || publish.isPending}
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? "Starting…" : "Publish"}
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

/** The chevron beside a published project: where to find the repo, and how to forget it. */
function RepoMenu({
  open,
  onOpenChange,
  url,
  onOpen,
  onUnlink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  /** Hands off to the main process, which resolves the address itself. */
  onOpen: () => Promise<void>;
  onUnlink: () => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Repository options"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="ml-0.5 flex size-6 cursor-pointer items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
      >
        <svg viewBox="0 0 12 12" className="size-3" stroke="currentColor" strokeWidth="1.5" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-48 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
          <MenuItem
            onClick={() => {
              void onOpen();
              onOpenChange(false);
            }}
          >
            Open on GitHub
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (url) void navigator.clipboard.writeText(url);
              onOpenChange(false);
            }}
          >
            Copy repository URL
          </MenuItem>
          <MenuItem
            onClick={() => {
              void onUnlink();
              onOpenChange(false);
            }}
          >
            Unlink from GitHub
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full cursor-pointer px-3 py-1.5 text-left text-[0.857rem] text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

/**
 * What to tell the user when `gh` can't be used, and the command that fixes it.
 *
 * Mirrors `cliGuidance` in the main process. Kept in the renderer rather than
 * sent over the wire because it is presentation — the status itself is the
 * fact, and this is how it reads.
 */
function guidanceFor(cli: GitCliStatus): { title: string; steps: string[] } | null {
  if (!cli.git) return { title: "git isn't installed", steps: ["xcode-select --install"] };
  if (cli.gh === "missing") {
    return {
      title: "The GitHub CLI isn't installed",
      steps: ["brew install gh", "gh auth login"],
    };
  }
  if (cli.gh === "logged-out") {
    return { title: "The GitHub CLI isn't signed in", steps: ["gh auth login"] };
  }
  return null;
}

/**
 * The out-of-sync mark: one arrow up, one down.
 *
 * Up is what this app can actually act on — work here that GitHub hasn't got.
 * The down arrow is there because the pair is the shape people already read as
 * "sync" (a lone up arrow reads as upload), and because pressing the button
 * does rebase on whatever arrived, so incoming work is part of what happens.
 */
function SyncArrows({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 13V4M5 4L2.5 6.5M5 4l2.5 2.5" />
      <path d="M11 3v9M11 12l2.5-2.5M11 12l-2.5-2.5" />
    </svg>
  );
}

/**
 * The two visibilities, drawn rather than labelled twice.
 *
 * Public and private are the one choice in this dialog with a consequence the
 * user cannot take back by editing a field — a globe and a padlock are read
 * before the words are, which is the point.
 *
 * Inline, stroked, 16-unit box: the same construction as the dialog's close
 * button and the editor's view tabs. `lucide-react` is for agent-authored
 * scenes, not the app's own chrome.
 */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" />
      {/* The meridian: an ellipse squeezed flat, which is how a sphere's
          outline reads at this size without drawing the whole graticule. */}
      <ellipse cx="8" cy="8" rx="2.6" ry="6" />
      <path d="M2.3 6h11.4M2.3 10h11.4" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.6" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeLinecap="round" />
    </svg>
  );
}

/** A project name as a repository name. GitHub allows more than this; this is what reads well. */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
