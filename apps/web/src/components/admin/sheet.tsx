"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cx } from "@/components/ui";

/**
 * Holds on to the last non-null value. The sheet takes ~320ms to slide out, and
 * without this its contents would blank the instant the selection clears.
 */
export function useRetained<T>(value: T | null): T | null {
  const last = useRef<T | null>(null);
  if (value !== null) last.current = value;
  return value ?? last.current;
}

/**
 * Right-side detail panel for the admin lists — the "sidepeek". Deliberately a
 * sibling of `components/modal.tsx` rather than a shared overlay abstraction:
 * it copies that file's portal, backdrop, easing and Escape handling, and only
 * the panel geometry differs.
 *
 * The body scrolls independently of the page (these panels sit over long
 * infinite-scroll lists), so the panel is a flex column with a sticky header.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Lock the page behind the panel so a scroll gesture can't run the list
    // underneath while the sheet is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex justify-end"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative z-10 flex h-full w-full flex-col border-l border-border bg-surface shadow-[0_0_80px_rgba(0,0,0,0.6)] sm:w-[36rem]"
            variants={{ hidden: { x: "100%" }, visible: { x: 0 } }}
            transition={{ duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
          >
            <div className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-[1.05rem] font-semibold tracking-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[0.85rem] text-text-tertiary">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** A titled block inside a sheet. */
export function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="text-[0.78rem] font-medium uppercase tracking-wide text-text-tertiary">
        {title}
        {count !== undefined && <span className="ml-1.5 tabular-nums">{count}</span>}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** Label-value pair — the detail panels are mostly these. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[0.85rem] text-text-tertiary">{label}</span>
      <span className="min-w-0 truncate text-right text-[0.88rem]">{children}</span>
    </div>
  );
}

/** Big number tiles for the counts at the top of a panel. */
export function StatGrid({ stats }: { stats: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-surface-raised px-3 py-2.5">
          <div className="font-display text-[1.15rem] font-semibold tabular-nums">{s.value}</div>
          <div className="mt-0.5 text-[0.75rem] text-text-tertiary">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/** The pill already used for plans and formats across the admin pages. */
export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "green" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-block shrink-0 rounded-full border px-2 py-0.5 text-[0.75rem]",
        tone === "accent" && "border-accent/30 bg-accent/10 text-accent",
        tone === "green" && "border-green/30 bg-green/10 text-green",
        tone === "danger" && "border-danger/30 bg-danger/10 text-danger",
        tone === "default" && "border-border text-text-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Free reads as neutral; anything paid is worth spotting in a list. */
export function PlanBadge({ plan, planName }: { plan: string; planName: string }) {
  return <Badge tone={plan === "free" ? "default" : "accent"}>{planName}</Badge>;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/** Avatar with an initial fallback — the treatment already in users/page.tsx. */
export function Avatar({ person, className }: { person: Person; className?: string }) {
  const size = className ?? "size-8";
  return person.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={person.image} alt="" className={cx(size, "shrink-0 rounded-full object-cover")} />
  ) : (
    <div
      className={cx(
        size,
        "flex shrink-0 items-center justify-center rounded-full bg-surface-hover text-[0.8rem] font-medium text-text-secondary",
      )}
    >
      {(person.name || person.email).slice(0, 1).toUpperCase()}
    </div>
  );
}

/** Avatar + name/email, used in every member and creator list. */
export function PersonRow({ person, meta }: { person: Person; meta?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Avatar person={person} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.88rem]">{person.name || "—"}</div>
        <div className="truncate text-[0.8rem] text-text-tertiary">{person.email}</div>
      </div>
      {meta && <div className="shrink-0 text-[0.8rem] text-text-tertiary">{meta}</div>}
    </div>
  );
}

/** Bordered container matching the list pages' `rounded-xl border` treatment. */
export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border/60 rounded-lg border border-border px-3">
      {children}
    </div>
  );
}
