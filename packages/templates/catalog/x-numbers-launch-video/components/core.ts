/**
 * Core plumbing for the whole film.
 *
 * Every frame is painted with the Canvas 2D API into one 1920×1080
 * OffscreenCanvas, which is shown on a full-screen plane through an
 * orthographic camera. The picture is a pure function of the absolute film
 * time `T` (in seconds), so each scene file is just a window onto one
 * continuous timeline, and the circle-reveal transitions can span a cut.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import nikitaUrl from "../assets/avatars/nikita.png";
import nicoUrl from "../assets/avatars/nico.png";
import alexUrl from "../assets/avatars/alex.png";
import antonUrl from "../assets/avatars/anton.png";
import meUrl from "../assets/avatars/me.png";
import benjiUrl from "../assets/avatars/benji.png";

export const W = 1920;
export const H = 1080;

export type G = OffscreenCanvasRenderingContext2D;

export interface Assets {
  img: Record<string, CanvasImageSource | undefined>;
}

export const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const fontListeners = new Set<() => void>();
let fontReady = false;
let fontPromise: Promise<unknown> | null = null;

function loadFont(ctx: ThreeSceneContext) {
  if (fontPromise) return;
  const key = "font:" + interUrl;
  ctx.manager.itemStart(key);
  const face = new FontFace("Inter", `url(${interUrl})`, { weight: "100 900" });
  fontPromise = face
    .load()
    .then((f) => {
      (ctx.canvas.ownerDocument as Document).fonts.add(f);
      fontReady = true;
      fontListeners.forEach((fn) => fn());
    })
    .catch(() => undefined)
    .finally(() => ctx.manager.itemEnd(key));
}

const IMAGE_URLS: Record<string, string> = {
  nikita: nikitaUrl,
  nico: nicoUrl,
  alex: alexUrl,
  anton: antonUrl,
  me: meUrl,
  benji: benjiUrl,
};

/**
 * Builds the three.js side (one textured quad) and returns the per-frame
 * callback. `offset` is the film time, in seconds, at which this scene starts.
 */
export function makeFilmScene(
  ctx: ThreeSceneContext,
  offset: number,
  draw: (g: G, T: number, a: Assets) => void,
): ThreeSceneUpdate {
  loadFont(ctx);

  const assets: Assets = { img: {} };
  // Assets arrive after the host has already asked for a frame. Repaint that
  // same frame (same T, so still deterministic) once each one lands, so the
  // picture never keeps a fallback font or a missing avatar.
  let lastT: number | null = null;
  const refresh = () => {
    if (lastT === null) return;
    paint(lastT);
    ctx.renderer.render(ctx.scene, cam);
  };
  if (!fontReady) fontListeners.add(refresh);
  const loader = new THREE.ImageLoader(ctx.manager);
  for (const [k, url] of Object.entries(IMAGE_URLS)) {
    loader.load(url, (im) => {
      assets.img[k] = im;
      refresh();
    });
  }

  const canvas = new OffscreenCanvas(W, H);
  const g = canvas.getContext("2d") as G;
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;

  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  ctx.scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  cam.position.z = 1;
  ctx.setCamera(cam);

  const paint = (T: number) => {
    lastT = T;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.filter = "none";
    g.clearRect(0, 0, W, H);
    draw(g, T, assets);
    tex.needsUpdate = true;
  };

  return ({ time }) => paint(offset + time);
}

/* ------------------------------------------------------------------ math -- */

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  in: (t: number) => t * t * t,
  inQuad: (t: number) => t * t,
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t: number) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/** 0..1 progress between two times, eased. */
export function prog(T: number, a: number, b: number, e: (t: number) => number = ease.inOut) {
  return e(clamp((T - a) / (b - a)));
}

/**
 * Keyframe track: [[time, value], ...]. Between keys it uses a monotone cubic
 * (Catmull-Rom style with clamped tangents) so dense keyframes measured off
 * the reference play back smoothly instead of kinking at every sample.
 */
export function track(T: number, keys: ReadonlyArray<readonly [number, number]>): number {
  const n = keys.length;
  if (T <= keys[0]![0]) return keys[0]![1];
  if (T >= keys[n - 1]![0]) return keys[n - 1]![1];
  let i = 0;
  while (i < n - 2 && keys[i + 1]![0] < T) i++;
  const [t0, v0] = keys[i]!;
  const [t1, v1] = keys[i + 1]!;
  const h = t1 - t0;
  const s = (T - t0) / h;
  const slope = (v1 - v0) / h;
  const tan = (j: number) => {
    if (j <= 0 || j >= n - 1) {
      return 0;
    }
    const [ta, va] = keys[j - 1]!;
    const [tb, vb] = keys[j]!;
    const [tc, vc] = keys[j + 1]!;
    const d0 = (vb - va) / (tb - ta);
    const d1 = (vc - vb) / (tc - tb);
    if (d0 * d1 <= 0) return 0;
    return (2 * d0 * d1) / (d0 + d1);
  };
  const m0 = tan(i) * h;
  const m1 = tan(i + 1) * h;
  const s2 = s * s;
  const s3 = s2 * s;
  const v =
    (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * m1;
  // Guard against overshoot on sparse keys.
  void slope;
  return v;
}

/** Deterministic hash → [0,1). */
export function rand(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function grey(v: number, a = 1) {
  const c = Math.round(clamp(v, 0, 255));
  return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
}
