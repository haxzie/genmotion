

/**
 * Local, because `cx` lives in a "use client" module and this renders on the
 * server — importing it makes Next refuse the build at prerender time.
 */
function join(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * The one call to action on the marketing site.
 *
 * Points at our own /download by default, not at a resolver. The web app and
 * the API deploy independently, so a button wired straight to the API has a
 * primary call to action that breaks whenever the API is a deploy behind —
 * which is exactly what happened. /download is served by the same deployment
 * as the button, so the two can never be out of step, and that page resolves
 * the actual file.
 *
 * `href` overrides it where the direct asset URL is already known.
 *
 * Not `target="_blank"` — a download is not a navigation, and a blank tab that
 * opens and immediately closes itself reads as a bug.
 */
export const DOWNLOAD_PAGE = "/download";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={join("size-[1.15em] shrink-0", className)}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.365 1.43c0 1.14-.47 2.23-1.24 3.03-.79.83-2.09 1.47-3.16 1.38-.13-1.1.45-2.27 1.18-3.02.8-.84 2.19-1.45 3.22-1.39zM20.5 17.16c-.55 1.27-.82 1.84-1.53 2.96-.99 1.56-2.38 3.5-4.1 3.51-1.53.02-1.92-.99-3.99-.98-2.07.01-2.5 1-4.03.98-1.72-.02-3.04-1.77-4.03-3.33C.06 16.06-.23 10.9 1.47 8.16c1.2-1.94 3.1-3.08 4.88-3.08 1.82 0 2.96 1 4.47 1 1.46 0 2.35-1 4.45-1 1.59 0 3.27.86 4.47 2.35-3.93 2.15-3.29 7.76.76 9.73z" />
    </svg>
  );
}

const variants = {
  primary: "bg-cta text-background hover:bg-cta-hover border border-transparent",
  secondary:
    "bg-surface-raised text-text-primary border border-border hover:border-border-strong hover:bg-surface-hover",
} as const;

export function DownloadButton({
  size = "md",
  variant = "primary",
  label = "Download",
  href = DOWNLOAD_PAGE,
  className,
}: {
  /** The direct asset URL, where the caller has resolved one. */
  href?: string;
  size?: "md" | "lg";
  variant?: keyof typeof variants;
  /** Override only where the surrounding copy would otherwise repeat itself. */
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={join(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        size === "lg" ? "h-12 px-6 text-[1.05rem]" : "h-9 px-4 text-[1rem]",
        variants[variant],
        className,
      )}
    >
      <AppleIcon />
      {label}
    </a>
  );
}
