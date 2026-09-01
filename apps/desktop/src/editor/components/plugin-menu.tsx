"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_PLUGINS, isPremiumPlugin, type ChatPlugin } from "@genmotion/shared";
import { cx } from "@/components/ui";
import { PluginIcon } from "./plugin-icon";
import { useUpgrade } from "@/components/upgrade-modal";

/**
 * What the `+` offers.
 *
 * Modelled on the harness picker beside it, including how it treats something
 * the user cannot have: a plugin they are not on the plan for is listed and
 * dimmed with the reason underneath, not hidden. Discovering the paywall here
 * costs a click; discovering it after writing a script costs the script.
 *
 * Availability is read from the plan the upgrade provider already polls, so
 * this adds no request of its own.
 */

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.6.8l.9 1.2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PluginMenu({
  onPick,
  onAttachFile,
  onShareFolder,
  sharingFolder = false,
  disabledIds,
}: {
  /** A generative plugin was chosen; the composer turns it into a chip. */
  onPick: (plugin: ChatPlugin) => void;
  /** "Local File" — the picker the `+` used to open directly. */
  onAttachFile: () => void;
  /**
   * "Share a folder" — a whole folder the agent may read, rather than a file
   * copied into the project. Sits below the plugins because it is not part of
   * the message being written: it changes what the agent can see from here on.
   */
  onShareFolder?: () => void;
  /** The native picker is open, which can be a while. */
  sharingFolder?: boolean;
  /** Already attached to this message, so not offered twice. */
  disabledIds: ChatPlugin["id"][];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { subscription, openUpgrade } = useUpgrade();

  // Paid, specifically — not `entitled`, which a trial also satisfies. Chat
  // plugins spend provider credit, so they are the one thing the free week
  // does not include.
  const paid = subscription?.paid ?? false;

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

  function choose(plugin: ChatPlugin) {
    if (plugin.id === "local-file") {
      setOpen(false);
      onAttachFile();
      return;
    }
    if (isPremiumPlugin(plugin) && !paid) {
      setOpen(false);
      openUpgrade("plugin");
      return;
    }
    setOpen(false);
    onPick(plugin);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Add"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex size-8 items-center justify-center rounded-full bg-surface-raised text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary",
          open && "bg-surface-hover text-text-primary",
        )}
      >
        <PlusIcon className={cx("size-[1.15rem] transition-transform duration-150", open && "rotate-45")} />
      </button>

      {open && (
        <div
          role="menu"
          // The composer sits against the bottom of the panel, so this opens up.
          className="absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[0_16px_50px_rgba(0,0,0,0.5)]"
        >
          <p className="px-3 pb-1 pt-2.5 text-[0.72rem] uppercase tracking-wider text-text-tertiary">
            Add
          </p>
          {CHAT_PLUGINS.map((plugin) => {
            const premium = isPremiumPlugin(plugin);
            const locked = premium && !paid;
            const attached = disabledIds.includes(plugin.id);
            return (
              <button
                key={plugin.id}
                type="button"
                role="menuitem"
                disabled={attached}
                onClick={() => choose(plugin)}
                className={cx(
                  "flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors",
                  attached ? "cursor-default opacity-45" : "hover:bg-surface-hover",
                  locked && !attached && "opacity-70",
                )}
              >
                <PluginIcon id={plugin.id} className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.929rem] text-text-primary">{plugin.label}</span>
                    {locked && (
                      <span className="shrink-0 rounded-full border border-border px-1.5 text-[0.65rem] uppercase tracking-wider text-text-tertiary">
                        Pro
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[0.786rem] leading-snug text-text-tertiary">
                    {attached
                      ? "Already added to this message"
                      : locked
                        ? "Upgrade to generate"
                        : plugin.hint}
                  </span>
                </span>
              </button>
            );
          })}

          {onShareFolder && (
            <button
              type="button"
              role="menuitem"
              disabled={sharingFolder}
              onClick={() => {
                setOpen(false);
                onShareFolder();
              }}
              className="flex w-full items-start gap-2.5 border-t border-border px-3 py-2 text-left transition-colors hover:bg-surface-hover disabled:opacity-60"
            >
              <FolderIcon className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
              <span className="min-w-0 flex-1">
                <span className="truncate text-[0.929rem] text-text-primary">
                  {sharingFolder ? "Choosing a folder…" : "Share a folder"}
                </span>
                <span className="mt-0.5 block text-[0.786rem] leading-snug text-text-tertiary">
                  Let the agent read it. It still can&rsquo;t write outside the
                  project.
                </span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
