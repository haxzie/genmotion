"use client";

import { useEffect, useRef, useState } from "react";
import { desktopRemixUrl } from "@genmotion/shared";
import { cx } from "@/lib/cx";
import { DOWNLOAD_PAGE } from "@/components/marketing/download-button";
import { AgentGlyphs } from "@/components/marketing/agent-badges";
import { CheckIcon, CopyIcon, useCopy } from "@/components/marketing/copy";
import { InstallCommand } from "@/components/marketing/install-command";
import { templateRemixCommand, templateRemixPrompt } from "@/lib/marketing/setup";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx("size-3.5 transition-transform duration-150", open && "rotate-180")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

/**
 * The web site's equivalent of the in-app Remix button.
 *
 * A page can't write a project to disk itself, so pressing it doesn't remix
 * on the spot — it offers the ways that lead there: a prompt for the user's
 * own coding agent, which remixes through the CLI; a hand-off to an
 * already-installed app (a `genmotion://` deep link the desktop app answers
 * by running the exact same remix its own button does); getting the app
 * first; or the one CLI command. None of them needs an account: the template
 * files come from the public `/api/templates/:id/files`.
 */
export function TemplateRemixButton({
  templateId,
  title,
  className,
}: {
  templateId: string;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const prompt = useCopy(templateRemixPrompt({ id: templateId, title }));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-cta px-6 text-[1.05rem] font-medium text-background transition-colors duration-150 hover:bg-cta-hover outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        Remix this template
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-1.5 shadow-xl"
        >
          {/* Stays open on copy, so the confirmation is seen where it was clicked. */}
          <button
            type="button"
            role="menuitem"
            onClick={prompt.copy}
            className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-raised"
          >
            {prompt.copied ? (
              <CheckIcon className="mt-0.5 size-5 shrink-0 text-green" />
            ) : (
              <CopyIcon className="mt-0.5 size-5 shrink-0 text-text-tertiary" />
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[0.95rem] font-medium text-text-primary">
                  {prompt.copied ? "Copied. Paste into your agent" : "Copy prompt for your agent"}
                </span>
                {!prompt.copied && <AgentGlyphs className="gap-1.5 text-[0.75rem] text-text-tertiary" />}
              </span>
              <span className="block text-[0.8rem] text-text-tertiary">
                Claude Code, Codex or OpenCode remixes it in a local folder
              </span>
            </span>
            <span className="sr-only" role="status">
              {prompt.copied ? "Prompt copied" : ""}
            </span>
          </button>
          <a
            href={desktopRemixUrl(templateId)}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-surface-raised"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="mt-0.5 size-5 shrink-0 rounded-[4px]" />
            <span className="min-w-0">
              <span className="block text-[0.95rem] font-medium text-text-primary">
                Open in the app
              </span>
              <span className="block text-[0.8rem] text-text-tertiary">
                Already have GenMotion installed
              </span>
            </span>
          </a>
          <a
            href={DOWNLOAD_PAGE}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-surface-raised"
          >
            <DownloadIcon className="mt-0.5 size-5 shrink-0 text-text-tertiary" />
            <span className="min-w-0">
              <span className="block text-[0.95rem] font-medium text-text-primary">
                Download GenMotion
              </span>
              <span className="block text-[0.8rem] text-text-tertiary">
                Get the app, then come back to remix
              </span>
            </span>
          </a>
          <div className="mt-1 border-t border-border px-3 pb-1.5 pt-3">
            <p className="mb-2 text-[0.8rem] text-text-tertiary">Or in a terminal</p>
            <InstallCommand command={templateRemixCommand(templateId)} className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
