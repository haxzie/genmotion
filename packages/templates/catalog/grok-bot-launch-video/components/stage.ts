import * as THREE from "three";
import { track, type ThreeSceneContext } from "@genmotion/three-engine";
import { SANS } from "./brand";

/**
 * The reference film is 1280×720. Every scene is laid out in those pixels
 * (x right, y DOWN, origin top-left) so positions can be read straight off a
 * reference frame; the orthographic camera maps them onto the real
 * composition (1920×1080 → 1.5× px per unit).
 */
export const REF_W = 1280;
export const REF_H = 720;

export type Stage = {
  scene: THREE.Scene;
  cam: THREE.OrthographicCamera;
  /** Camera framing in ref px: centre (x, y) and zoom (1 = full frame). */
  view: (x: number, y: number, zoom: number) => void;
};

export function setupStage(ctx: ThreeSceneContext, bg: string): Stage {
  const { scene, width, height, renderer } = ctx;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const halfH = REF_H / 2;
  const halfW = halfH * (width / height);
  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, -2000, 2000);
  cam.position.set(0, 0, 100);
  ctx.setCamera(cam);
  scene.background = new THREE.Color(bg);
  const view = (x: number, y: number, zoom: number) => {
    cam.position.x = x - REF_W / 2;
    cam.position.y = REF_H / 2 - y;
    cam.zoom = zoom;
    cam.updateProjectionMatrix();
  };
  view(REF_W / 2, REF_H / 2, 1);
  return { scene, cam, view };
}

/** Put an object's centre at ref-px (x, y). */
export function place<T extends THREE.Object3D>(o: T, x: number, y: number): T {
  o.position.x = x - REF_W / 2;
  o.position.y = REF_H / 2 - y;
  return o;
}

/** Local offset inside a group (ref px, y down) — no origin shift. */
export function local<T extends THREE.Object3D>(o: T, x: number, y: number): T {
  o.position.x = x;
  o.position.y = -y;
  return o;
}

let ORDER = 0;
/** Draw order: later calls draw on top unless an explicit order is passed. */
export function layer<T extends THREE.Object3D>(o: T, order?: number): T {
  const n = order ?? ++ORDER;
  o.renderOrder = n;
  o.traverse((c) => (c.renderOrder = n));
  return o;
}

export type Draw = (g: OffscreenCanvasRenderingContext2D) => void;

/**
 * A plane of `w`×`h` ref px whose content is drawn once into a canvas.
 * `pad` adds room around the content (for shadows); the drawing origin is the
 * content's top-left. `res` is canvas px per ref px (3 = 2× DPR at 1080p).
 */
export function canvasMesh(
  name: string,
  w: number,
  h: number,
  draw: Draw,
  opts: { pad?: number; res?: number } = {},
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const pad = opts.pad ?? 0;
  let res = opts.res ?? 3;
  const maxSide = 4096;
  res = Math.min(res, maxSide / (w + pad * 2), maxSide / (h + pad * 2));
  const cw = Math.ceil((w + pad * 2) * res);
  const ch = Math.ceil((h + pad * 2) * res);
  const canvas = new OffscreenCanvas(cw, ch);
  const g = canvas.getContext("2d")!;
  g.scale(res, res);
  g.translate(pad, pad);
  draw(g);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w + pad * 2, h + pad * 2), mat);
  mesh.name = name;
  return mesh;
}

/** A flat full-frame colour/gradient backdrop (not pickable). */
export function backdrop(name: string, top: string, bottom = top, w = 2000, h = 800) {
  const m = canvasMesh(
    name,
    64,
    64,
    (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, top);
      gr.addColorStop(1, bottom);
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    },
    { res: 4 },
  );
  m.scale.set(w / 64, h / 64, 1);
  m.userData.pickable = false;
  layer(m, -100);
  return m;
}

export function setOpacity(o: THREE.Object3D, a: number) {
  o.traverse((c) => {
    const m = (c as THREE.Mesh).material as THREE.Material | undefined;
    if (m && "opacity" in m) {
      if (c.userData.baseOpacity === undefined) c.userData.baseOpacity = m.opacity;
      m.opacity = c.userData.baseOpacity * a;
    }
  });
  o.visible = a > 0.001;
}

// ---------------------------------------------------------------- 2D drawing

export function rr(g: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function fillRR(
  g: OffscreenCanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number | number[],
  fill: string | CanvasGradient,
  shadow?: { blur: number; y: number; color: string },
) {
  g.save();
  if (shadow) {
    g.shadowBlur = shadow.blur;
    g.shadowOffsetY = shadow.y;
    g.shadowColor = shadow.color;
  }
  rr(g, x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  g.restore();
}

export type TextStyle = {
  size: number;
  weight?: number;
  color?: string;
  family?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  tracking?: number; // px
};

export function font(s: TextStyle) {
  return `${s.weight ?? 400} ${s.size}px ${s.family ?? SANS}`;
}

export function text(g: OffscreenCanvasRenderingContext2D, str: string, x: number, y: number, s: TextStyle) {
  g.save();
  g.font = font(s);
  g.fillStyle = s.color ?? "#0b0b0c";
  g.textAlign = s.align ?? "left";
  g.textBaseline = s.baseline ?? "middle";
  (g as unknown as { letterSpacing: string }).letterSpacing = `${s.tracking ?? 0}px`;
  g.fillText(str, x, y);
  g.restore();
}

let measureCtx: OffscreenCanvasRenderingContext2D | null = null;
export function measure(str: string, s: TextStyle) {
  measureCtx ??= new OffscreenCanvas(8, 8).getContext("2d")!;
  measureCtx.font = font(s);
  (measureCtx as unknown as { letterSpacing: string }).letterSpacing = `${s.tracking ?? 0}px`;
  return measureCtx.measureText(str).width;
}

/** A single line of type as its own plane, named after its words. */
export function textMesh(str: string, s: TextStyle, opts: { name?: string; res?: number; anchor?: "left" | "center" | "right" } = {}) {
  const w = Math.ceil(measure(str, s)) + 8;
  const h = Math.ceil(s.size * 1.45);
  const m = canvasMesh(
    opts.name ?? slug(str),
    w,
    h,
    (g) => text(g, str, 4, h / 2, { ...s, align: "left" }),
    { res: opts.res ?? 3 },
  );
  const anchor = opts.anchor ?? "center";
  if (anchor !== "center") m.geometry.translate(anchor === "left" ? w / 2 - 4 : -w / 2 + 4, 0, 0);
  m.userData.width = w - 8;
  return m;
}

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "text";

/** A vertical gradient backdrop whose two colours can change per frame. */
export function gradientBackdrop(name: string, top: string, bottom: string) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color(top) }, uBottom: { value: new THREE.Color(bottom) } },
    vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uBottom; varying float vY;
      void main(){ gl_FragColor = vec4(mix(uBottom, uTop, vY), 1.0);
      #include <colorspace_fragment>
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4000, REF_H), mat);
  m.name = name;
  m.userData.pickable = false;
  layer(m, -100);
  return {
    mesh: m,
    set(topC: THREE.Color | string, bottomC: THREE.Color | string) {
      mat.uniforms.uTop.value.set(topC);
      mat.uniforms.uBottom.value.set(bottomC);
    },
  };
}

/** Piecewise colour keyframes: [[frame, "#hex"], ...] → colour at frame. */
export function colorTrack(keys: [number, string][]) {
  const cs = keys.map(([f, c]) => [f, new THREE.Color(c)] as const);
  const out = new THREE.Color();
  return (frame: number) => {
    if (frame <= cs[0][0]) return out.copy(cs[0][1]);
    for (let i = 1; i < cs.length; i++) {
      if (frame <= cs[i][0]) {
        const t = (frame - cs[i - 1][0]) / (cs[i][0] - cs[i - 1][0]);
        return out.copy(cs[i - 1][1]).lerp(cs[i][1], t);
      }
    }
    return out.copy(cs[cs.length - 1][1]);
  };
}

/** Linear keyframes [[frame, value], ...] with an optional ease per segment. */
export function keys(k: [number, number][], ease?: (t: number) => number) {
  return (frame: number) => {
    if (frame <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (frame <= k[i][0]) {
        let t = (frame - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
        if (ease) t = ease(t);
        return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * t;
      }
    }
    return k[k.length - 1][1];
  };
}

/**
 * Camera keyframes [[frame, cx, cy, zoom], ...]: centre eased linearly per
 * segment, zoom interpolated in log space so push-ins feel even.
 */
export function camTrack(k: [number, number, number, number][], ease: (t: number) => number = (t) => t) {
  return (f: number): [number, number, number] => {
    if (f <= k[0][0]) return [k[0][1], k[0][2], k[0][3]];
    for (let i = 1; i < k.length; i++) {
      if (f <= k[i][0]) {
        const t = ease((f - k[i - 1][0]) / (k[i][0] - k[i - 1][0]));
        const a = k[i - 1], b = k[i];
        return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, Math.exp(Math.log(a[3]) + (Math.log(b[3]) - Math.log(a[3])) * t)];
      }
    }
    const l = k[k.length - 1];
    return [l[1], l[2], l[3]];
  };
}

export const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/**
 * Camera keyframes [[frame, cx, cy, zoom], ...] through a monotone cubic
 * spline: velocity is continuous through every key, so the camera never
 * stops and restarts at a keyframe (zoom is splined in log space).
 */
export function smoothCam(k: [number, number, number, number][]) {
  const x = track(k.map(([f, v]) => [f, v] as const));
  const y = track(k.map(([f, , v]) => [f, v] as const));
  const lz = track(k.map(([f, , , z]) => [f, Math.log(z)] as const));
  return (f: number): [number, number, number] => [x(f), y(f), Math.exp(lz(f))];
}
