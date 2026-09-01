import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cx } from "@/components/ui";
import { UpdateModal } from "../components/update-modal";
import type { UpdateState } from "../../electron/shared";

/**
 * The dev-only admin panel.
 *
 * A floating button in the corner that opens a list of switches for things the
 * app normally decides for itself. Mounted behind `import.meta.env.DEV` in
 * App.tsx, so the whole tree — this file included — is dropped from a
 * production bundle rather than merely hidden in one.
 *
 * The point is surfaces that are hard to reach on purpose: the update modal
 * only appears when GitHub has a newer build, and in dev the updater is a
 * no-op, so there is otherwise no way to look at it.
 */

/**
 * The version the previews claim to be offering.
 *
 * A bump of the real one rather than a fixed string, so the modal's "you're on
 * X, Y is available" line reads the way it will in front of a user.
 */
function nextVersion(current: string): string {
  const [major = "0", minor = "0", patch = "0"] = current.split(".");
  const bumped = Number.parseInt(patch, 10);
  return Number.isNaN(bumped) ? current : `${major}.${minor}.${bumped + 1}`;
}

const PREVIEW_VERSION = nextVersion(__APP_VERSION__);

/**
 * Every state the modal draws differently. `idle` and `checking` are missing
 * because they render nothing worth looking at — the modal is only ever opened
 * from a badge that those two states do not show.
 */
const UPDATE_PREVIEWS: ReadonlyArray<{ label: string; state: UpdateState }> = [
  { label: "Available", state: { status: "available", version: PREVIEW_VERSION } },
  {
    label: "Downloading",
    state: { status: "downloading", version: PREVIEW_VERSION, percent: 42 },
  },
  { label: "Ready", state: { status: "ready", version: PREVIEW_VERSION } },
  {
    label: "Error",
    state: { status: "error", message: "net::ERR_INTERNET_DISCONNECTED" },
  },
];

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const [updatePreview, setUpdatePreview] = useState<number | null>(null);

  const preview = updatePreview === null ? null : UPDATE_PREVIEWS[updatePreview];

  return (
    <>
      {/* The panel outranks the modal (z-300 against its z-200) rather than the
          other way round: flipping between states while the modal is up is the
          whole reason the switches exist. */}
      {preview && (
        <UpdateModal state={preview.state} onClose={() => setUpdatePreview(null)} />
      )}

      <div className="no-drag fixed bottom-6 right-6 z-[300] flex flex-col items-end gap-2">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
              style={{ transformOrigin: "bottom right" }}
              className={cx(
                "w-72 rounded-lg border border-dashed border-accent/40 bg-surface-raised p-4",
                "shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
              )}
              role="dialog"
              aria-label="Dev tools"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-[0.9rem] tracking-tight text-text-primary">
                  Dev tools
                </h2>
                <span className="text-[0.714rem] text-text-tertiary">
                  v{__APP_VERSION__}
                </span>
              </div>
              <p className="mt-1 text-[0.714rem] leading-relaxed text-text-tertiary">
                Development builds only — not shipped.
              </p>

              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.786rem] font-medium text-text-secondary">
                    Update modal
                  </span>
                  <button
                    type="button"
                    onClick={() => setUpdatePreview((current) => (current === null ? 0 : null))}
                    className={cx(
                      "rounded-md border px-2 py-0.5 text-[0.714rem] font-medium transition-colors",
                      preview
                        ? "border-accent bg-accent-muted text-accent"
                        : "border-border text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {preview ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {UPDATE_PREVIEWS.map((option, index) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setUpdatePreview(index)}
                      className={cx(
                        "rounded-full border px-2 py-0.5 text-[0.714rem] transition-colors",
                        updatePreview === index
                          ? "border-accent/40 bg-accent-muted text-accent"
                          : "border-border text-text-tertiary hover:text-text-primary",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {/* Worth knowing before pressing them: the modal's own buttons
                    call the real updater, which does nothing while unpackaged. */}
                <p className="mt-2 text-[0.714rem] leading-relaxed text-text-tertiary">
                  Download and Restart hit the real updater — a no-op in dev.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          title="Dev tools"
          aria-label="Dev tools"
          aria-expanded={open}
          className={cx(
            "inline-flex size-10 items-center justify-center rounded-full border border-dashed",
            "bg-surface-raised shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-colors duration-150",
            open
              ? "border-accent text-accent"
              : "border-accent/40 text-text-secondary hover:border-accent hover:text-accent",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="size-[18px]"
            aria-hidden="true"
          >
            <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2" />
            <circle cx="16" cy="6" r="2" />
            <circle cx="8" cy="12" r="2" />
            <circle cx="16" cy="18" r="2" />
          </svg>
        </button>
      </div>
    </>
  );
}
