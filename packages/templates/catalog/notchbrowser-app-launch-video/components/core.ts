/**
 * Core plumbing for the whole film.
 *
 * The teaser is ONE continuous shot, so every scene file is just a window
 * onto a single timeline (film time `T`, seconds). Each frame is painted with
 * Canvas 2D into a 1920×1080 OffscreenCanvas that three.js shows on a
 * full-screen quad. On top of that we get:
 *   - real motion blur: fast frames are re-rendered at several sub-frame
 *     times across a 180° shutter and averaged,
 *   - a light film-grain finish.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { IMAGE_URLS } from "./images";

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const FONT = "Inter, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export type G = OffscreenCanvasRenderingContext2D;

export interface Assets {
  img: Record<string, HTMLImageElement | undefined>;
  /** Bumps whenever the font or an image lands, so caches know to rebuild. */
  version: number;
  fontReady: boolean;
}

export interface Film {
  /** Paint the picture at film time T (no grain; that is added once after blur). */
  draw: (g: G, T: number, a: Assets) => void;
  /** How many sub-frame samples this moment needs for motion blur (1 = none). */
  samples: (T: number) => number;
}

/* ------------------------------------------------------------ shared state */

const assets: Assets = { img: {}, version: 0, fontReady: false };
const listeners = new Set<() => void>();
let started = false;

function startLoading(ctx: ThreeSceneContext) {
  if (started) return;
  started = true;
  const bump = () => {
    assets.version++;
    listeners.forEach((fn) => fn());
  };
  const key = "font:" + interUrl;
  ctx.manager.itemStart(key);
  const face = new FontFace("Inter", `url(${interUrl})`, { weight: "100 900" });
  face
    .load()
    .then((f) => {
      (ctx.canvas.ownerDocument as Document).fonts.add(f);
      assets.fontReady = true;
      bump();
    })
    .catch(() => undefined)
    .finally(() => ctx.manager.itemEnd(key));

  const loader = new THREE.ImageLoader(ctx.manager);
  for (const [k, url] of Object.entries(IMAGE_URLS)) {
    loader.load(url, (im) => {
      assets.img[k] = im;
      bump();
    });
  }
}

/* ------------------------------------------------------------------- grain */

let grain: OffscreenCanvas[] | null = null;
function grainTiles(): OffscreenCanvas[] {
  if (grain) return grain;
  grain = [];
  const gw = 1024;
  const gh = 576;
  for (let t = 0; t < 4; t++) {
    const c = new OffscreenCanvas(gw, gh);
    const cg = c.getContext("2d") as G;
    const id = cg.createImageData(gw, gh);
    let s = 1234567 + t * 7919;
    for (let i = 0; i < gw * gh; i++) {
      // xorshift — deterministic, fast
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      const v = ((s >>> 0) % 1000) / 1000;
      const n = Math.round(128 + (v - 0.5) * 150);
      id.data[i * 4] = n;
      id.data[i * 4 + 1] = n;
      id.data[i * 4 + 2] = n;
      id.data[i * 4 + 3] = 255;
    }
    cg.putImageData(id, 0, 0);
    grain.push(c);
  }
  return grain;
}

function finish(g: G, T: number) {
  const f = Math.floor(T * FPS + 1e-6);
  const tiles = grainTiles();
  const tile = tiles[((f % 4) + 4) % 4]!;
  const ox = -Math.floor(rand(f * 3.1) * 120);
  const oy = -Math.floor(rand(f * 7.7) * 70);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = "none";
  g.globalCompositeOperation = "overlay";
  g.globalAlpha = 0.085;
  g.drawImage(tile, ox, oy, 2048, 1152);
  g.globalCompositeOperation = "source-over";
  // A soft vignette to seat the frame.
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.28)");
  g.globalAlpha = 1;
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
}

/* ---------------------------------------------------------------- the quad */

/** 180° shutter at 30fps. */
const SHUTTER = 0.5 / FPS;

export function makeFilmScene(ctx: ThreeSceneContext, offset: number, film: Film): ThreeSceneUpdate {
  startLoading(ctx);

  const main = new OffscreenCanvas(W, H);
  const g = main.getContext("2d") as G;
  const scratch = new OffscreenCanvas(W, H);
  const sg = scratch.getContext("2d") as G;

  const tex = new THREE.CanvasTexture(main as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
  );
  ctx.scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  cam.position.z = 1;
  ctx.setCamera(cam);

  const reset = (c: G) => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.filter = "none";
    c.shadowColor = "transparent";
    c.shadowBlur = 0;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
  };

  let lastT: number | null = null;
  const paint = (T: number) => {
    lastT = T;
    const n = Math.max(1, Math.min(10, Math.round(film.samples(T))));
    if (n === 1) {
      reset(g);
      film.draw(g, T, assets);
    } else {
      for (let i = 0; i < n; i++) {
        const t = T - SHUTTER / 2 + (SHUTTER * (i + 0.5)) / n;
        reset(sg);
        film.draw(sg, t, assets);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.filter = "none";
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1 / (i + 1);
        g.drawImage(scratch, 0, 0);
      }
    }
    finish(g, T);
    tex.needsUpdate = true;
  };

  const refresh = () => {
    if (lastT === null) return;
    paint(lastT);
    ctx.renderer.render(ctx.scene, cam);
  };
  listeners.add(refresh);

  return ({ time }) => paint(offset + time);
}

/* -------------------------------------------------------------------- math */

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Ease = (t: number) => number;
export const ease = {
  linear: ((t) => t) as Ease,
  out: ((t) => 1 - Math.pow(1 - t, 3)) as Ease,
  outQuart: ((t) => 1 - Math.pow(1 - t, 4)) as Ease,
  outQuint: ((t) => 1 - Math.pow(1 - t, 5)) as Ease,
  in: ((t) => t * t * t) as Ease,
  inQuad: ((t) => t * t) as Ease,
  inOut: ((t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)) as Ease,
  inOutSine: ((t) => -(Math.cos(Math.PI * t) - 1) / 2) as Ease,
  /** Signature "smooth" ease-out. */
  outSmooth: ((t) => 1 - Math.pow(1 - t, 3.2)) as Ease,
  outBack: ((t) => {
    const c1 = 1.9;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }) as Ease,
};

/** 0..1 eased progress between two film times. */
export function prog(T: number, a: number, b: number, e: Ease = ease.inOut) {
  return e(clamp((T - a) / (b - a)));
}

/** Deterministic hash → [0,1). */
export function rand(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
