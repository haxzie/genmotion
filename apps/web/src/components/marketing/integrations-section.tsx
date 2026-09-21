import type { LiHTMLAttributes } from "react";
import { Container, Eyebrow } from "@/components/marketing/primitives";
import { INTEGRATIONS, type Integration } from "@/lib/marketing/integrations";

/**
 * The marketplace, right under the hero: every integration as a logo pill —
 * "does it work with what I use?" at a glance, names and marks, no reading.
 */

/** A marketplace entry as a bordered pill: the vendor's own mark and its name. */
function IntegrationPill({
  integration,
  ...rest
}: { integration: Integration } & LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li
      {...rest}
      className="flex shrink-0 items-center gap-3 rounded-full border border-border bg-surface py-2 pl-2 pr-5 text-[1.05rem] text-text-primary transition-colors duration-150 hover:border-border-strong"
    >
      <Mark integration={integration} className="size-9" />
      {integration.name}
    </li>
  );
}

/**
 * One row of the logo marquee.
 *
 * The list is rendered twice back to back and the track slides by exactly
 * half of itself, so the loop has no seam (see `.marquee-track` in
 * globals.css). The copy is `aria-hidden`: a screen reader should hear each
 * vendor once. Two rows run in opposite directions so the band reads as a
 * field of logos passing rather than a single line of them.
 */
function MarqueeRow({
  integrations,
  reverse,
}: {
  integrations: Integration[];
  reverse?: boolean;
}) {
  const pills = (hidden: boolean) =>
    integrations.map((integration) => (
      <IntegrationPill
        key={`${integration.id}${hidden ? "-copy" : ""}`}
        integration={integration}
        {...(hidden ? { "aria-hidden": true } : {})}
      />
    ));
  return (
    <ul
      className={`marquee-track flex w-max gap-3 pr-3 ${reverse ? "marquee-track-reverse" : ""}`}
    >
      {pills(false)}
      {pills(true)}
    </ul>
  );
}

/**
 * The vendor's mark in a small disc. The marks arrive from two sources at two
 * sizes (a coloured Simple Icons SVG, or a 128px favicon), so each sits inside
 * a fixed disc with padding rather than being drawn edge to edge — what makes
 * a row of them read as a set. Plain `<img>`: the sources are third-party CDNs
 * and the Next image loader has nothing to add for a 24px mark.
 */
function Mark({
  integration,
  className,
}: {
  integration: Integration;
  className: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised ${className}`}
    >
      <img
        src={integration.iconUrl}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        className="size-[58%] object-contain"
      />
    </span>
  );
}

function rotate<T>(list: T[], by: number): T[] {
  return [...list.slice(by), ...list.slice(0, by)];
}

export function IntegrationsSection() {
  return (
    <section className="relative z-10 mt-24 sm:mt-32">
      <Container>
        {/* One line above the band, nothing more: the logos are the copy. */}
        <div className="text-center">
          <Eyebrow>Works with your tools</Eyebrow>
        </div>
      </Container>

      {/* The logo band: two rows drifting past each other, faded out at the
          edges of the viewport. The shape every "trusted by" strip has — the
          brands are the reassurance here too, just as partners rather than
          customers. Full-bleed, outside the Container, so the fade lands on
          the screen edge rather than on a gutter. */}
      <div className="marquee relative mt-8 flex flex-col gap-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        {/* Both rows carry the whole list — a half-list is narrower than an
            ultra-wide viewport, and the loop would show its seam. The second
            row starts half-way round so the two never show the same logos. */}
        <MarqueeRow integrations={INTEGRATIONS} />
        <MarqueeRow
          integrations={rotate(
            INTEGRATIONS,
            Math.floor(INTEGRATIONS.length / 2),
          )}
          reverse
        />
      </div>
    </section>
  );
}
