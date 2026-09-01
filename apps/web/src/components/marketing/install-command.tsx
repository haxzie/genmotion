"use client";

import { useEffect, useState } from "react";

/**
 * The one-line install, offered above the download button.
 *
 * Same release, two ways in: the button is for people who want a dmg, and this
 * is for people who would rather not leave the terminal — and it is the only
 * one of the two that also leaves the `genmotion` command behind, which is
 * what makes `genmotion .` work afterwards.
 *
 * The whole pill is the copy target, not just the icon: the text is a single
 * command nobody wants to select by hand, and a click anywhere on it is the
 * behaviour people already expect from this pattern.
 */
const COMMAND = "curl -fsSL https://genmotion.dev/install.sh | sh";

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12.5l5.5 5.5L20 7" />
    </svg>
  );
}

export function InstallCommand({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
    } catch {
      // Clipboard access denied or unavailable. Saying "Copied" when nothing
      // was would be worse than the click appearing to do nothing.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Install command copied" : "Copy the install command"}
      className={[
        "group flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-raised/70 py-1.5 pl-4 pr-1.5",
        "transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <code className="overflow-x-auto whitespace-nowrap font-mono text-[0.8rem] text-text-secondary sm:text-[0.9rem]">
        <span className="select-none text-text-tertiary">$ </span>
        {COMMAND}
      </code>
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors duration-150 group-hover:text-text-primary"
      >
        {copied ? (
          <CheckIcon className="size-4 text-green" />
        ) : (
          <CopyIcon className="size-4" />
        )}
      </span>
      {/* Announced without moving anything on screen. */}
      <span className="sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
