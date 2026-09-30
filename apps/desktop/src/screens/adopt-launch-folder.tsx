import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Spinner } from "@/components/ui";
import { api, type DesktopProject } from "../api";

/**
 * "You started the app in a folder that isn't a project yet."
 *
 * This is the other half of cloning. Somebody who already has a repository
 * checked out — their own product, a library they want a video about, a
 * GenMotion project a colleague published — runs `genmotion .` in it, and
 * today that only shares the folder with the agent. Offering to set it up
 * turns the folder they are already standing in into somewhere they can work,
 * without moving anything or cloning it a second time.
 *
 * Nothing already in the folder is overwritten: the scaffold runs in adopt
 * mode, which writes only the files that aren't there. A repo keeps its
 * README, its package.json and its history.
 */
export function AdoptLaunchFolder({ onAdopted }: { onAdopted: (project: DesktopProject) => void }) {
  const [dir, setDir] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let live = true;
    const consider = (context: { dir: string | null; isProject: boolean }) => {
      if (!live) return;
      // A folder that is already a project opens itself — `App` does that. The
      // only interesting case is a folder that isn't one.
      setDir(context.dir && !context.isProject ? context.dir : null);
      setDismissed(false);
    };
    void api.launchContext().then(consider);
    // The same command run again while the app is up.
    const off = api.onLaunchContext(consider);
    return () => {
      live = false;
      off();
    };
  }, []);

  const adopt = useMutation({
    mutationFn: (folder: string) => api.adoptProject(folder),
    onSuccess: onAdopted,
  });

  if (!dir || dismissed) return null;

  const name = dir.split("/").filter(Boolean).at(-1) ?? dir;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[0.95rem] text-text-primary">
          Work in <span className="font-medium">{name}</span>?
        </p>
        <p className="mt-0.5 truncate text-[0.786rem] text-text-tertiary" title={dir}>
          {adopt.error
            ? adopt.error instanceof Error
              ? adopt.error.message
              : String(adopt.error)
            : `${dir} — nothing already in it is changed.`}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={() => setDismissed(true)}>
        Not now
      </Button>
      <Button
        variant="primary"
        size="sm"
        disabled={adopt.isPending}
        onClick={() => adopt.mutate(dir)}
      >
        {adopt.isPending && <Spinner className="size-3 text-background" />}
        {adopt.isPending ? "Setting up…" : "Set up as a project"}
      </Button>
    </div>
  );
}
