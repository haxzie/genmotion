"use client";

import { useEffect, useState } from "react";

/**
 * Copy-to-clipboard for the marketing site's commands and prompts. The flag
 * resets on its own so a second click reads as a second copy.
 */
export function useCopy(text: string): { copied: boolean; copy: () => Promise<void> } {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard access denied or unavailable. Saying "Copied" when nothing
      // was would be worse than the click appearing to do nothing.
    }
  }

  return { copied, copy };
}

export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12.5l5.5 5.5L20 7" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" />
    </svg>
  );
}

/**
 * A button that copies a block of text, sized to sit beside `DownloadButton`.
 * Used for the setup prompt: a paragraph nobody wants to select by hand, and
 * one that only makes sense pasted somewhere else.
 */
export function CopyTextButton({
  text,
  label,
  copiedLabel = "Copied",
  ariaLabel,
  size = "md",
  className,
}: {
  text: string;
  label: string;
  copiedLabel?: string;
  ariaLabel?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const { copied, copy } = useCopy(text);
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={ariaLabel ?? label}
      className={[
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        "border border-border bg-surface-raised text-text-primary hover:border-border-strong hover:bg-surface-hover",
        size === "lg" ? "h-12 px-6 text-[1.05rem]" : "h-9 px-4 text-[1rem]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {copied ? <CheckIcon className="size-[1.1em] shrink-0 text-green" /> : <SparkIcon className="size-[1.1em] shrink-0" />}
      {copied ? copiedLabel : label}
      <span className="sr-only" role="status">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
