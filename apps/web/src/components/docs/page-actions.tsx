"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, useCopy } from "@/components/marketing/copy";

/**
 * "Copy page" plus the ways to hand this page to an agent: the raw Markdown
 * URL, or a chat that opens already pointed at it.
 */
export function PageActions({ markdown, markdownUrl }: { markdown: string; markdownUrl: string }) {
  const { copied, copy } = useCopy(markdown);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const ask = encodeURIComponent(`Read ${markdownUrl} so I can ask you questions about it.`);
  const items = [
    { label: "View as Markdown", detail: "The page as plain text", href: markdownUrl },
    { label: "Open in Claude", detail: "Ask questions about this page", href: `https://claude.ai/new?q=${ask}` },
    { label: "Open in ChatGPT", detail: "Ask questions about this page", href: `https://chatgpt.com/?hints=search&q=${ask}` },
  ];

  return (
    <div ref={root} className="relative inline-flex shrink-0">
      <div className="inline-flex overflow-hidden rounded-lg border border-border bg-surface text-[0.85rem]">
        <button
          type="button"
          onClick={copy}
          className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          {copied ? <CheckIcon className="size-3.5 text-green" /> : <CopyIcon className="size-3.5" />}
          {copied ? "Copied" : "Copy page"}
        </button>
        <button
          type="button"
          aria-label="More ways to use this page"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
          className="cursor-pointer border-l border-border px-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      <span className="sr-only" role="status">
        {copied ? "Page copied as Markdown" : ""}
      </span>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-border bg-surface-raised p-1.5 shadow-2xl shadow-black/50">
          {items.map((item) => (
            <a
              key={item.label}
              role="menuitem"
              href={item.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex flex-col rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover"
            >
              <span className="text-[0.88rem] font-medium text-text-primary">{item.label}</span>
              <span className="text-[0.8rem] text-text-tertiary">{item.detail}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
