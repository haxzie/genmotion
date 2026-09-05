import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button, Spinner, cx } from "@/components/ui";
import { ASPECT_RATIOS } from "@/components/editor/composer";
import { useHarness } from "../lib/use-harness";
import { CommandLineHint, useCommandLine } from "../components/command-line";
import { hasUpdate, useUpdate } from "../lib/use-update";
import { api as desktop } from "../api";
import type { AuthOrganization, AuthUser, DesktopPaths } from "../../electron/shared";

interface ProjectDefaults {
  width: number;
  height: number;
  fps: number;
}

const FPS_CHOICES = [24, 30, 60] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-surface-raised p-5">
      <h2 className="text-[1.05rem] font-medium text-text-primary">{title}</h2>
      {description && (
        <p className="mt-1 text-[0.857rem] leading-snug text-text-tertiary">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A row of mutually exclusive choices, styled like the editor's segmented tabs. */
function Choices<T>({
  options,
  isActive,
  onPick,
  label,
}: {
  options: T[];
  isActive: (option: T) => boolean;
  onPick: (option: T) => void;
  label: (option: T) => string;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
      {options.map((option) => (
        <button
          key={label(option)}
          type="button"
          onClick={() => onPick(option)}
          aria-pressed={isActive(option)}
          className={cx(
            "rounded px-3 py-1 text-[0.857rem] transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            isActive(option)
              ? "bg-surface-hover text-text-primary"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {label(option)}
        </button>
      ))}
    </div>
  );
}

/**
 * The agent driving the chat.
 *
 * The composer's picker is a dropdown because it sits in a toolbar; here there
 * is room to show every model with its harness's state, including a harness
 * this machine does not have — "install the Codex CLI" is more useful than an
 * absence.
 */
function AgentSection() {
  const { state, choose } = useHarness();

  if (!state) {
    return (
      <Section title="Agent">
        <Spinner className="size-4 text-text-tertiary" />
      </Section>
    );
  }

  return (
    <Section
      title="Agent"
      description="Which coding agent writes your scenes, and the model it runs on. Both lists come from the harnesses themselves, so a model released this week shows up without an update of ours."
    >
      <div className="flex flex-col gap-4">
        {state.options.map((harness) => {
          const models = state.models.filter((m) => m.harness === harness.id);
          const locked = !harness.supported || !harness.installed;
          return (
            <div key={harness.id}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-[0.929rem] text-text-primary">{harness.label}</span>
                {harness.version && (
                  <span className="text-[0.786rem] text-text-tertiary">{harness.version}</span>
                )}
                {locked && (
                  <span className="text-[0.786rem] text-warning">
                    {harness.unavailableReason}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {models.map((model) => {
                  const active =
                    state.active === harness.id && state.activeModel === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      disabled={locked || choose.isPending}
                      onClick={() => !active && choose.mutate(model)}
                      title={model.detail}
                      className={cx(
                        "rounded-md border px-2.5 py-1 text-[0.857rem] transition-colors duration-150",
                        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                        "disabled:cursor-default disabled:opacity-50",
                        active
                          ? "border-accent/50 bg-accent-muted text-accent"
                          : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
                      )}
                    >
                      {model.label}
                    </button>
                  );
                })}
                {models.length === 0 && (
                  <span className="text-[0.857rem] text-text-tertiary">No models reported.</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/**
 * What a new project starts as.
 *
 * The composer already asks for an aspect on the way in; this is the one it
 * opens with, plus the frame rate, which nothing else asks about.
 */
function DefaultsSection() {
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

function ProjectsFolderSection() {
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

function CommandLineSection() {
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

function UpdatesSection() {
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

function AccountSection({
  user,
  organization,
}: {
  user: AuthUser;
  organization: AuthOrganization | null;
}) {
  return (
    <Section
      title="Account"
      description="Billing and team settings live on the web — there is no checkout in here, and those pages need the browser's session."
    >
      <div className="mb-4">
        <div className="text-[0.929rem] text-text-primary">{user.name || user.email}</div>
        <div className="text-[0.786rem] text-text-tertiary">{user.email}</div>
        {organization && (
          <div className="mt-1 text-[0.786rem] text-text-tertiary">{organization.name}</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void desktop.openWeb("/settings")}>
          Account settings
        </Button>
        <Button size="sm" onClick={() => void desktop.openWeb("/settings/billing")}>
          Billing
        </Button>
        <Button size="sm" variant="danger" onClick={() => void desktop.auth.signOut()}>
          Sign out
        </Button>
      </div>
    </Section>
  );
}

/**
 * The app's own settings.
 *
 * These used to be scattered: the harness in a composer accessory, the shell
 * command in an avatar dropdown, the frame rate nowhere at all. Folder grants
 * are deliberately *not* here — a read root is granted per project and cleared
 * when that project is deleted, so a machine-wide page is the wrong home for
 * them and they stay in the composer.
 */
export function Settings({
  user,
  organization,
}: {
  user: AuthUser;
  organization: AuthOrganization | null;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <h1 className="mb-6 font-display text-2xl tracking-tight">Settings</h1>
        <div className="flex flex-col gap-4">
          <AgentSection />
          <DefaultsSection />
          <ProjectsFolderSection />
          <CommandLineSection />
          <UpdatesSection />
          <AccountSection user={user} organization={organization} />
        </div>
      </div>
    </div>
  );
}
