import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import type { BrandSummary } from "@genmotion/shared";
import { useAttachedBrand, useBrands } from "./lib/use-brands";
import { usePendingBrandStore } from "./screens/pending-brand-store";
import { BrandMark, Swatches } from "./screens/brands/brand-swatches";
import { useTabsStore } from "./tabs/tabs-store";

/**
 * Which brand this video is for.
 *
 * Sits with the harness, engine and folder pickers rather than being an
 * attachment chip, because that is what it is: a setting on the video, in the
 * same family as "what can the agent see". It is the control `FolderAccess` is
 * the sibling of, and for the same stated reason — a brand chosen weeks ago
 * should not be invisible while the agent is building from it.
 *
 * Two modes, one component. With a `projectId` it reads and writes the real
 * attachment through the loopback, taking effect on the next turn. Without one
 * — the start screen, where no project exists yet — it holds the choice in a
 * store and the create call carries it, so nothing is written for somebody who
 * browses the list and types nothing.
 */

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 4h12v16l-6-4-6 4z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function Row({
  brand,
  selected,
  onPick,
}: {
  brand: BrandSummary;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-surface-hover"
    >
      <BrandMark id={brand.id} name={brand.name} logos={brand.logos} className="size-7 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.929rem] text-text-primary">{brand.name}</span>
        <span className="mt-0.5 block">
          <Swatches colors={brand.colors} max={5} />
        </span>
      </span>
      {selected && <CheckIcon className="size-3.5 shrink-0 text-accent" />}
    </button>
  );
}

export function BrandPicker({
  placement = "up",
  projectId = null,
}: {
  placement?: "up" | "down";
  /** The editor's project. Null on the start screen, where none exists yet. */
  projectId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: brands } = useBrands();

  const attached = useAttachedBrand(projectId);
  const pending = usePendingBrandStore((s) => s.brand);
  const pick = usePendingBrandStore((s) => s.pick);
  const clear = usePendingBrandStore((s) => s.clear);

  const setHomeView = useTabsStore((s) => s.setHomeView);
  const setBrandId = useTabsStore((s) => s.setBrandId);
  const activate = useTabsStore((s) => s.activate);

  const selected = projectId ? attached.brand : pending;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (brand: BrandSummary | null) => {
    if (projectId) attached.attach.mutate(brand?.id ?? null);
    else if (brand) pick(brand);
    else clear();
    setOpen(false);
  };

  /** Send the user to the Brands tab, to build one or to edit this one. */
  const openBrands = (id: string | null) => {
    setOpen(false);
    activate("home");
    setBrandId(id);
    setHomeView("brands");
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={selected ? `Made for ${selected.name}` : "Pick the brand this video is for"}
        className={cx(
          "flex h-8 items-center gap-1.5 rounded-full px-2 text-[0.786rem] transition-colors",
          "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
          open && "bg-surface-hover text-text-primary",
        )}
      >
        {selected ? (
          <BrandMark id={selected.id} name={selected.name} logos={selected.logos} className="size-[1.1rem]" />
        ) : (
          <BookmarkIcon className="size-[0.95rem] shrink-0" />
        )}
        <span className="max-w-32 truncate">{selected?.name ?? "Brand"}</span>
      </button>

      {open && (
        <div
          className={cx(
            "absolute left-0 z-50 max-h-[min(60vh,24rem)] w-72 overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-border bg-surface-raised shadow-[0_16px_50px_rgba(0,0,0,0.5)]",
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <p className="px-3 pb-1 pt-2.5 text-[0.72rem] uppercase tracking-wider text-text-tertiary">
            Make this for
          </p>

          {(brands?.length ?? 0) === 0 ? (
            <div className="px-3 pb-2">
              <p className="text-[0.786rem] leading-snug text-text-tertiary">
                A brand holds a company{"’"}s real logo, exact colours and typefaces. Attach one and
                the agent starts on-brand instead of asking you for hex values.
              </p>
              <button
                type="button"
                onClick={() => openBrands(null)}
                className="mt-2 text-[0.786rem] text-accent hover:underline"
              >
                Create a brand
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => choose(null)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface text-text-tertiary">
                  <BookmarkIcon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.929rem] text-text-primary">No brand</span>
                {!selected && <CheckIcon className="size-3.5 shrink-0 text-accent" />}
              </button>
              {brands!.map((brand) => (
                <Row
                  key={brand.id}
                  brand={brand}
                  selected={selected?.id === brand.id}
                  onPick={() => choose(brand)}
                />
              ))}
            </>
          )}

          <div className="mt-1 border-t border-border px-3 py-2">
            {selected ? (
              <button
                type="button"
                onClick={() => openBrands(selected.id)}
                className="text-[0.786rem] text-text-secondary hover:text-text-primary"
              >
                Edit {selected.name}
              </button>
            ) : (
              (brands?.length ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => openBrands(null)}
                  className="text-[0.786rem] text-text-secondary hover:text-text-primary"
                >
                  Manage brands
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
