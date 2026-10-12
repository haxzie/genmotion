import * as THREE from "three";
import { SERIF } from "./brand";

/**
 * One run of serif type as a plane, drawn once at 2x. The plane is sized in
 * `unit`s per CSS pixel (1 = one composition pixel in the overlay).
 */
export function label(text: string, size: number, colour: string, opts: { weight?: number; unit?: number } = {}) {
  const S = 2;
  const font = `${opts.weight ?? 400} ${size * S}px ${SERIF}`;
  const pad = Math.round(size * 0.3) * S;
  const measure = new OffscreenCanvas(8, 8).getContext("2d")!;
  measure.font = font;
  const textW = measure.measureText(text).width;
  const w = Math.ceil(textW) + pad * 2;
  const h = Math.ceil(size * S * 1.45) + pad * 2;
  const canvas = new OffscreenCanvas(w, h);
  const g = canvas.getContext("2d")!;
  g.font = font;
  g.fillStyle = colour;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const u = opts.unit ?? 1;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry((w / S) * u, (h / S) * u),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }),
  );
  return { mesh, textWidth: (textW / S) * u };
}
