import { useEffect, useRef, useState } from "react";
import { BRAND_COLOR_ROLES, BRAND_FONT_ROLES, BRAND_LOGO_VARIANTS } from "@genmotion/shared";
import type { BrandColor, BrandDir, BrandFont, BrandLogo } from "@genmotion/shared";
import { Button, Input, Select, Spinner, cx } from "@/components/ui";
import { ColorPicker } from "../../components/color-picker";
import { Section } from "../../components/section";
import { useBrand, useBrandMutations, useBrandUpload } from "../../lib/use-brands";
import { BrandMark, Swatches, brandAssetUrl } from "./brand-swatches";
import { LogoTile } from "./logo-image";

/**
 * One brand: its identity, its files, and the user's own notes.
 *
 * Three sections, in the order a brand gets built. Identity is typed, because
 * a hex has to be exact and nothing can read it off a logo reliably. Files are
 * dragged in, because that is what people already have. Notes are prose,
 * because what a brand actually sounds like is not a field.
 *
 * Edits save on blur rather than behind a Save button: every field here is
 * independent, and a brand is something people come back to and change one
 * value in. The agent picks up a change on the next turn, and any open project
 * using the brand has its `components/brand.ts` rewritten immediately — which
 * is why there is no "apply to projects" step either.
 */

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
    </svg>
  );
}

/**
 * Why every control here has a width.
 *
 * A hex value is seven characters and a typeface name is two words. Left to
 * stretch, they filled the panel: a 680px box for `#1d2bf0`, and rows whose
 * columns did not line up with each other because one of them happened to
 * carry a "guessed" tag. Field width is a readability cue \u2014 it says how much
 * is expected \u2014 so each one is sized to what goes in it, and every row is laid
 * out on the same fixed columns so the eye can run down them.
 */
const FIELD = {
  hex: "w-28",
  colorName: "w-40",
  family: "w-56",
  /** The free-text fields, which want room but not the whole window. */
  prose: "max-w-md",
} as const;

/**
 * One width for every table of editable rows.
 *
 * Wide enough for the longest row, so the delete buttons in Colours and in
 * Type land on the same right edge rather than each stopping wherever its own
 * controls happen to end. Two tables stacked with ragged right edges read as a
 * mistake even when every row within them lines up.
 */
const ROWS = "w-full max-w-xl space-y-2";

/**
 * A fixed slot for the "guessed" tag.
 *
 * Fixed rather than absent-when-unused: an inline tag on only some rows
 * shifted every control after it, so a list of four colours had four different
 * column positions.
 */
function GuessSlot({ source }: { source: string }) {
  return (
    <span className="w-14 shrink-0 text-right">
      <GuessTag source={source} />
    </span>
  );
}

/** "Guessed from their site", kept visible long after the import. */
function GuessTag({ source }: { source: string }) {
  if (source !== "import") return null;
  return (
    <span
      className="rounded bg-surface-raised px-1.5 py-0.5 text-[0.714rem] text-text-tertiary"
      title="Read off their website when the brand was created. Worth confirming."
    >
      guessed
    </span>
  );
}

/* ------------------------------------------------------------------ colours */

function ColorRow({
  color,
  swatches,
  onChange,
  onRemove,
}: {
  color: BrandColor;
  /** The rest of the brand's palette, offered in the picker as one-click chips. */
  swatches: string[];
  onChange: (next: BrandColor) => void;
  onRemove: () => void;
}) {
  const [hex, setHex] = useState(color.hex);
  useEffect(() => setHex(color.hex), [color.hex]);

  const commit = () => {
    const value = hex.trim().startsWith("#") ? hex.trim() : `#${hex.trim()}`;
    // Only a hex that parses is committed. A half-typed value reverting is
    // better than a brand file that will not load, which is what an invalid
    // one does to the whole screen.
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) {
      setHex(color.hex);
      return;
    }
    if (value.toLowerCase() !== color.hex.toLowerCase()) onChange({ ...color, hex: value, source: "user" });
  };

  return (
    <div className="flex items-center gap-2">
      <ColorPicker
        value={color.hex.slice(0, 7)}
        label={`Pick ${color.name ?? color.role} colour`}
        swatches={swatches}
        onChange={(hex) => onChange({ ...color, hex, source: "user" })}
      />
      <div className={cx(FIELD.hex, "shrink-0")}>
        <Input
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="font-mono text-[0.857rem]"
          spellCheck={false}
          aria-label="Hex value"
        />
      </div>
      <div className={cx(FIELD.colorName, "shrink-0")}>
        <Input
          value={color.name ?? ""}
          onChange={(e) => onChange({ ...color, name: e.target.value || undefined })}
          placeholder="Name"
          aria-label="Colour name"
        />
      </div>
      <Select
        value={color.role}
        onChange={(e) => onChange({ ...color, role: e.target.value as BrandColor["role"] })}
        aria-label="What this colour is for"
      >
        {BRAND_COLOR_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </Select>
      <GuessSlot source={color.source} />
      <Button variant="danger" size="sm" onClick={onRemove} aria-label="Remove colour" className="ml-auto">
        <TrashIcon className="size-3.5" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------- files */

function FileGrid({
  brandId,
  dir,
  files,
  onUpload,
  onRemove,
  busy,
}: {
  brandId: string;
  dir: BrandDir;
  files: { file: string; name: string; bytes: number }[];
  onUpload: (files: File[]) => void;
  onRemove: (file: string) => void;
  busy: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const previewable = dir !== "fonts";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const dropped = Array.from(e.dataTransfer.files);
        if (dropped.length) onUpload(dropped);
      }}
      className={cx(
        "rounded-lg border border-dashed p-3 transition-colors",
        over ? "border-accent bg-accent/5" : "border-border",
      )}
    >
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file) => (
            <div key={file.file} className="group relative w-24">
              {previewable ? (
                <LogoTile src={brandAssetUrl(brandId, file.file)} className="h-16 w-full" />
              ) : (
                <div className="flex h-16 items-center justify-center overflow-hidden rounded-md bg-surface-raised p-1.5">
                  <span className="text-[0.714rem] uppercase text-text-tertiary">
                    {file.name.split(".").pop()}
                  </span>
                </div>
              )}
              <p className="mt-1 truncate text-[0.714rem] text-text-tertiary" title={file.name}>
                {file.name}
              </p>
              <button
                type="button"
                onClick={() => onRemove(file.file)}
                className="absolute right-1 top-1 hidden rounded bg-background/90 p-1 text-text-secondary hover:text-danger group-hover:block"
                aria-label={`Remove ${file.name}`}
              >
                <TrashIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex items-center gap-1.5 text-[0.857rem] text-text-secondary hover:text-text-primary disabled:opacity-50"
      >
        {busy ? <Spinner className="size-3.5" /> : <UploadIcon className="size-3.5" />}
        {files.length === 0 ? "Drop files here, or choose" : "Add more"}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const chosen = Array.from(e.target.files ?? []);
          if (chosen.length) onUpload(chosen);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ detail */

export function BrandDetailPanel({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: brand, isLoading, error } = useBrand(id);
  const { save, remove, removeAsset, reveal } = useBrandMutations();
  const upload = useBrandUpload();
  const [uploading, setUploading] = useState<BrandDir | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /**
   * A typeface row that has been added but not named yet.
   *
   * Held here rather than written straight to the brand, because a font with
   * no family is not a thing: the agent would be handed an empty string to set
   * type in. So "Add typeface" shows a row, and the row becomes a font when it
   * has a name.
   */
  const [draftFont, setDraftFont] = useState<BrandFont["role"] | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner className="size-4 text-text-tertiary" />
      </div>
    );
  }
  if (error || !brand) {
    return (
      <div className="py-8">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back to brands
        </Button>
        <p className="mt-4 text-[0.857rem] text-danger">
          {error instanceof Error ? error.message : "That brand could not be read."}
        </p>
        <p className="mt-1 text-[0.786rem] text-text-tertiary">
          Its <code>brand.json</code> may have been hand-edited. Open the folder and fix or delete
          it.
        </p>
      </div>
    );
  }

  const patch = (fields: Partial<typeof brand>) => save.mutate({ id, ...fields });

  const doUpload = async (dir: BrandDir, files: File[]) => {
    setUploading(dir);
    // Sequentially: each one re-reads and rewrites `brand.json` to register a
    // logo, and three of those racing would lose two of the three.
    for (const file of files) {
      await upload.mutateAsync({ id, dir, file }).catch(() => {});
    }
    setUploading(null);
  };

  return (
    <div className="pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Brands
        </Button>
        <span className="text-text-tertiary">/</span>
        <BrandMark id={brand.id} name={brand.name} logos={brand.logos} className="size-8" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-medium text-text-primary">{brand.name}</h2>
          <p className="truncate text-[0.786rem] text-text-tertiary">{brand.dir}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => reveal.mutate(id)}>
          Show in Finder
        </Button>
      </div>

      {/* Reassurance rather than decoration: this is what the agent will be
          working from, and seeing it summarised is how somebody knows the brand
          is actually set up rather than half-filled. Directly under the header,
          because it is read on arrival — below the form it sat under "Delete
          brand", which is the last place to put a reassuring line. */}
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2">
        <Swatches colors={brand.colors} />
        <span className="text-[0.786rem] text-text-tertiary">
          {brand.logos.length} logo{brand.logos.length === 1 ? "" : "s"} ·{" "}
          {brand.counts.references} reference{brand.counts.references === 1 ? "" : "s"} ·{" "}
          {brand.fonts.length} typeface{brand.fonts.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* `gap-4`, the same as Settings' column: `Section` carries no margin of
          its own, so cards stacked in a plain div sit flush and read as one
          long box rather than as separate groups. */}
      <div className="mt-4 flex flex-col gap-4">
        <Section title="Identity" description="The values every video for this brand is built from.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[0.857rem] text-text-secondary">Name</span>
              <Input
                defaultValue={brand.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== brand.name && patch({ name: e.target.value.trim() })}
                className="mt-1.5"
              />
            </label>
            <label className="block">
              <span className="text-[0.857rem] text-text-secondary">Website</span>
              <Input
                defaultValue={brand.site ?? ""}
                placeholder="acme.com"
                onBlur={(e) => e.target.value !== (brand.site ?? "") && patch({ site: e.target.value })}
                className="mt-1.5"
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="text-[0.857rem] text-text-secondary">What they do</span>
            <textarea
              defaultValue={brand.description ?? ""}
              rows={2}
              placeholder="Purpose-built for planning and building products."
              onBlur={(e) =>
                e.target.value.trim() !== (brand.description ?? "") &&
                patch({ description: e.target.value.trim() || undefined })
              }
              className="mt-1.5 w-full rounded-md border border-border bg-surface p-3 text-[0.857rem] leading-relaxed text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/60"
            />
            <span className="mt-1 block text-[0.786rem] leading-snug text-text-tertiary">
              The one thing here that says what a video is about rather than what it should look
              like. Taken from their site on import.
            </span>
          </label>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={brand.thirdParty}
              onChange={(e) => patch({ thirdParty: e.target.checked })}
              className="mt-0.5 size-3.5 accent-accent"
            />
            <span className="text-[0.857rem] text-text-secondary">
              Someone else{"’"}s brand
              <span className="mt-0.5 block text-[0.786rem] text-text-tertiary">
                The agent treats the video as reference work: no copy claiming to be from them, no
                invented quotes or figures.
              </span>
            </span>
          </label>
        </Section>

        <Section
          title="Colours"
          description="Exact values, because nothing can read them off a screenshot reliably. The agent is told to use these and not to sample."
        >
          <div className={ROWS}>
            {/* Keyed by position, not by value.
                A key containing the hex meant every change of colour was a new
                key: React unmounted the row and mounted a fresh one, taking the
                open picker with it. That is what made the old picker vanish the
                moment you dragged. Nothing here reorders, and every row's state
                is derived from its props, so the index is a stable identity. */}
            {brand.colors.map((color, i) => (
              <ColorRow
                key={i}
                color={color}
                swatches={brand.colors.filter((_, j) => j !== i).map((c) => c.hex)}
                onChange={(next) => patch({ colors: brand.colors.map((c, j) => (j === i ? next : c)) })}
                onRemove={() => patch({ colors: brand.colors.filter((_, j) => j !== i) })}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() =>
              patch({
                colors: [
                  ...brand.colors,
                  { hex: "#000000", role: brand.colors.length === 0 ? "primary" : "other", source: "user" },
                ],
              })
            }
          >
            Add colour
          </Button>
        </Section>

        <Section
          title="Type"
          description="A family name is enough for the agent to set type. A file is only needed for a licensed face."
        >
          <div className={ROWS}>
            {/* Keyed by position for the same reason as the colours above:
                renaming a family must not remount the row being typed into. */}
            {brand.fonts.map((font, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={font.role}
                  onChange={(e) =>
                    patch({
                      fonts: brand.fonts.map((f, j) =>
                        j === i ? { ...f, role: e.target.value as BrandFont["role"] } : f,
                      ),
                    })
                  }
                  aria-label="What this face is for"
                >
                  {BRAND_FONT_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
                <div className={cx(FIELD.family, "shrink-0")}>
                  <Input
                    defaultValue={font.family}
                    placeholder="Söhne"
                    aria-label="Family name"
                    onBlur={(e) =>
                      e.target.value.trim() !== font.family &&
                      e.target.value.trim() &&
                      patch({
                        fonts: brand.fonts.map((f, j) =>
                          j === i ? { ...f, family: e.target.value.trim(), source: "user" } : f,
                        ),
                      })
                    }
                  />
                </div>
                {/* How many real files back this family, which is the
                    difference between type that matches and type that falls
                    back to Helvetica. Bounded so the delete button stays on the
                    same column as the Colours table above. */}
                <span
                  className="w-32 shrink-0 truncate text-[0.714rem] text-text-tertiary"
                  title={font.files.map((f) => f.file).join("\n") || undefined}
                >
                  {font.files.length === 0
                    ? "name only"
                    : `${font.files.length} file${font.files.length === 1 ? "" : "s"}`}
                </span>
                <GuessSlot source={font.source} />
                <Button
                  variant="danger"
                  size="sm"
                  className="ml-auto"
                  aria-label="Remove font"
                  onClick={() => patch({ fonts: brand.fonts.filter((_, j) => j !== i) })}
                >
                  <TrashIcon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          {draftFont && (
            <div className="mt-2 flex items-center gap-2">
              <Select
                value={draftFont}
                onChange={(e) => setDraftFont(e.target.value as BrandFont["role"])}
                aria-label="What this face is for"
              >
                {BRAND_FONT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
              <div className={cx(FIELD.family, "shrink-0")}>
              <Input
                autoFocus
                placeholder="Söhne"
                aria-label="Family name"
                onBlur={(e) => {
                  const family = e.target.value.trim();
                  // Abandoned rather than saved: an unnamed row is somebody
                  // who clicked the button and changed their mind.
                  if (family) patch({ fonts: [...brand.fonts, { role: draftFont, family, files: [], source: "user" }] });
                  setDraftFont(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              </div>
              <span className="text-[0.786rem] text-text-tertiary">
                The family name, as CSS would write it
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            disabled={draftFont !== null}
            onClick={() => setDraftFont(brand.fonts.length === 0 ? "display" : "body")}
          >
            Add typeface
          </Button>
        </Section>

        <Section
          title="Logos"
          description="The real files. Every project using this brand gets them copied in, and the agent is told never to redraw a mark."
        >
          <FileGrid
            brandId={brand.id}
            dir="logos"
            files={brand.files.logos}
            busy={uploading === "logos"}
            onUpload={(files) => void doUpload("logos", files)}
            onRemove={(file) => removeAsset.mutate({ id, file })}
          />
          {brand.logos.length > 0 && (
            <div className="mt-3 space-y-2">
              {brand.logos.map((logo, i) => (
                <div key={logo.file} className="flex items-center gap-2">
                  <LogoTile src={brandAssetUrl(brand.id, logo.file)} className="size-7 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[0.786rem] text-text-tertiary">
                    {logo.file}
                  </span>
                  <Select
                    value={logo.variant}
                    onChange={(e) =>
                      patch({
                        logos: brand.logos.map((l, j) =>
                          j === i ? { ...l, variant: e.target.value as BrandLogo["variant"] } : l,
                        ),
                      })
                    }
                   
                  >
                    {BRAND_LOGO_VARIANTS.map((variant) => (
                      <option key={variant} value={variant}>
                        {variant}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={logo.on}
                    onChange={(e) =>
                      patch({
                        logos: brand.logos.map((l, j) =>
                          j === i ? { ...l, on: e.target.value as BrandLogo["on"] } : l,
                        ),
                      })
                    }
                   
                  >
                    <option value="any">any ground</option>
                    <option value="light">on light</option>
                    <option value="dark">on dark</option>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Delete" description="Removes the folder and everything in it, and detaches it from every project using it.">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[0.857rem] text-text-secondary">
                Delete {brand.name} and its files?
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  remove.mutate(id);
                  onBack();
                }}
              >
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete brand
            </Button>
          )}
        </Section>
      </div>

    </div>
  );
}
