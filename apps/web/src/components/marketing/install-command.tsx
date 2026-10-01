"use client";

import { STUDIO_INSTALL_COMMAND } from "@/lib/marketing/setup";
import { CheckIcon, CopyIcon, useCopy } from "@/components/marketing/copy";

/**
 * A one-line terminal command as a copy pill. By default the Studio's
 * installer, offered above the download button.
 *
 * Same release, two ways in: the button is for people who want a dmg, and this
 * is for people who would rather not leave the terminal. It is the only one of
 * the two that also leaves the `genmotion` command behind, which is what makes
 * `genmotion .` work afterwards.
 *
 * The whole pill is the copy target, not just the icon: the text is a single
 * command nobody wants to select by hand, and a click anywhere on it is the
 * behaviour people already expect from this pattern.
 */
export function InstallCommand({
  command = STUDIO_INSTALL_COMMAND,
  className,
}: {
  command?: string;
  className?: string;
}) {
  const { copied, copy } = useCopy(command);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Command copied" : `Copy: ${command}`}
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
        {command}
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
