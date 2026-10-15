/**
 * Build a scene only once Aeonik is loaded AND usable by canvas, inside the
 * export's frame barrier.
 *
 * Canvas text is drawn once in the builder, so if the face isn't ready at that
 * moment the texture is baked in the browser's default font (a serif) for good.
 * So this always: registers the woff2 files as FontFaces (replacing stale faces
 * from an earlier file), waits for `fonts.load()` of every weight, confirms with
 * `fonts.check()`, and only then builds — re-posing the last requested frame.
 */
import type { ThreeSceneContext, ThreeSceneUpdate, ThreeFrame } from "@genmotion/three-engine";
import { FONTS, FAMILY } from "./brand";

type FontSet = {
  add(f: FontFace): void;
  delete(f: FontFace): boolean;
  load(font: string): Promise<FontFace[]>;
  check(font: string): boolean;
  [Symbol.iterator](): Iterator<FontFace>;
};

function fontSet(): FontSet | null {
  const g = globalThis as unknown as { document?: { fonts?: FontSet }; fonts?: FontSet };
  return g.document?.fonts ?? g.fonts ?? null;
}

const probe = (weight?: string) => `${weight ?? "400"} 40px "${FAMILY}"`;

export function withBrandFonts(ctx: ThreeSceneContext, build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  const set = fontSet();
  if (!set) return build();

  const urlOf = (f: FontFace) => (f as unknown as { __gmUrl?: string }).__gmUrl;
  const ready = () =>
    FONTS.every((f) => {
      for (const face of set) if (urlOf(face) === f.url && face.status === "loaded") return set.check(probe(f.weight));
      return false;
    });
  if (ready()) return build();

  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = "brand-fonts";
  ctx.manager.itemStart(key);

  // drop faces of this family that came from another file (or an untagged loader)
  for (const face of Array.from(set)) {
    const fam = face.family.replace(/["']/g, "");
    if (fam === FAMILY && !FONTS.some((f) => f.url === urlOf(face))) set.delete(face);
  }

  const finish = () => {
    if (!update) {
      update = build();
      if (last) update(last);
    }
    ctx.manager.itemEnd(key);
  };

  Promise.all(
    FONTS.map((f) => {
      const face = new FontFace(f.family, `url(${f.url})`, { weight: f.weight ?? "400", style: f.style ?? "normal" });
      (face as unknown as { __gmUrl: string }).__gmUrl = f.url;
      return face.load().then((loaded) => set.add(loaded));
    }),
  )
    .then(() => Promise.all(FONTS.map((f) => set.load(probe(f.weight)))))
    .then(finish, finish);

  return (frame) => {
    last = frame;
    if (update) update(frame);
  };
}
