"use client";

import { forwardRef } from "react";
import { cx } from "@/lib/cx";

export { cx };

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-cta text-background hover:bg-cta-hover border border-transparent",
  secondary:
    "bg-surface-raised text-text-primary border border-border hover:border-border-strong hover:bg-surface-hover",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:text-text-primary hover:bg-surface-raised",
  danger:
    "bg-transparent text-danger border border-transparent hover:bg-danger/10",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "sm" | "md";
  }
>(function Button({ variant = "secondary", size = "md", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-7 px-2.5 text-[0.857rem]" : "h-8 px-3 text-[1rem]",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
});

/**
 * Note on width: this is `w-full` and `cx` is a plain join, not tailwind-merge,
 * so a `w-28` passed in `className` does NOT win — Tailwind emits `w-full`
 * later and it takes the cascade. To size one of these, put the width on a
 * wrapper around it and leave the input filling that.
 */
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cx(
        "h-8 w-full rounded-md border border-border bg-surface px-3 text-text-primary placeholder:text-text-tertiary transition-colors duration-150 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
        className,
      )}
      {...props}
    />
  );
});

/**
 * A select that matches `Input`.
 *
 * Every select in the app used to be hand-styled, and each one came out
 * slightly different from the field beside it: a smaller type size, no focus
 * ring, and the platform’s own chevron drawn hard against the right border,
 * because a native `<select>` paints it inside the border box whatever padding
 * you give it. So this turns the native appearance off and draws the chevron
 * itself, with real room around it.
 *
 * Unlike `Input` it is **not** `w-full`: a select should size to its longest
 * option, which is what makes a row of them line up. Wrap it to pin a width.
 */
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    // `shrink-0`: a content-sized control in a flex row must not be squeezed
    // below its longest option, which is the whole reason it sizes itself.
    <div className="relative inline-flex shrink-0">
      <select
        ref={ref}
        className={cx(
          // Matches Input exactly, except for the right padding that clears
          // the chevron. No font size: inheriting is what keeps it the same
          // size as the field next to it.
          "h-8 cursor-pointer appearance-none rounded-md border border-border bg-surface pl-3 pr-8 text-text-primary transition-colors duration-150 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx("size-4 animate-spin text-text-secondary", className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
