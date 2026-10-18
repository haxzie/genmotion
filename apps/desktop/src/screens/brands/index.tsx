import { useState } from "react";
import { motion } from "motion/react";
import type { BrandSummary } from "@genmotion/shared";
import { Button, Spinner, cx } from "@/components/ui";
import { useBrands } from "../../lib/use-brands";
import { BrandMark, Swatches } from "./brand-swatches";
import { BrandDetailPanel } from "./brand-detail";
import { NewBrandModal } from "./new-brand";

/**
 * Brands: the companies this machine makes videos for.
 *
 * A brand is a folder of someone's own material — the real mark, the exact
 * palette, the typefaces, work they consider on-brand — and attaching one to a
 * project is what makes the agent's first turn land on-brand instead of
 * guessing. This screen is where they are built up.
 *
 * List and detail in one destination, like Settings, rather than a modal: a
 * brand is edited over weeks in small pieces, and a dialog is the wrong shape
 * for something you come back to.
 *
 * It borrows Settings’ content column verbatim — same cap, same gutters, same
 * `Section` card — because they are the same kind of screen and should not look
 * like two. Uncapped, the detail form stretched a seven-character hex field
 * across the window.
 */

/**
 * Two columns, because this screen is two kinds of thing.
 *
 * The detail and the create form are forms: capped at Settings’ measure, so a
 * seven-character hex field is not stretched across the window. The list is a
 * gallery of cards and wants Projects’ measure instead — squeezed into the form
 * column, a three-up grid collapsed to one narrow card with the heading
 * wrapping beside it.
 */
const FORM_COLUMN = "mx-auto w-full max-w-3xl px-6 py-8";
const LIST_COLUMN = "mx-auto w-full max-w-6xl px-6 py-8";

const enterEase = [0.25, 1, 0.5, 1] as const;

function relativeDay(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} month${months === 1 ? "" : "s"} ago` : "over a year ago";
}

/**
 * What a brand still needs, said on the card.
 *
 * The failure this prevents is a brand that looks set up because it has a name
 * and a colour, is attached to a project, and then produces a video with the
 * name set as type because there was never a logo in it. Saying so on the card
 * is cheaper than finding out from the video.
 */
function missingFrom(brand: BrandSummary): string | null {
  const gaps: string[] = [];
  if (brand.logos.length === 0) gaps.push("a logo");
  if (brand.colors.length === 0) gaps.push("colours");
  if (brand.fonts.length === 0) gaps.push("a typeface");
  if (gaps.length === 0) return null;
  return `Needs ${gaps.length === 1 ? gaps[0] : `${gaps.slice(0, -1).join(", ")} and ${gaps.at(-1)}`}`;
}

function BrandCard({ brand, onOpen }: { brand: BrandSummary; onOpen: () => void }) {
  const missing = missingFrom(brand);
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: enterEase } } }}
      className={cx(
        "flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-raised p-4 text-left",
        "transition-colors duration-150 outline-none",
        "hover:border-border-strong hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent/40",
      )}
    >
      <div className="flex w-full items-center gap-3">
        <BrandMark id={brand.id} name={brand.name} logos={brand.logos} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-medium text-text-primary">{brand.name}</p>
          <p className="truncate text-[0.786rem] text-text-tertiary">
            {brand.site?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? `${brand.counts.references} references`}
          </p>
        </div>
        {brand.thirdParty && (
          <span
            className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[0.714rem] text-text-tertiary"
            title="Someone else's brand. Videos for it are reference work."
          >
            theirs
          </span>
        )}
      </div>

      <Swatches colors={brand.colors} />

      <p className="text-[0.786rem] text-text-tertiary">
        {missing ?? (brand.lastUsedAt ? `Last used ${relativeDay(brand.lastUsedAt)}` : "Ready to use")}
      </p>
    </motion.button>
  );
}

function Empty({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="text-[0.95rem] text-text-primary">No brands yet</p>
      <p className="mx-auto mt-1.5 max-w-md text-[0.857rem] leading-snug text-text-tertiary">
        A brand holds the real logo, the exact colours and the typefaces of a company you make
        videos for. Attach one to a project and the agent starts on-brand instead of asking you for
        hex values every time.
      </p>
      <Button variant="primary" onClick={onNew} className="mt-5">
        New brand
      </Button>
      <p className="mt-3 text-[0.786rem] text-text-tertiary">
        Paste their website and it will suggest the palette, type and logo.
      </p>
    </div>
  );
}

export function Brands({
  brandId,
  onSelect,
}: {
  /** From the route, so `#/brands/acme` opens that brand on a reload. */
  brandId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data: brands, isLoading, error } = useBrands();
  const [creating, setCreating] = useState(false);

  const modal = (
    <NewBrandModal
      open={creating}
      onClose={() => setCreating(false)}
      onCreated={(id: string) => {
        setCreating(false);
        onSelect(id);
      }}
    />
  );

  if (brandId) {
    return (
      <div className={FORM_COLUMN}>
        <BrandDetailPanel id={brandId} onBack={() => onSelect(null)} />
        {modal}
      </div>
    );
  }

  return (
    <div className={LIST_COLUMN}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-text-primary">Brands</h2>
          <p className="mt-0.5 text-[0.857rem] text-text-tertiary">
            The companies you make videos for. Attach one to a project and every video starts
            on-brand.
          </p>
        </div>
        {(brands?.length ?? 0) > 0 && (
          <Button variant="primary" onClick={() => setCreating(true)} className="shrink-0">
            New brand
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner className="size-4 text-text-tertiary" />
          </div>
        ) : error ? (
          <p className="text-[0.857rem] text-danger">
            {error instanceof Error ? error.message : "Could not read your brands."}
          </p>
        ) : (brands?.length ?? 0) === 0 ? (
          <Empty onNew={() => setCreating(true)} />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {brands!.map((brand) => (
              <BrandCard key={brand.id} brand={brand} onOpen={() => onSelect(brand.id)} />
            ))}
          </motion.div>
        )}
      </div>
      {modal}
    </div>
  );
}
