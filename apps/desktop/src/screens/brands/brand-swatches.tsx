import { cx } from "@/components/ui";
import type { BrandColor, BrandLogo } from "@genmotion/shared";
import { LogoTile } from "./logo-image";

/**
 * The two things that say "this is that brand" at a glance: the mark and the
 * palette. Shared by the cards, the detail header and the composer's chip, so
 * a brand looks the same wherever it is named.
 */

/** Loopback URL for a file inside a brand. The renderer never builds a path. */
export function brandAssetUrl(brandId: string, file: string): string {
  const path = file
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${window.__GM_API_URL__}/api/brands/${encodeURIComponent(brandId)}/asset/${path}`;
}

/** The brand's mark, or its initials. Never a placeholder logo. */
export function BrandMark({
  id,
  name,
  logos,
  className,
}: {
  id: string;
  name: string;
  logos: BrandLogo[];
  className?: string;
}) {
  // The wordmark is the wrong shape for a square tile, and an icon is drawn to
  // be small, so the preference order is icon, mark, then whatever there is.
  const logo = logos.find((l) => l.variant === "icon") ?? logos.find((l) => l.variant === "mark") ?? logos[0];
  if (!logo) {
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase();
    return (
      <div
        className={cx(
          "flex items-center justify-center rounded-lg bg-surface-raised text-text-secondary",
          "text-[0.786rem] font-medium tracking-wide",
          className,
        )}
      >
        {initials || "?"}
      </div>
    );
  }
  // The ground is picked from the mark itself — see `logo-image.tsx`. On the
  // app's own surface a near-black mark like Stripe's was simply not there.
  return <LogoTile src={brandAssetUrl(id, logo.file)} className={cx("rounded-lg", className)} />;
}

/**
 * The palette as a row of chips.
 *
 * Hex on the chip rather than on hover: these are values somebody is going to
 * want to read and copy, and a tooltip is a worse place to put a number than
 * next to the colour it names.
 */
export function Swatches({ colors, max = 6 }: { colors: BrandColor[]; max?: number }) {
  if (colors.length === 0) {
    return <p className="text-[0.786rem] text-text-tertiary">No colours yet</p>;
  }
  const shown = colors.slice(0, max);
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((color, i) => (
        <span
          key={`${color.hex}-${i}`}
          className="size-4 rounded-full border border-border"
          style={{ backgroundColor: color.hex }}
          title={`${color.hex}${color.name ? ` — ${color.name}` : ""} (${color.role})`}
        />
      ))}
      {colors.length > shown.length && (
        <span className="text-[0.786rem] text-text-tertiary">+{colors.length - shown.length}</span>
      )}
    </div>
  );
}
