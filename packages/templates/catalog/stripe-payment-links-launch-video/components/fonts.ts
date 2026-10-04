import type { ThreeSceneContext, ThreeSceneUpdate, ThreeFrame } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import monoUrl from "../assets/JetBrainsMono.woff2";

export const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
export const MONO = '"JetBrains Mono", Menlo, monospace';

const FONTS = [
  { family: "Inter", url: interUrl, weight: "100 900" },
  { family: "JetBrains Mono", url: monoUrl, weight: "400" },
];

/** Run the builder only once Inter + JetBrains Mono are loaded (through the frame barrier). */
export function withFonts(ctx: ThreeSceneContext, build: () => ThreeSceneUpdate): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  const loaded = new Set<string>();
  doc.fonts.forEach((face) => {
    if (face.status === "loaded") loaded.add(face.family.replace(/"/g, ""));
  });
  if (FONTS.every((f) => loaded.has(f.family))) return build();

  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = "fonts:inter+mono";
  ctx.manager.itemStart(key);
  Promise.all(
    FONTS.map((f) =>
      new FontFace(f.family, `url(${f.url})`, { weight: f.weight }).load().then((face) => {
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
