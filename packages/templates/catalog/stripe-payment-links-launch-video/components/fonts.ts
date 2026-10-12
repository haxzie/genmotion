import type { ThreeSceneContext, ThreeSceneUpdate, ThreeFrame } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import monoUrl from "../assets/JetBrainsMono.woff2";

export const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
export const MONO = '"JetBrains Mono", Menlo, monospace';

const FONTS = [
  { family: "Inter", url: interUrl, weight: "100 900" },
  { family: "JetBrains Mono", url: monoUrl, weight: "400" },
];

type TaggedFace = FontFace & { __gmUrl?: string };

/**
 * Run the builder only once Inter + JetBrains Mono are loaded (through the
 * frame barrier).
 *
 * A registered face is matched on the URL it loaded from, not on the family
 * name: the editor keeps one document across every rebuild, so a face left
 * behind by an older file outlives the scene, and matching on the name alone
 * would make swapping the file a no-op in the preview while every fresh render
 * showed the new one.
 */
export function withFonts(ctx: ThreeSceneContext, build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  const faceFor = (family: string): TaggedFace | null => {
    let hit: TaggedFace | null = null;
    doc.fonts.forEach((face) => {
      if (face.family.replace(/"/g, "") === family) hit = face as TaggedFace;
    });
    return hit;
  };

  const stale: FontFace[] = [];
  const ready = FONTS.every((f) => {
    const face = faceFor(f.family);
    if (!face) return false;
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
  const key = "fonts:inter+mono";
  ctx.manager.itemStart(key);
  Promise.all(
    FONTS.map((f) =>
      new FontFace(f.family, `url(${f.url})`, { weight: f.weight }).load().then((face) => {
        (face as TaggedFace).__gmUrl = f.url;
        (doc.fonts as unknown as Set<FontFace>).add(face);
      }),
    ),
  )
    .catch(() => undefined)
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
