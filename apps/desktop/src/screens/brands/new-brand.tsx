import { useEffect, useMemo, useState } from "react";
import type { BrandInspection, InspectedColor, InspectedFont, InspectedLogo } from "@genmotion/shared";
import { Modal } from "@/components/modal";
import { Button, Input, Spinner } from "@/components/ui";
import { useBrandMutations } from "../../lib/use-brands";
import { BrandPattern } from "./brand-pattern";
import { LogoPlate, LogoTile } from "./logo-image";

/**
 * Making a brand: paste the address, confirm what was found.
 *
 * The URL comes first because it is the only question worth asking. A company
 * website carries the name, what they do, the palette, the type and the mark,
 * and asking for those one field at a time is the afternoon this feature
 * exists to avoid.
 *
 * It never writes what it found. Every candidate is shown with where it came
 * from and a tick the user controls, and nothing reaches disk until they press
 * the button. A brand that silently populated itself with the wrong blue is
 * worse than an empty one, because an empty one gets filled in and a wrong one
 * never gets re-checked.
 *
 * Skipping the URL is a first-class path, not a fallback: plenty of brands
 * have no website yet, and "I'll add it by hand" should not feel like failure.
 */

type Step = "url" | "review";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Ticked by default except the ones that are usually noise. See `defaults`. */
function useSelection(inspection: BrandInspection | null) {
  const [picked, setPicked] = useState<{ colors: Set<number>; fonts: Set<number>; logos: Set<number> }>(
    () => ({ colors: new Set(), fonts: new Set(), logos: new Set() }),
  );

  useEffect(() => {
    if (!inspection) return;
    setPicked({
      colors: new Set(inspection.colors.map((_, i) => i)),
      fonts: new Set(inspection.fonts.map((_, i) => i)),
      // A favicon is an icon rather than the brand's mark, and a social card
      // is a social card far more often than it is a logo. Both are offered,
      // neither is assumed.
      logos: new Set(
        inspection.logos.flatMap((logo, i) =>
          logo.variant === "mark" || logo.variant === "wordmark" ? [i] : [],
        ),
      ),
    });
  }, [inspection]);

  const toggle = (kind: "colors" | "fonts" | "logos", index: number) =>
    setPicked((current) => {
      const next = new Set(current[kind]);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { ...current, [kind]: next };
    });

  return { picked, toggle };
}

function Row({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-hover">
      <input type="checkbox" checked={checked} onChange={onToggle} className="size-3.5 shrink-0 accent-accent" />
      {children}
    </label>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="mt-3">
      <p className="text-[0.714rem] uppercase tracking-wider text-text-tertiary">
        {title} <span className="text-text-tertiary/70">({count})</span>
      </p>
      <div className="mt-1">{children}</div>
    </section>
  );
}

export function NewBrandModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [step, setStep] = useState<Step>("url");
  const [site, setSite] = useState("");
  const [name, setName] = useState("");
  const [thirdParty, setThirdParty] = useState(true);
  const [inspection, setInspection] = useState<BrandInspection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { create, inspect } = useBrandMutations();
  const { picked, toggle } = useSelection(inspection);
  const busy = create.isPending || inspect.isPending;

  // Drawn from what is ticked, not from everything found: unticking a colour
  // changes the picture, which is the fastest way to judge whether it belongs
  // to the brand.
  const plateLogo = useMemo(() => {
    if (!inspection) return null;
    const chosen = inspection.logos.filter((_, i) => picked.logos.has(i));
    // A favicon is a 32px icon and looks it when blown up on the plate, so a
    // real mark wins even when both are ticked.
    return (chosen.find((l) => l.variant !== "icon") ?? chosen[0])?.src ?? null;
  }, [inspection, picked.logos]);

  const patternColors = useMemo(
    () => (inspection ? inspection.colors.filter((_, i) => picked.colors.has(i)).map((c) => c.hex) : []),
    [inspection, picked.colors],
  );

  // Fresh every time it opens: a dialog that remembers the last company you
  // looked up is a dialog that creates the wrong brand.
  useEffect(() => {
    if (!open) return;
    setStep("url");
    setSite("");
    setName("");
    setThirdParty(true);
    setInspection(null);
    setError(null);
  }, [open]);

  async function read() {
    setError(null);
    try {
      const found = await inspect.mutateAsync(site.trim());
      setInspection(found);
      setName(found.name ?? "");
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that site.");
    }
  }

  /** Straight to the review step with nothing filled in. */
  function skip() {
    setInspection(null);
    setStep("review");
  }

  async function finish() {
    setError(null);
    try {
      const accepted = inspection
        ? {
            site: inspection.url,
            ...(inspection.description ? { description: inspection.description } : {}),
            colors: inspection.colors.filter((_, i) => picked.colors.has(i)) as InspectedColor[],
            fonts: inspection.fonts.filter((_, i) => picked.fonts.has(i)) as InspectedFont[],
            logos: inspection.logos.filter((_, i) => picked.logos.has(i)) as InspectedLogo[],
          }
        : undefined;
      const brand = await create.mutateAsync({
        name: name.trim(),
        ...(inspection?.url ? { site: inspection.url } : site.trim() ? { site: site.trim() } : {}),
        ...(inspection?.description ? { description: inspection.description } : {}),
        thirdParty,
        ...(accepted ? { accepted } : {}),
      });
      onCreated(brand.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the brand.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      dismissible={!busy}
      labelledBy="new-brand-title"
      size="wide"
    >
      {/* The pattern is the right half at every step, including the URL one
          where it idles: a panel that appears only after the fetch would make
          the modal jump at the moment the user is reading it. */}
      <div className="grid h-[min(84vh,38rem)] md:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="flex min-h-0 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 id="new-brand-title" className="text-[1.05rem] font-medium text-text-primary">
            New brand
          </h2>
          <p className="mt-0.5 text-[0.857rem] leading-snug text-text-tertiary">
            {step === "url"
              ? "Paste their website and it reads the name, the palette, the type and the mark."
              : inspection
                ? "Everything below is a guess. Untick what is wrong."
                : "Name it now, and fill in the rest from the brand's page."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="shrink-0 rounded p-1 text-text-tertiary hover:text-text-primary disabled:opacity-50"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {step === "url" ? (
          <>
            <label className="block">
              <span className="text-[0.857rem] text-text-secondary">Website</span>
              <Input
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="acme.com"
                autoFocus
                spellCheck={false}
                className="mt-1.5"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && site.trim() && !busy) void read();
                }}
              />
            </label>
            {/* Full width under the field rather than beside it: this is the
                one thing to do on this step, and a button the width of the
                thing it acts on says so. */}
            <Button
              variant="primary"
              onClick={() => void read()}
              disabled={!site.trim() || busy}
              className="mt-3 w-full"
            >
              {inspect.isPending ? <Spinner className="size-3.5" /> : "Read site"}
            </Button>
            <p className="mt-2.5 text-[0.786rem] leading-snug text-text-tertiary">
              Nothing is saved until you confirm what it found.
            </p>
            <button
              type="button"
              onClick={skip}
              disabled={busy}
              className="mt-4 text-[0.857rem] text-text-secondary hover:text-text-primary disabled:opacity-50"
            >
              No website? Add it by hand
            </button>
          </>
        ) : (
          <>
            <label className="block">
              <span className="text-[0.857rem] text-text-secondary">Name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme"
                autoFocus={!inspection}
                className="mt-1.5"
              />
            </label>

            {inspection?.description && (
              <p className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-[0.786rem] leading-snug text-text-secondary">
                {inspection.description}
              </p>
            )}

            {inspection && (
              <>
                {typeof inspection.confidence === "number" && inspection.confidence < 0.7 && (
                  <p className="mt-3 text-[0.786rem] text-text-tertiary">
                    The colours on this page were hard to read, so check them closely.
                  </p>
                )}

                <Group title="Colours" count={inspection.colors.length}>
                  {inspection.colors.map((color, i) => (
                    <Row key={`${color.hex}-${i}`} checked={picked.colors.has(i)} onToggle={() => toggle("colors", i)}>
                      <span
                        className="size-4 shrink-0 rounded-full border border-border"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="shrink-0 font-mono text-[0.786rem] text-text-primary">{color.hex}</span>
                      <span className="truncate text-[0.786rem] text-text-tertiary">
                        {color.label} · {color.role}
                      </span>
                    </Row>
                  ))}
                </Group>

                <Group title="Type" count={inspection.fonts.length}>
                  {inspection.fonts.map((font, i) => (
                    <Row key={`${font.family}-${i}`} checked={picked.fonts.has(i)} onToggle={() => toggle("fonts", i)}>
                      <span className="min-w-0 flex-1 truncate text-[0.857rem] text-text-primary">
                        {font.family}
                      </span>
                      <span className="shrink-0 text-[0.786rem] text-text-tertiary">{font.role}</span>
                      {/* The file count is the real signal. A family name on
                          its own gets you a video set in Helvetica; the files
                          are what make the type match. */}
                      <span
                        className="shrink-0 text-[0.786rem] text-text-tertiary"
                        title={font.files.map((f) => f.url).join("\n") || undefined}
                      >
                        {font.files.length === 0
                          ? "name only"
                          : `${font.files.length} file${font.files.length === 1 ? "" : "s"}`}
                      </span>
                    </Row>
                  ))}
                  {inspection.fonts.some((f) => f.files.length > 0) && (
                    <p className="mt-1 px-2 text-[0.786rem] leading-snug text-text-tertiary">
                      The font files are downloaded into the brand. Check you are licensed to use
                      them in a video: a webfont licence often covers a website only.
                    </p>
                  )}
                </Group>

                <Group title="Logos" count={inspection.logos.length}>
                  {inspection.logos.map((logo, i) => (
                    <Row key={logo.src} checked={picked.logos.has(i)} onToggle={() => toggle("logos", i)}>
                      {/* Shown before it is fetched: a favicon that turns out
                          to be a generic globe is obvious here and invisible
                          in a filename. The checkerboard is so a white mark on
                          a white ground is still visible. */}
                      <LogoTile src={logo.src} className="size-7 shrink-0" />
                      <span className="shrink-0 text-[0.786rem] text-text-primary">{logo.variant}</span>
                      <span className="truncate text-[0.786rem] text-text-tertiary">{logo.label}</span>
                    </Row>
                  ))}
                </Group>

                {inspection.missing.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-border pt-3">
                    {inspection.missing.map((line) => (
                      <li key={line} className="text-[0.786rem] leading-snug text-text-tertiary">
                        Not found: {line}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-border pt-4">
              <input
                type="checkbox"
                checked={thirdParty}
                onChange={(e) => setThirdParty(e.target.checked)}
                className="mt-0.5 size-3.5 shrink-0 accent-accent"
              />
              <span className="text-[0.857rem] text-text-secondary">
                Someone else{"’"}s brand
                <span className="mt-0.5 block text-[0.786rem] leading-snug text-text-tertiary">
                  The agent treats the video as reference work: no copy claiming to be from them, no
                  invented quotes or figures.
                </span>
              </span>
            </label>
          </>
        )}

        {error && <p className="mt-4 text-[0.857rem] leading-snug text-danger">{error}</p>}
      </div>

      {step === "review" && (
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={() => setStep("url")} disabled={busy}>
            Back
          </Button>
          <Button variant="primary" onClick={() => void finish()} disabled={!name.trim() || busy}>
            {create.isPending ? <Spinner className="size-3.5" /> : "Create brand"}
          </Button>
        </div>
      )}
        </div>

        {/* Hidden on a narrow window rather than stacked: a decorative panel
            above a form it decorates is just something to scroll past. */}
        <div className="relative hidden border-l border-border md:block">
          <BrandPattern colors={patternColors} className="absolute inset-0" />
          <LogoPlate src={plateLogo} />
          {patternColors.length >= 2 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
              {patternColors.map((hex) => (
                <span
                  key={hex}
                  className="rounded-full border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[0.714rem] text-white/90 backdrop-blur-sm"
                >
                  {hex}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
