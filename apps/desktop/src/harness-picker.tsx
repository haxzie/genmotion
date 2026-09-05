import { useEffect, useRef, useState } from "react";
import { cx, Spinner } from "@/components/ui";
import { useHarness, type AgentModel, type HarnessId } from "./lib/use-harness";

/**
 * Claude Code's mark, from simple-icons (CC0). Inlined rather than pulling in
 * the package for one path — 3,453 icons is a lot of bundle for one glyph.
 */
const CLAUDE_PATH =
  "M21 10.5h3v3h-3v3h-1.5v3H18v-3h-1.5v3H15v-3H9v3H7.5v-3H6v3H4.5v-3H3v-3H0v-3h3v-6h18Zm-15 0h1.5v-3H6Zm10.5 0H18v-3h-1.5z";

function HarnessIcon({ id, className }: { id: HarnessId; className?: string }) {
  if (id === "claude-code") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="#D97757" aria-hidden>
        <path d={CLAUDE_PATH} />
      </svg>
    );
  }
  if (id === "codex") {
    // OpenAI ships no public SVG of this mark and it isn't in the icon set we
    // use, so the glyph is the template image from the installed Codex app —
    // the same monochrome mark it puts in the macOS menu bar. Painted through
    // a mask so it inherits `currentColor` like the other icons here.
    return (
      <span
        role="img"
        aria-hidden
        className={className}
        style={{
          display: "inline-block",
          backgroundColor: "currentColor",
          maskImage: "url(/codex-mark.png)",
          WebkitMaskImage: "url(/codex-mark.png)",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="8.5" cy="12" r="4" />
      <path d="M12 12h9M17.5 12v3M20.5 12v2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The model driving the chat, and what else this machine could run.
 *
 * Models rather than harnesses, because the model is the choice a user is
 * actually making — "Sonnet or Opus" is a decision about cost and speed, while
 * "Claude Code or Codex" is one about which subscription pays for it. Picking a
 * model picks its harness, since no other combination means anything.
 *
 * Both lists come from the harnesses themselves (see electron/agent/models.ts),
 * so a model released this week appears without a release of ours.
 *
 * A harness this machine doesn't have keeps its row, with the reason — "install
 * the Codex CLI" is more useful than an absence.
 */
export function HarnessPicker({ placement = "up" }: { placement?: "up" | "down" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { state: data, choose } = useHarness();

  // Close on an outside click or Escape, like the other menus in the editor.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = data?.options.find((o) => o.id === data.active);
  const activeModel = data?.models.find(
    (m) => m.harness === data.active && m.id === data.activeModel,
  );

  return (
    // `min-w-0`, not `shrink-0`: this sits in a row that also holds Folders,
    // the plugin menu, the context ring and Send, and the row has nowhere
    // near enough width for all of it at the composer's narrowest — this is
    // the one item whose label is genuinely optional, so it gives first.
    <div ref={ref} className="relative min-w-0 shrink">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={
          activeModel
            ? `${activeModel.label} · ${active?.label ?? ""} ${active?.version ?? ""}`.trim()
            : (active?.version ?? "Choose the model")
        }
        className={cx(
          "flex h-8 min-w-0 items-center gap-1.5 rounded-full pl-2 pr-2 text-[0.786rem] transition-colors",
          "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
          open && "bg-surface-hover text-text-primary",
        )}
      >
        {data ? (
          <HarnessIcon id={data.active} className="size-[0.95rem] shrink-0" />
        ) : (
          <Spinner className="size-3 shrink-0" />
        )}
        {/* No fixed cap — truncates to whatever the row actually has left,
            down to nothing, rather than holding a fixed width the row may
            not have room for. */}
        <span className="min-w-0 flex-1 truncate">
          {activeModel?.label ?? active?.label ?? "Agent"}
        </span>
        <svg viewBox="0 0 16 16" className={cx("size-3 shrink-0 opacity-60 transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6.5L8 10.5 12 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && data && (
        <div
          className={cx(
            // Bounded and scrollable: these lists grow with whatever the
            // harnesses and the filesystem report, and a menu taller than the
            // window is one whose bottom the user can never reach.
            "absolute left-0 z-50 max-h-[min(60vh,24rem)] w-72 overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-border bg-surface-raised shadow-[0_16px_50px_rgba(0,0,0,0.5)]",
            // In the editor the composer sits against the bottom of the panel,
            // so the menu has to open upward; on the start screen there is room
            // below, and opening down keeps the prompt in view.
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <p className="px-3 pb-1 pt-2.5 text-[0.72rem] uppercase tracking-wider text-text-tertiary">
            Model
          </p>
          {/* Grouped by harness so a locked one can say why once, under its own
              rows, instead of repeating itself on every line. */}
          {data.options.map((harness) => {
            const models = data.models.filter((m) => m.harness === harness.id);
            if (models.length === 0) return null;
            const locked = !harness.installed || !harness.supported;
            return (
              <div key={harness.id}>
                {models.map((model) => {
                  // An empty id is "let the harness choose", which is also what
                  // no stored model means — so they are the same row.
                  const isActive =
                    model.harness === data.active && model.id === (data.activeModel ?? "");
                  return (
                    <button
                      key={`${model.harness}:${model.id}`}
                      type="button"
                      role="menuitem"
                      // The model's own one-liner, which the row has no space
                      // for and the harness name has earned instead.
                      title={model.detail}
                      disabled={locked || choose.isPending}
                      onClick={() =>
                        !isActive && choose.mutate(model, { onSuccess: () => setOpen(false) })
                      }
                      className={cx(
                        "flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors",
                        locked ? "cursor-default opacity-55" : "hover:bg-surface-hover",
                      )}
                    >
                      <HarnessIcon id={model.harness} className="mt-0.5 size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[0.929rem] text-text-primary">
                            {model.label}
                          </span>
                          {isActive && (
                            <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.786rem] leading-snug text-text-tertiary">
                          {/* "Claude Code · Fable 5.1" — which harness pays for
                              the turn, and which generation it runs. */}
                          {model.version ? `${harness.label} · ${model.version}` : harness.label}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {locked && (
                  <p className="px-3 pb-2 pl-[2.375rem] text-[0.786rem] leading-snug text-text-tertiary">
                    {harness.unavailableReason ?? `${harness.label} is not available.`}
                  </p>
                )}
              </div>
            );
          })}

          {choose.error && (
            <p className="border-t border-border px-3 py-2 text-[0.786rem] text-warning">
              {choose.error instanceof Error ? choose.error.message : "Couldn't switch"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
