import { Spinner, cx } from "@/components/ui";
import { useHarness } from "../../lib/use-harness";
import { Section } from "./section";

/**
 * The agent driving the chat.
 *
 * The composer's picker is a dropdown because it sits in a toolbar; here there
 * is room to show every model with its harness's state, including a harness
 * this machine does not have — "install the Codex CLI" is more useful than an
 * absence.
 */
export function AgentSection() {
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

