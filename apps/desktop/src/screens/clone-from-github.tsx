import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Input, Spinner } from "@/components/ui";
import { Modal } from "@/components/modal";
import { api as loopback } from "@/lib/api";
import { track } from "@/lib/analytics";
import { GitHubMark } from "../editor/components/github-mark";
import { api, type DesktopProject } from "../api";
import type { GitCliStatus } from "../../electron/shared";

/**
 * Open a project that lives on GitHub.
 *
 * The counterpart to Publish, and the reason a published project is worth
 * anything: the same folder, on another machine, in one paste.
 *
 * A repository that is already a GenMotion project opens as itself. One that
 * isn't is set up in place — nothing it already has is overwritten — so
 * pointing this at an ordinary repo is a way to start a video *about* that
 * repo, with the code sitting next to the composition.
 */
export function CloneFromGitHub({ onCloned }: { onCloned: (project: DesktopProject) => void }) {
  const [open, setOpen] = useState(false);

  // File ▸ Open from GitHub. The menu lives in the main process and has no way
  // to reach into a component's state; `App` brings Home to the front and then
  // fires this.
  useEffect(() => {
    const onRequest = () => setOpen(true);
    window.addEventListener("gm:open-clone", onRequest);
    return () => window.removeEventListener("gm:open-clone", onRequest);
  }, []);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <GitHubMark className="size-3.5" />
        Open from GitHub
      </Button>
      {open && <CloneDialog onClose={() => setOpen(false)} onCloned={onCloned} />}
    </>
  );
}

function CloneDialog({
  onClose,
  onCloned,
}: {
  onClose: () => void;
  onCloned: (project: DesktopProject) => void;
}) {
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: cli, refetch: recheckCli } = useQuery({
    queryKey: ["git-cli"],
    queryFn: () => loopback<GitCliStatus>("/api/git/cli?fresh=1"),
    staleTime: 0,
  });
  const guidance = cli ? guidanceFor(cli) : null;

  const clone = useMutation({
    mutationFn: (value: string) => api.cloneProject(value),
    onSuccess: (project) => {
      track("project_cloned");
      onCloned(project);
      onClose();
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : String(err)),
  });

  const submit = () => {
    if (!source.trim() || clone.isPending) return;
    setError(null);
    clone.mutate(source.trim());
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!clone.isPending}
      labelledBy="clone-modal-title"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id="clone-modal-title" className="text-[1.05rem] font-semibold text-text-primary">
          Open from GitHub
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
              GenMotion clones through your own GitHub CLI, so private repositories
              you have access to just open. Run this in a terminal, then check again.
            </p>
            <div className="mt-3 space-y-1 rounded-md border border-border bg-surface-raised px-3 py-2.5 font-mono text-[0.786rem] text-text-primary">
              {guidance.steps.map((step) => (
                <div key={step}>{step}</div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1.5 block text-[0.786rem] text-text-secondary">
                Repository
              </span>
              <Input
                autoFocus
                value={source}
                disabled={clone.isPending}
                onChange={(e) => setSource(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="owner/name or https://github.com/owner/name"
              />
            </label>
            <p className="mt-2 text-[0.75rem] text-text-tertiary">
              A repository that isn&apos;t a GenMotion project yet is set up as one,
              without changing any file it already has.
            </p>
            {error && (
              <p className="mt-3 max-h-24 overflow-y-auto rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[0.786rem] text-danger">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2.5 border-t border-border px-5 py-4">
        <Button
          variant="secondary"
          className="h-10 px-4"
          disabled={clone.isPending}
          onClick={onClose}
        >
          Cancel
        </Button>
        {guidance ? (
          <Button variant="primary" className="h-10 flex-1" onClick={() => void recheckCli()}>
            Check again
          </Button>
        ) : (
          <Button
            variant="primary"
            className="h-10 flex-1"
            disabled={!source.trim() || clone.isPending}
            onClick={submit}
          >
            {clone.isPending ? (
              <>
                <Spinner className="size-3.5 text-background" />
                Cloning…
              </>
            ) : (
              "Open"
            )}
          </Button>
        )}
      </div>
    </Modal>
  );
}

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
