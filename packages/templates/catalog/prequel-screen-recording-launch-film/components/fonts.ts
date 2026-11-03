/**
 * Load one extra font face from assets/ inside the export's frame barrier,
 * and build only once it is ready — the same contract as core's withFonts()
 * (which handles Inter), for any other family.
 */
import type { ThreeFrame, ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";

export function withFont(
  ctx: ThreeSceneContext,
  family: string,
  url: string,
  descriptors: FontFaceDescriptors,
  build: () => ThreeSceneUpdate,
): ThreeSceneUpdate {
  const doc = ctx.canvas.ownerDocument;
  type Tagged = FontFace & { __gmUrl?: string };
  let ready = false;
  doc.fonts.forEach((face) => {
    if (face.family.replace(/"/g, "") === family && (face as Tagged).__gmUrl === url && face.status === "loaded") ready = true;
  });
  if (ready) return build();

  let update: ThreeSceneUpdate | null = null;
  let last: ThreeFrame | null = null;
  const key = `font:${url}`;
  ctx.manager.itemStart(key);
  new FontFace(family, `url(${url})`, descriptors)
    .load()
    .then((face) => {
      (face as Tagged).__gmUrl = url;
      (doc.fonts as unknown as Set<FontFace>).add(face);
    })
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
