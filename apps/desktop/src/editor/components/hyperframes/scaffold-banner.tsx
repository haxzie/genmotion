"use client";

import { useState } from "react";
import { Button, Spinner, cx } from "@/components/ui";
import { api } from "../../../api";
import type { HyperframesRuntime, ScaffoldState } from "../../../../electron/shared";

/**
 * The strip over the preview once a new project's HyperFrames install has
 * settled — that it landed, or why it did not and a way to try again. While
 * it runs, `ScaffoldScreen` stands in for the preview instead.
 * A finished install with nothing to say is shown off its one event and gone
 * with the next project payload — the main process forgets it (see
 * `hyperframes/scaffold.ts`), so it never comes back on a tab switch.
 */
export function ScaffoldBanner({
  dir,
  scaffold,
  runtime,
}: {
  dir: string;
  scaffold: ScaffoldState | null;
  runtime: HyperframesRuntime;
}) {
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);

  // The runtime note stands on its own — a project on an older or newer
  // release than the app shows it whether or not an install ever ran here.
  const note = runtime.note;
  if (!scaffold && !note) return null;
  if (scaffold && dismissed === scaffold.at) return null;

  let tone: "busy" | "ok" | "warn" = "busy";
  let text = "";
  if (!scaffold) {
    tone = "warn";
    text = note ?? "";
  } else if (scaffold.step === "resolving") {
    text = "Setting up HyperFrames — checking for the latest release…";
  } else if (scaffold.step === "installing") {
    text = `Installing HyperFrames ${scaffold.version}…`;
  } else if (scaffold.step === "done") {
    if (scaffold.note) {
      tone = "warn";
      text = scaffold.note;
    } else {
      tone = "ok";
      text = `HyperFrames ${scaffold.version} installed.`;
    }
  } else {
    tone = "warn";
    text = `Couldn't install HyperFrames ${scaffold.version}: ${scaffold.error}. The project runs on the bundled release for now.`;
  }

  return (
    <div
      className={cx(
        "flex items-center justify-between gap-3 border-b px-4 py-1.5 text-[0.857rem]",
        tone === "busy" && "border-accent/30 bg-accent/10 text-text-primary",
        tone === "ok" && "border-success/30 bg-success/10 text-text-primary",
        tone === "warn" && "border-warning/30 bg-warning/10 text-text-primary",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {tone === "busy" && <Spinner className="size-3.5" />}
        <span className="truncate">{text}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {scaffold?.step === "failed" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              void api.retryScaffold(dir).finally(() => setRetrying(false));
            }}
          >
            Retry
          </Button>
        )}
        {tone !== "busy" && scaffold && (
          <button
            type="button"
            aria-label="Dismiss"
            className="rounded p-1 text-text-tertiary hover:text-text-primary"
            onClick={() => setDismissed(scaffold.at)}
          >
            ×
          </button>
        )}
      </span>
    </div>
  );
}
