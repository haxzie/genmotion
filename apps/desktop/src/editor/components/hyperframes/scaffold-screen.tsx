"use client";

import { AnimatePresence, motion } from "motion/react";
import { cx } from "@/components/ui";
import type { ScaffoldState } from "../../../../electron/shared";

/**
 * What the preview pane shows while a new project is being set up.
 *
 * The composition already plays underneath — the scaffold is complete
 * before the install starts — but a preview that appears and then reloads
 * as packages land reads as broken. So while the install runs, the preview
 * and the timeline step aside for this: one indicator, and under it what is
 * happening in the background, step by step. It gives way to the editor the
 * moment the install settles; a failure goes back to the banner, which has
 * the retry.
 */

type Phase = "done" | "active" | "todo";

interface Step {
  label: string;
  phase: Phase;
}

/** The steps as the user reads them, from the install's state. */
function steps(state: ScaffoldState, engineLabel: string): Step[] {
  const resolving = state.step === "resolving";
  return [
    { label: "Project scaffolded", phase: "done" },
    { label: "Agent skills linked", phase: "done" },
    {
      label: resolving
        ? `Checking npm for the latest ${engineLabel} release`
        : `${engineLabel} ${"version" in state ? state.version : ""} found`.trim(),
      phase: resolving ? "active" : "done",
    },
    {
      label: "Installing the project's packages",
      phase: state.step === "installing" ? "active" : "todo",
    },
  ];
}

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Three rings on their own clocks around the engine's mark. Each is a
 * dashed arc rather than a spinner: the gaps drift past each other, so the
 * whole thing reads as something turning over rather than something stuck.
 */
function Rings({ mark }: { mark: string }) {
  const ring = (r: number, dash: number, duration: number, reverse = false, opacity = 1) => (
    <motion.circle
      cx="60"
      cy="60"
      r={r}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray={`${dash} ${2 * Math.PI * r - dash}`}
      style={{ opacity, transformOrigin: "60px 60px" }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, ease: "linear", repeat: Infinity }}
    />
  );
  return (
    <div className="relative size-[120px] text-accent">
      <svg viewBox="0 0 120 120" className="absolute inset-0 size-full">
        {ring(56, 210, 6)}
        {ring(46, 120, 4.2, true, 0.55)}
        {ring(36, 60, 2.8, false, 0.35)}
      </svg>
      <motion.img
        src={mark}
        alt=""
        aria-hidden
        className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-md"
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
}

export function ScaffoldScreen({
  state,
  engineLabel,
  mark,
}: {
  state: ScaffoldState;
  /** "HyperFrames" or "GenMotion" — which runtime is being fetched. */
  engineLabel: string;
  /** The engine's icon, for the middle of the rings. */
  mark: string;
}) {
  const list = steps(state, engineLabel);
  const active = list.find((s) => s.phase === "active");

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7 px-6">
      <Rings mark={mark} />
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-lg text-text-primary">Setting up your project</p>
        {/* The current step, swapped with a small slide so a change is seen
            rather than only read. */}
        <div className="relative h-5 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={active?.label ?? "done"}
              className="text-[0.929rem] text-text-secondary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {active?.label ?? "Almost there"}…
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <ul className="flex w-full max-w-xs flex-col gap-1.5">
        {list.map((step) => (
          <li
            key={step.label}
            className={cx(
              "flex items-center gap-2.5 text-[0.857rem] transition-colors",
              step.phase === "done" && "text-text-tertiary",
              step.phase === "active" && "text-text-primary",
              step.phase === "todo" && "text-text-tertiary/60",
            )}
          >
            <span className="flex size-4 shrink-0 items-center justify-center">
              {step.phase === "done" ? (
                <Check className="size-3.5 text-success" />
              ) : step.phase === "active" ? (
                <motion.span
                  className="size-2 rounded-full bg-accent"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                />
              ) : (
                <span className="size-1.5 rounded-full bg-border-strong" />
              )}
            </span>
            <span className="truncate">{step.label}</span>
          </li>
        ))}
      </ul>
      <p className="max-w-sm text-center text-[0.786rem] leading-snug text-text-tertiary">
        The agent can already start on your video. The preview appears once the
        packages are in.
      </p>
    </div>
  );
}
