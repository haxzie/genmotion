import { useState } from "react";
import { HarnessStep } from "./harness-step";
import { IntegrationsStep } from "./integrations-step";

/**
 * What a new install sees once it is signed in, before the start screen.
 *
 * Two things have to be true before GenMotion can make anything: a coding
 * agent to write the scenes, and — optionally but nearly always — somewhere to
 * get a voice and an image from. Both are machine-level settings that already
 * have homes in the app (the composer's picker, the Marketplace tab); this is
 * the one place they are put in front of someone rather than waited for.
 *
 * Which step is showing is component state, deliberately: the walkthrough is
 * one sitting, and a half-finished one has nothing worth restoring. The only
 * thing that outlives it is the flag that says it happened — and everything it
 * sets up was written the moment it was chosen, so a quit in the middle keeps
 * the agent and the servers and simply offers the walkthrough again.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"harness" | "integrations">("harness");

  return step === "harness" ? (
    <HarnessStep onDone={() => setStep("integrations")} />
  ) : (
    <IntegrationsStep onDone={onDone} />
  );
}
