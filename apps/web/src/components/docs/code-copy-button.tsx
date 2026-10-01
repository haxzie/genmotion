"use client";

import { CheckIcon, CopyIcon, useCopy } from "@/components/marketing/copy";

export function CodeCopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy code"}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {copied ? <CheckIcon className="size-4 text-green" /> : <CopyIcon className="size-4" />}
      <span className="sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
