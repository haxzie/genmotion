import { cx } from "@/components/ui";
import { api } from "../api";
import type { UpdateState } from "../../electron/shared";

/**
 * The update, offered rather than applied.
 *
 * Nothing downloads until the button is pressed: the build is ~137MB, and a
 * download nobody asked for is a surprise on a metered connection. Installing
 * quits the app, so that is a second, separate press — losing an in-flight
 * agent turn to a click you did not expect is a bad trade for being current.
 */
export function UpdateModal({
  state,
  onClose,
}: {
  state: UpdateState;
  onClose: () => void;
}) {
  const version = "version" in state ? state.version : null;
  const downloading = state.status === "downloading";
  const ready = state.status === "ready";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-surface-raised p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="update-title" className="font-display text-lg tracking-tight text-text-primary">
          {ready ? "Ready to install" : "Update available"}
        </h2>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-text-secondary">
          {ready ? (
            <>
              GenMotion {version} has been downloaded. Restarting takes a few
              seconds.
            </>
          ) : downloading ? (
            <>Downloading GenMotion {version}…</>
          ) : (
            <>
              GenMotion {version} is available. You&apos;re on{" "}
              {__APP_VERSION__}.
            </>
          )}
        </p>

        {downloading && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${state.percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.786rem] text-text-tertiary">{state.percent}%</p>
          </div>
        )}

        {state.status === "error" && (
          <p className="mt-4 text-[0.857rem] text-warning">{state.message}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[0.9rem] text-text-secondary transition-colors hover:text-text-primary"
          >
            {ready ? "Later" : "Not now"}
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={() => {
              if (ready) void api.update.install();
              else void api.update.download();
            }}
            className={cx(
              "rounded-md bg-cta px-3 py-1.5 text-[0.9rem] font-medium text-background",
              "transition-colors hover:bg-cta-hover disabled:opacity-50",
            )}
          >
            {ready ? "Restart now" : downloading ? "Downloading…" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
