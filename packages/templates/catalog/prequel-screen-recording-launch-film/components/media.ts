/**
 * Footage as a texture that is SEEKED from the frame, never played — the
 * pack's tested footage() helper (three-assets). Every seek is registered on
 * ctx.manager, so a capture waits for the decoded frame before reading pixels.
 * Use VP9 WebM: the export's Chromium cannot decode H.264.
 */
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

export function footage(ctx: ThreeSceneContext, url: string, opts: { from?: number; size?: [number, number] } = {}) {
  const from = opts.from ?? 0;
  const [cw, ch] = opts.size ?? [1920, 1080];
  const el = ctx.canvas.ownerDocument.createElement("video");
  el.muted = true;
  el.playsInline = true;
  el.preload = "auto";
  el.crossOrigin = "anonymous";

  const canvas = new OffscreenCanvas(cw, ch);
  const g = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  const grab = () => {
    g.drawImage(el, 0, 0, cw, ch);
    tex.needsUpdate = true;
  };

  const key = `video:${url}`;
  let busy = true;
  let pending: number | null = null;
  const done = () => {
    if (!busy) return;
    busy = false;
    ctx.manager.itemEnd(key);
  };
  const go = (t: number) => {
    if (Math.abs(el.currentTime - t) < 1e-3) return;
    if (!busy) {
      busy = true;
      ctx.manager.itemStart(key);
    }
    el.currentTime = t;
  };
  ctx.manager.itemStart(key);
  el.addEventListener("loadeddata", () => {
    grab();
    const t = pending;
    pending = null;
    if (t !== null && Math.abs(el.currentTime - t) >= 1e-3) el.currentTime = t;
    else done();
  });
  el.addEventListener("seeked", () => {
    grab();
    done();
  });
  el.addEventListener("error", done);
  el.src = url;

  return {
    texture: tex,
    el,
    /** Show the frame at `time` seconds into this clip; holds the last frame past the end. */
    seek(time: number) {
      const end = Number.isFinite(el.duration) ? el.duration - 0.02 : Infinity;
      const t = Math.min(Math.max(0, from + time + 0.25 / ctx.fps), end);
      if (el.readyState < 2) pending = t;
      else go(t);
    },
  };
}
