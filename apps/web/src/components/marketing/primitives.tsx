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
  // `cx` is a plain join, so a `max-w-*` passed in would lose to the default on
  // CSS source order rather than override it. Drop the default when the caller
  // supplies its own width.
  const hasWidth = /(?:^|\s)max-w-/.test(className ?? "");
  return (
    <div className={cx("mx-auto w-full px-6", !hasWidth && "max-w-6xl", className)}>
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

/**
 * Livelier cousin of GradientBlobs: brighter, roaming blobs spread across the
 * whole surface (not pinned to the bottom) with a soft radial vignette on top.
 * Used behind the closing CTA to give it more energy. Decorative only.
 */
export function VividGradientBlobs({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div
        className="absolute left-[-6%] top-[-20%] size-[38vw] max-w-[520px] rounded-full blur-[110px] animate-[drift-1_14s_ease-in-out_infinite]"
        style={{ background: "#C6F91E", opacity: 0.4 }}
      />
      <div
        className="absolute right-[-4%] top-[10%] size-[40vw] max-w-[560px] rounded-full blur-[120px] animate-[drift-2_18s_ease-in-out_infinite]"
        style={{ background: "#16F5BD", opacity: 0.36 }}
      />
      <div
        className="absolute bottom-[-24%] left-[34%] size-[34vw] max-w-[480px] rounded-full blur-[110px] animate-[drift-3_16s_ease-in-out_infinite]"
        style={{ background: "#FFD60A", opacity: 0.3 }}
      />
      <div
        className="absolute right-[22%] top-[-16%] size-[24vw] max-w-[340px] rounded-full blur-[110px] animate-[drift-1_20s_ease-in-out_infinite]"
        style={{ background: "#3b6ef6", opacity: 0.3 }}
      />
      {/* Vignette so text stays legible over the brighter blobs. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 50%, transparent 30%, var(--color-surface) 100%)",
        }}
      />
    </div>
  );
}

// Radii of exactly 50% put the fade's zero point on the box edges, so the
// glow ends in air rather than at a visible horizontal or vertical seam.
const MASK = "radial-gradient(50% 50% at 50% 50%, black 25%, transparent 100%)";

/**
 * Cool-hued cousin of the blobs above — violet / azure / rose instead of the
 * brand lime and teal, so the showcase reads as its own moment rather than a
 * second hero. Roams its whole box (the drift-* keyframes) and is masked to a
 * soft ellipse, so it can sit behind a card stack without a visible edge.
 */
export function CoolGradientBlobs({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx("pointer-events-none absolute inset-0", className)}
      style={{
        maskImage: MASK,
        WebkitMaskImage: MASK,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    >
      <div
        className="absolute left-[2%] top-[2%] size-[36vw] max-w-[560px] rounded-full blur-[100px] animate-[drift-1_17s_ease-in-out_infinite]"
        style={{ background: "#7C4DFF", opacity: 0.6 }}
      />
      <div
        className="absolute right-[2%] top-[10%] size-[34vw] max-w-[540px] rounded-full blur-[100px] animate-[drift-2_21s_ease-in-out_infinite]"
        style={{ background: "#FF4D9D", opacity: 0.5 }}
      />
      <div
        className="absolute bottom-0 left-[30%] size-[32vw] max-w-[500px] rounded-full blur-[110px] animate-[drift-3_19s_ease-in-out_infinite]"
        style={{ background: "#2E8BFF", opacity: 0.55 }}
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
