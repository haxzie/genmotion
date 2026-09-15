import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button, Spinner } from "@/components/ui";
import { ASPECT_RATIOS } from "@/components/editor/composer";
import { CommandLineHint, useCommandLine } from "../../components/command-line";
import { hasUpdate, useUpdate } from "../../lib/use-update";
import { api as desktop } from "../../api";
import type { DesktopPaths } from "../../../electron/shared";
import { Choices, Section } from "./section";

interface ProjectDefaults {
  width: number;
  height: number;
  fps: number;
}

const FPS_CHOICES = [24, 30, 60] as const;

/**
 * What a new project starts as.
 *
 * The composer already asks for an aspect on the way in; this is the one it
 * opens with, plus the frame rate, which nothing else asks about.
 */
export function DefaultsSection() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => api<ProjectDefaults>("/api/preferences"),
  });

  const save = useMutation({
    mutationFn: (next: Partial<ProjectDefaults>) =>
      api<ProjectDefaults>("/api/preferences", { json: next }),
    onSuccess: (next) => queryClient.setQueryData(["preferences"], next),
  });

  if (!data) {
    return (
      <Section title="New projects">
        <Spinner className="size-4 text-text-tertiary" />
      </Section>
    );
  }

  return (
    <Section title="New projects" description="What the composer opens with.">
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 text-[0.857rem] text-text-secondary">Aspect ratio</div>
          <Choices
            options={[...ASPECT_RATIOS]}
            label={(ratio) => ratio.label}
            isActive={(ratio) => ratio.width === data.width && ratio.height === data.height}
            onPick={(ratio) => save.mutate({ width: ratio.width, height: ratio.height })}
          />
        </div>
        <div>
          <div className="mb-2 text-[0.857rem] text-text-secondary">Frame rate</div>
          <Choices
            options={[...FPS_CHOICES]}
            label={(fps) => `${fps}fps`}
            isActive={(fps) => fps === data.fps}
            onPick={(fps) => save.mutate({ fps })}
          />
        </div>
      </div>
    </Section>
  );
}

export function ProjectsFolderSection() {
  const { data } = useQuery({
    queryKey: ["paths"],
    queryFn: (): Promise<DesktopPaths> => desktop.paths(),
  });

  return (
    <Section
      title="Projects folder"
      description="Where the app puts a project. Creating one never asks — a prompt is enough."
    >
      <div className="flex items-center gap-3">
        <code className="min-w-0 flex-1 truncate rounded border border-border bg-background px-2.5 py-1.5 font-mono text-[0.786rem] text-text-secondary">
          {data?.projectsRoot ?? "…"}
        </code>
        <Button
          size="sm"
          disabled={!data}
          onClick={() => data && void desktop.revealPath(data.projectsRoot)}
        >
          Reveal
        </Button>
      </div>
    </Section>
  );
}

export function CommandLineSection() {
  const { cli, installing, ready, install, label } = useCommandLine();
  if (!cli?.supported) return null;

  return (
    <Section
      title="Command line"
      description="Open a folder straight into the app from your shell."
    >
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={ready || installing} onClick={install}>
          {installing && <Spinner className="size-3.5" />}
          {label}
        </Button>
      </div>
      <CommandLineHint cli={cli} ready={ready} className="mt-2" />
    </Section>
  );
}

export function UpdatesSection() {
  const update = useUpdate();
  const checking = update.status === "checking";

  return (
    <Section title="Updates">
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={checking} onClick={() => void desktop.update.check()}>
          {checking && <Spinner className="size-3.5" />}
          {checking ? "Checking…" : "Check for updates"}
        </Button>
        <span className="text-[0.857rem] text-text-tertiary">
          {update.status === "error"
            ? update.message
            : hasUpdate(update)
              ? `GenMotion ${"version" in update ? update.version : ""} ${
                  update.status === "ready" ? "is ready to install" : "is available"
                }`
              : checking
                ? ""
                : "You’re up to date."}
        </span>
      </div>
    </Section>
  );
}

