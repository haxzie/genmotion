"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchEntry } from "@/lib/docs/content";
import { cx } from "@/lib/cx";

type Hit = { key: string; href: string; title: string; context: string; kind: "page" | "section" | "text" };

/**
 * ⌘K search over every docs page. The index is small enough to ship whole,
 * so matching runs locally with no request and no dependency: titles first,
 * then section headings, then a snippet from the body.
 */
function search(index: SearchEntry[], query: string): Hit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return index.slice(0, 6).map((e) => ({ key: e.href, href: e.href, title: e.title, context: e.group, kind: "page" }));
  }
  const words = q.split(/\s+/);
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const pages: Hit[] = [];
  const sections: Hit[] = [];
  const texts: Hit[] = [];
  for (const e of index) {
    if (has(e.title) || has(e.description)) pages.push({ key: e.href, href: e.href, title: e.title, context: e.description, kind: "page" });
    for (const h of e.headings) {
      if (has(h.text)) sections.push({ key: `${e.href}#${h.id}`, href: `${e.href}#${h.id}`, title: h.text, context: e.title, kind: "section" });
    }
    const lower = e.text.toLowerCase();
    const at = lower.indexOf(words[0] ?? q);
    if (at !== -1 && has(e.text) && !pages.some((p) => p.href === e.href)) {
      const start = Math.max(0, at - 40);
      texts.push({
        key: `${e.href}~text`,
        href: e.href,
        title: e.title,
        context: `${start > 0 ? "…" : ""}${e.text.slice(start, at + 90)}…`,
        kind: "text",
      });
    }
  }
  return [...pages, ...sections, ...texts].slice(0, 12);
}

export function DocsSearch({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const hits = useMemo(() => search(index, query), [index, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelected(0);
    input.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const go = (hit: Hit | undefined) => {
    if (!hit) return;
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
        className="flex h-9 w-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface text-[0.88rem] text-text-tertiary transition-colors hover:border-border-strong hover:text-text-secondary sm:w-64 sm:justify-start sm:px-3 lg:w-80"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="hidden flex-1 text-left sm:inline">Search docs</span>
        <kbd className="hidden rounded border border-border bg-surface-raised px-1.5 font-sans text-[0.72rem] text-text-tertiary sm:inline">⌘K</kbd>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search documentation"
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl shadow-black/60"
            >
              <div className="flex items-center gap-3 border-b border-border px-4">
                <SearchIcon className="size-4 shrink-0 text-text-tertiary" />
                <input
                  ref={input}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelected((s) => Math.min(s + 1, hits.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelected((s) => Math.max(s - 1, 0));
                    } else if (e.key === "Enter") {
                      go(hits[selected]);
                    } else if (e.key === "Escape") {
                      setOpen(false);
                    }
                  }}
                  placeholder="Search the docs"
                  aria-label="Search the docs"
                  className="h-14 flex-1 bg-transparent text-[1rem] text-text-primary outline-none placeholder:text-text-tertiary"
                />
                <kbd className="rounded border border-border px-1.5 text-[0.72rem] text-text-tertiary">Esc</kbd>
              </div>
              <ul ref={list} className="max-h-[50vh] overflow-y-auto p-2">
                {hits.length === 0 && <li className="px-3 py-8 text-center text-[0.9rem] text-text-tertiary">Nothing matches “{query}”.</li>}
                {hits.map((hit, i) => (
                  <li key={hit.key}>
                    <button
                      type="button"
                      data-index={i}
                      onMouseMove={() => setSelected(i)}
                      onClick={() => go(hit)}
                      className={cx(
                        "flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left",
                        i === selected ? "bg-surface-hover" : "",
                      )}
                    >
                      <span className={cx("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border text-[0.75rem]", i === selected ? "text-green" : "text-text-tertiary")}>
                        {hit.kind === "section" ? "#" : "¶"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.92rem] font-medium text-text-primary">{hit.title}</span>
                        <span className="line-clamp-1 text-[0.82rem] text-text-tertiary">{hit.context}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
