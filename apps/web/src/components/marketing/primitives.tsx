import Link from "next/link";
import { cx } from "@/lib/cx";

/** Centered, max-width page gutter used across every marketing section. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("mx-auto w-full max-w-6xl px-6", className)}>
      {children}
    </div>
  );
}

/** Vertical rhythm wrapper for a marketing section. */
export function Section({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cx("py-20 sm:py-28", className)}>{children}</section>
  );
}

/** Small uppercase label that sits above a heading. */
export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 text-[0.786rem] font-medium uppercase tracking-[0.14em] text-text-tertiary",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Slow-drifting brand-hue blobs, lifted from the dashboard hero. Pinned to the
 * bottom of its positioned parent; heavily blurred. Decorative only.
 */
export function GradientBlobs({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div
        className="absolute bottom-0 left-[6%] size-[44vw] max-w-[640px] rounded-full blur-[120px] animate-[blob-a_16s_ease-in-out_infinite]"
        style={{ background: "#C6F91E", opacity: 0.32 }}
      />
      <div
        className="absolute bottom-0 right-[6%] size-[46vw] max-w-[680px] rounded-full blur-[130px] animate-[blob-b_20s_ease-in-out_infinite]"
        style={{ background: "#16F5BD", opacity: 0.3 }}
      />
      <div
        className="absolute bottom-0 left-[40%] size-[30vw] max-w-[440px] rounded-full blur-[120px] animate-[blob-c_18s_ease-in-out_infinite]"
        style={{ background: "#FFD60A", opacity: 0.22 }}
      />
    </div>
  );
}

type LinkButtonProps = {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  className?: string;
  children: React.ReactNode;
};

const linkButtonStyles: Record<NonNullable<LinkButtonProps["variant"]>, string> = {
  primary: "bg-cta text-background hover:bg-cta-hover border border-transparent",
  secondary:
    "bg-surface-raised text-text-primary border border-border hover:border-border-strong hover:bg-surface-hover",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:text-text-primary hover:bg-surface-raised",
};

/** Anchor styled like the app Button — for marketing CTAs that navigate. */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: LinkButtonProps) {
  const external = /^https?:\/\//.test(href);
  const classes = cx(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
    size === "lg" ? "h-11 px-5 text-[1.05rem]" : "h-9 px-4 text-[1rem]",
    linkButtonStyles[variant],
    className,
  );
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

/** Generic bordered surface card used by grids across the marketing site. */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-border bg-surface p-6 transition-colors duration-150",
        className,
      )}
    >
      {children}
    </div>
  );
}
