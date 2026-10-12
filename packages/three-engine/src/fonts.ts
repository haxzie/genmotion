import type { ThreeSceneContext, ThreeFrame, ThreeSceneUpdate } from "./context";

/**
 * One font file a scene draws with.
 *
 * `url` is what the project's bundler turned the `import … from
 * "../assets/X.woff2"` into, so it changes whenever the file behind it does —
 * which is what makes a swapped font visible (see `withFonts`).
 */
export interface FontFile {
  family: string;
  url: string;
  /** Defaults to `100 900`: a variable file covers the whole range. */
  weight?: string;
  /** `italic` for an italic file. One family may carry both. */
  style?: string;
  /** OpenType features, e.g. `"tnum" 1` for tabular figures. */
  features?: string;
  /**
   * Variable-font axes to pin, e.g. `'opsz' 58`.
   *
   * Canvas 2D has no `font-optical-sizing` and no `font-variation-settings`,
   * so a variable face always draws its default instance however large the
   * type is. A font with an `opsz` axis (Jaro, Nunito Sans, Roboto Flex) set
   * at display size looks nothing like its specimen page until the axis is
   * pinned here, by hand, to the size the type is drawn at.
   */
  variation?: string;
}

const weightOf = (f: FontFile) => f.weight ?? "100 900";
const styleOf = (f: FontFile) => f.style ?? "normal";

/** `variationSettings` is real in Chromium but missing from lib.dom's descriptors. */
const descriptors = (f: FontFile): FontFaceDescriptors =>
  ({
    weight: weightOf(f),
    style: styleOf(f),
    featureSettings: f.features,
    variationSettings: f.variation,
  }) as FontFaceDescriptors;

/** The source a face we registered came from, so a changed file is noticed. */
type TaggedFace = FontFace & { __gmUrl?: string };

/**
 * The face already registered for this file's slot, if any.
 *
 * A slot is family + weight + style: what CSS selects a face by, and what one
 * entry in `fonts` can replace. A family may hold several (Poppins 400 beside
 * Poppins 500, an italic beside its roman), so matching on the family name
 * alone would have each entry evicting its own siblings on every rebuild.
 */
const faceInSlot = (doc: Document, f: FontFile): TaggedFace | null => {
  let hit: TaggedFace | null = null;
  doc.fonts.forEach((face) => {
    const matches =
      face.family.replace(/"/g, "") === f.family &&
      face.weight === weightOf(f) &&
      face.style === styleOf(f);
    if (matches) hit = face as TaggedFace;
  });
  return hit;
};

/**
 * Build the scene only once its font files have loaded, so no texture is ever
 * drawn in a fallback face.
 *
 * The load is registered on `ctx.manager`, so the export's frame barrier waits
 * for it; when it lands, the builder runs and the last requested frame is
 * re-posed before the barrier releases.
 *
 * Why a face is tracked by URL and not by family name: an export opens a fresh
 * offscreen window per capture, but the editor keeps one document alive across
 * every rebuild, so `doc.fonts` outlives the scene that filled it. Skipping on
 * the family name alone made swapping the *file* behind a family a no-op in
 * the preview — the old face stayed registered and kept drawing — while every
 * fresh render showed the new one. That reads, from the outside, as a font
 * that will not change however many times it is changed. So each face is
 * tagged with the URL it loaded from, and a face whose URL no longer matches
 * is deleted before the new one is added (`doc.fonts.add` does not replace by
 * family: both faces would stay registered, and which one draws is anyone's
 * guess).
 */
export function withFonts(
  ctx: ThreeSceneContext,
  fonts: FontFile[],
  build: () => ThreeSceneUpdate,
): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  const stale: FontFace[] = [];
  const ready = fonts.every((f) => {
    const face = faceInSlot(doc, f);
    if (!face) return false;
    // An untagged face came from the host page, not from us: leave it alone.
    if (face.__gmUrl !== undefined && face.__gmUrl !== f.url) {
      stale.push(face);
      return false;
    }
    return face.status === "loaded";
  });
  for (const face of stale) (doc.fonts as unknown as Set<FontFace>).delete(face);
  if (ready) return build();

  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = `fonts:${fonts.map((f) => f.url).join(",")}`;
  ctx.manager.itemStart(key);
  Promise.all(
    fonts.map((f) =>
      new FontFace(f.family, `url(${f.url})`, descriptors(f))
        .load()
        .then((face) => {
          (face as TaggedFace).__gmUrl = f.url;
          (doc.fonts as unknown as Set<FontFace>).add(face); // typed only with the DOM.Iterable lib
        }),
    ),
  )
    .catch(() => undefined) // a missing font must not hang the export; the fallback face draws instead
    .then(() => {
      update = build();
      if (last) update(last);
    })
    .finally(() => ctx.manager.itemEnd(key));
  return (frame) => {
    last = frame;
    update?.(frame);
  };
}
