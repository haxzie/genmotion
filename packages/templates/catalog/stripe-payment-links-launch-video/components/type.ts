import * as THREE from "three";
import { SANS } from "./fonts";

/** Draw scale: canvases are drawn at 2x the composition px they cover, so type stays crisp. */
const DPR = 2;

export interface TextOpts {
  size: number; // px in the 1920x1080 frame
  weight?: number;
  color?: string;
  /** Two-colour gradient across the glyphs ("v" top→bottom, "h" left→right). */
  gradient?: [string, string];
  gradientDir?: "v" | "h";
  tracking?: number; // em
  font?: string;
  /** Soft halo drawn under the glyphs (px blur, colour, passes). */
  glow?: { blur: number; color: string; passes?: number };
  /** Also build a blurred twin (px) so set(opacity, blur) can crossfade sharp↔soft. */
  blur?: number;
  anchor?: "left" | "center" | "right";
  /** Synthetic oblique: horizontal shear (0.2 ≈ a 11° italic). */
  skew?: number;
}

export interface TextObj {
  group: THREE.Group;
  sharp: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  soft?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Width/height of the glyph run in px (without padding). */
  width: number;
  height: number;
  /** opacity 0..1, blur 0 (sharp) .. 1 (fully soft twin) */
  set(opacity: number, blur?: number): void;
}

let _m: OffscreenCanvasRenderingContext2D | null = null;
const mctx = () => (_m ??= new OffscreenCanvas(8, 8).getContext("2d")!);

export function fontString(o: TextOpts) {
  return `${o.weight ?? 500} ${o.size}px ${o.font ?? SANS}`;
}

export function measureText(text: string, o: TextOpts) {
  const m = mctx();
  m.font = fontString(o);
  (m as any).letterSpacing = `${(o.tracking ?? 0) * o.size}px`;
  return m.measureText(text).width;
}

function render(text: string, o: TextOpts, blurPx: number) {
  const tw = measureText(text, o);
  const glowPad = o.glow ? o.glow.blur * 1.6 : 0;
  const pad = Math.ceil(o.size * 0.3 + glowPad + blurPx * 2.5);
  const w = Math.ceil(tw + pad * 2);
  const h = Math.ceil(o.size * 1.3 + pad * 2);
  const canvas = new OffscreenCanvas(w * DPR, h * DPR);
  const g = canvas.getContext("2d")!;
  g.scale(DPR, DPR);
  g.font = fontString(o);
  (g as any).letterSpacing = `${(o.tracking ?? 0) * o.size}px`;
  g.textAlign = "left";
  g.textBaseline = "middle";
  if (blurPx > 0) g.filter = `blur(${blurPx}px)`;
  let x = pad;
  let y = h / 2;
  if (o.skew) {
    // shear about the vertical centre so the run stays centred in its box
    g.translate(x, y);
    g.transform(1, 0, -o.skew, 1, 0, 0);
    x = 0;
    y = 0;
  }
  let fill: string | CanvasGradient = o.color ?? "#ffffff";
  if (o.gradient) {
    const gr =
      o.gradientDir === "h"
        ? g.createLinearGradient(x, 0, x + tw, 0)
        : g.createLinearGradient(0, y - o.size * 0.5, 0, y + o.size * 0.45);
    gr.addColorStop(0, o.gradient[0]);
    gr.addColorStop(1, o.gradient[1]);
    fill = gr;
  }
  if (o.glow) {
    g.save();
    g.shadowColor = o.glow.color;
    g.shadowBlur = o.glow.blur * DPR;
    g.fillStyle = o.glow.color;
    for (let i = 0; i < (o.glow.passes ?? 2); i++) g.fillText(text, x, y);
    g.restore();
  }
  g.fillStyle = fill;
  g.fillText(text, x, y);

  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(w, h);
  const anchor = o.anchor ?? "center";
  if (anchor === "left") geo.translate(w / 2 - pad, 0, 0);
  if (anchor === "right") geo.translate(-w / 2 + pad, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  return { mesh: new THREE.Mesh(geo, mat), tw };
}

/** A line of type as a plane in px units (1 unit = 1 composition px). */
export function makeText(text: string, o: TextOpts, name?: string): TextObj {
  const group = new THREE.Group();
  const sharp = render(text, o, 0);
  group.add(sharp.mesh);
  let soft: TextObj["soft"];
  if (o.blur) {
    soft = render(text, o, o.blur).mesh;
    group.add(soft);
  }
  const slug = name ?? text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  group.name = slug;
  sharp.mesh.name = `${slug}-type`;
  if (soft) soft.name = `${slug}-soft`;
  const obj: TextObj = {
    group,
    sharp: sharp.mesh,
    soft,
    width: sharp.tw,
    height: o.size,
    set(opacity: number, blur = 0) {
      const b = soft ? THREE.MathUtils.clamp(blur, 0, 1) : 0;
      sharp.mesh.material.opacity = opacity * (1 - b);
      if (soft) soft.material.opacity = opacity * Math.min(1, b * 1.4);
      group.visible = opacity > 0.001;
    },
  };
  obj.set(1, 0);
  return obj;
}

/**
 * A run of type split into per-character planes (kerning kept via prefix measurement).
 * The group is centred on the run; chars[i].group.position.x is its pen position.
 */
export function makeChars(text: string, o: TextOpts, name?: string) {
  const group = new THREE.Group();
  const slug = name ?? text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  group.name = slug;
  const total = measureText(text, o);
  const chars: (TextObj & { x: number })[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") continue;
    const x = measureText(text.slice(0, i), o) - total / 2;
    const t = makeText(text[i], { ...o, anchor: "left" }, `${slug}-${i}`);
    t.group.position.x = x;
    group.add(t.group);
    chars.push(Object.assign(t, { x }));
  }
  return { group, chars, width: total };
}

/** A canvas drawn once at 2x into a plane of w×h px. */
export function canvasPlane(
  w: number,
  h: number,
  draw: (g: OffscreenCanvasRenderingContext2D, w: number, h: number) => void,
  opts: { transparent?: boolean } = {},
) {
  const canvas = new OffscreenCanvas(Math.ceil(w * DPR), Math.ceil(h * DPR));
  const g = canvas.getContext("2d")!;
  g.scale(DPR, DPR);
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: opts.transparent ?? true,
    depthWrite: false,
    toneMapped: false,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

export function roundRect(g: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
