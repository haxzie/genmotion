import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

/**
 * Rasterise an SVG asset crisply at `pxWidth` composition px (x2 for sharpness), through the
 * export's loading barrier. `fill` recolours a single-colour mark (simple-icons paths inherit
 * the root fill). Returns the texture at once; it fills in when the file arrives.
 * userData.aspect holds height / width from the viewBox.
 */
export function svgTexture(ctx: ThreeSceneContext, url: string, pxWidth: number, fill?: string): THREE.CanvasTexture {
  const canvas = new OffscreenCanvas(4, 4);
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.userData.aspect = 1;
  new THREE.FileLoader(ctx.manager).load(url, (data) => {
    let svg = String(data);
    const vb = /viewBox="([^"]+)"/.exec(svg)?.[1]?.split(/[\s,]+/).map(Number);
    const vw = vb?.[2] ?? 100, vh = vb?.[3] ?? 100;
    const aspect = vh / vw;
    tex.userData.aspect = aspect;
    const W = Math.round(pxWidth * 2), H = Math.round(pxWidth * 2 * aspect);
    svg = svg.replace(/<svg([^>]*)>/, (_m, attrs: string) => {
      let a = attrs.replace(/\s(width|height)="[^"]*"/g, "");
      if (fill) a = a.replace(/\sfill="[^"]*"/g, "") + ` fill="${fill}"`;
      return `<svg${a} width="${W}" height="${H}">`;
    });
    new THREE.ImageLoader(ctx.manager).load("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg), (img) => {
      canvas.width = W;
      canvas.height = H;
      const g = canvas.getContext("2d")!;
      g.drawImage(img, 0, 0, W, H);
      tex.dispose();
      tex.needsUpdate = true;
    });
  });
  return tex;
}

/** An unlit plane showing an SVG, `pxWidth` wide, centred. Height follows the viewBox once loaded. */
export function svgPlane(ctx: ThreeSceneContext, url: string, pxWidth: number, aspect: number, fill?: string, name = "logo") {
  const tex = svgTexture(ctx, url, pxWidth, fill);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pxWidth * 0.01, pxWidth * aspect * 0.01), mat);
  m.name = name;
  return m;
}
