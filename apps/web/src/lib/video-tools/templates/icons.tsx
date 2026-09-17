/**
 * The glyph each template shows in the style picker — a miniature of the
 * layout it produces, so the chips can be told apart before clicking one.
 *
 * Drawn on the same 24×24 stroke grid as `@/components/marketing/icons` so
 * they sit on the chip at the same weight as the rest of the UI. They live
 * here rather than there because they describe a template, and belong beside
 * its name.
 */

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** A big number with an odometer arrow: the digits rolling up into place. */
export function CountUpIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 20V9M8 13l4-4 4 4" />
      <path d="M4 4h16" />
    </svg>
  );
}

/** A card with a headline figure and a caption row. */
export function StatCardIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 10h6M7 14h10" />
    </svg>
  );
}

/** A card with an icon tile, a headline and a ribbon — the launch card. */
export function LaunchCardIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <rect x="6.5" y="7.5" width="4" height="4" rx="1" />
      <path d="M13.5 8.5H17M13.5 11h2.5M6.5 16h11" />
    </svg>
  );
}

/** A curve rising left to right, landing on a point. */
export function ChartRiseIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3 19c4 0 6-1 8-5s4-7 10-8" />
      <circle cx="21" cy="6" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
