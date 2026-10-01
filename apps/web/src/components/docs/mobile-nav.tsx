"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { NavGroup } from "@/lib/docs/content";
import { DocsSidebarNav } from "@/components/docs/sidebar";

/** The sidebar as a drawer below `lg`, opened from the top bar. */
export function DocsMobileNav({ nav }: { nav: NavGroup[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = nav.flatMap((g) => g.items).find((i) => i.href === pathname);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 border-b border-border px-4 py-3 text-[0.9rem] text-text-secondary sm:px-6"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span className="text-text-tertiary">Docs</span>
        <span className="text-text-tertiary">/</span>
        <span className="truncate text-text-primary">{current?.title ?? "Menu"}</span>
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[55] flex">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="relative flex h-full w-[min(20rem,85vw)] flex-col overflow-y-auto border-r border-border bg-background px-3 py-5">
              <div className="mb-5 flex items-center justify-between px-3">
                <span className="font-medium text-text-primary">Documentation</span>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="cursor-pointer rounded-md p-1 text-text-tertiary hover:text-text-primary">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <DocsSidebarNav nav={nav} onNavigate={() => setOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
