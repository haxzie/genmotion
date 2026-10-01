"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";

/**
 * "On this page", with the section you are reading highlighted. The active
 * heading is the last one scrolled past the top bar, which is what a reader
 * means by "where am I", rather than whichever happens to be visible.
 */
export function TableOfContents({ headings }: { headings: { id: string; text: string; level: number }[] }) {
  const [active, setActive] = useState<string | undefined>(headings[0]?.id);

  useEffect(() => {
    if (headings.length === 0) return;
    const onScroll = () => {
      let current = headings[0]?.id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < 120) current = h.id;
      }
      // At the very bottom, the last headings can never reach the top.
      const root = document.scrollingElement ?? document.documentElement;
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = headings.at(-1)?.id;
      setActive(current);
    };
    onScroll();
    // Capture, so it hears the scroll whichever element is the scroller.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, [headings]);

  if (headings.length === 0) return null;
  return (
    <nav aria-label="On this page" className="text-[0.85rem]">
      <p className="mb-3 flex items-center gap-2 font-medium text-text-primary">
        <svg viewBox="0 0 24 24" className="size-3.5 text-text-tertiary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 6h16M4 12h10M4 18h13" />
        </svg>
        On this page
      </p>
      <ul className="flex flex-col border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cx(
                "-ml-px block border-l py-1 transition-colors duration-150",
                h.level === 3 ? "pl-6" : "pl-3",
                active === h.id
                  ? "border-green font-medium text-text-primary"
                  : "border-transparent text-text-tertiary hover:text-text-secondary",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
