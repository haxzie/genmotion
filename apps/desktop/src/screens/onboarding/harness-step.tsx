import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { HARNESS_CATALOG } from "../../../electron/agent/harness-catalog";
import { HarnessTile } from "../../components/harness-icon";
import { useHarness, type HarnessId } from "../../lib/use-harness";
import { useOnboarding } from "../../lib/use-onboarding";
import { DoneBadge, OnboardingRow, OnboardingStep, PendingNote } from "./layout";

/**
 * Step one: which coding agent writes the videos.
 *
 * GenMotion doesn't ship a model — it drives the agent CLI the user already
 * pays for — so this is the one step that can leave the app unable to do
 * anything at all. Continue is held until at least one agent is installed,
 * rather than letting someone arrive at an empty composer that can't answer.
 *
 * The rows are the catalog's, not the harness state's: the ones we have
 * announced but can't drive yet say so here, which is the honest version of
 * leaving them out and being asked where they went.
 */
export function HarnessStep({ onDone }: { onDone: () => void }) {
  const { state, choose } = useHarness();
  const { install } = useOnboarding();
  /** Per-row install failures — a global error line couldn't say which row. */
  const [errors, setErrors] = useState<Record<string, string>>({});

  const installed = (id: string) => state?.options.find((o) => o.id === id)?.installed === true;
  const anyInstalled = HARNESS_CATALOG.some((h) => installed(h.id));

  /**
   * Make this the agent the chat runs on, on whichever model it reports.
   *
   * The empty id is "let the harness choose its default", which is also what
   * no stored model means — right for a walkthrough, where the model is the
   * composer's business and not a decision to put in someone's first minute.
   */
  const selectHarness = (id: string) => {
    const harness = id as HarnessId;
    const model = state?.models.find((m) => m.harness === harness && m.id === "");
    choose.mutate(model ?? { id: "", label: "Default", version: null, detail: "", harness });
  };

  async function doInstall(id: string) {
    setErrors((current) => ({ ...current, [id]: "" }));
    try {
      const result = await install.mutateAsync(id);
      if (!result.ok) {
        setErrors((current) => ({ ...current, [id]: result.error ?? "Install failed." }));
        return;
      }
      // Installing one is choosing it: nobody installs an agent they then
      // have to go and select. A harness already there keeps its row, and
      // picking it is the row click instead.
      selectHarness(id);
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [id]: err instanceof Error ? err.message : "Install failed.",
      }));
    }
  }

  return (
    <OnboardingStep
      title="Pick your default coding agent"
      hint={anyInstalled ? "You can always install more later" : "Install one agent to continue"}
      action="Continue"
      onAction={onDone}
      actionDisabled={!anyInstalled}
      rows={HARNESS_CATALOG.map((harness) => {
        const here = installed(harness.id);
        const busy = install.isPending && install.variables === harness.id;
        const active = state?.active === harness.id;
        return (
          <OnboardingRow
            key={harness.id}
            icon={<HarnessTile id={harness.id} />}
            name={harness.label}
            // The vendor's address, not the version string: this row is a
            // choice between products, and `claude --version` prints
            // "2.1.292 (Claude Code)", which says the name twice and the
            // useful part once. Settings › Agent is where versions live.
            subtitle={harness.homepage.replace(/^https:\/\//, "")}
            note={errors[harness.id] || null}
            selected={active && here}
            // Only an installed agent we can drive is a choice; the rest of
            // the rows have nothing for a click to mean.
            {...(here && harness.supported
              ? { onSelect: () => !active && selectHarness(harness.id) }
              : {})}
            action={
              !harness.supported ? (
                <PendingNote>Coming soon</PendingNote>
              ) : here ? (
                <DoneBadge>{active ? "Default" : "Installed"}</DoneBadge>
              ) : (
                <Button
                  variant="primary"
                  className="h-8 rounded-full px-4"
                  disabled={install.isPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    void doInstall(harness.id);
                  }}
                >
                  {busy ? <Spinner className="size-3.5" /> : null}
                  {busy ? "Installing…" : "Install"}
                </Button>
              )
            }
          />
        );
      })}
    >
      <p>GenMotion uses the coding agents installed on your system, and your existing subscription.</p>
      <p className="text-[0.929rem] text-text-tertiary">
        Installing one runs <code className="font-mono">npm install -g</code> for you. Sign in to it
        from your terminal afterwards, the way you would anywhere else.
      </p>
    </OnboardingStep>
  );
}
