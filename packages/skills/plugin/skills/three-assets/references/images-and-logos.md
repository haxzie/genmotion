# Images, screenshots and logos

Everything here loads through `ctx.manager`, so the export's frame barrier waits for it and no frame ships with an empty plane. Code goes in `components/media.ts` and `components/logo.ts`; it compiles against `three` r185 with the project's strict settings and was captured (screenshot at true aspect, an SVG mark rasterised at 2×, the same mark extruded and bevelled under the studio environment).

Contents: 1 Asset imports · 2 Images and screenshots · 3 Logos: flat and extruded · 4 Device frames · 5 Image hygiene

## 1. Asset imports

Import files from `assets/`; the bundler turns the import into a URL (small images inline as data URLs). TypeScript needs a declaration once per project:

```ts
// components/assets.d.ts
// Asset imports resolve to URLs (small images inline as data URLs).
declare module "*.png" { const url: string; export default url; }
declare module "*.jpg" { const url: string; export default url; }
declare module "*.svg" { const url: string; export default url; }
declare module "*.webm" { const url: string; export default url; }
declare module "*.mp4" { const url: string; export default url; }
declare module "*.woff2" { const url: string; export default url; }
```

## 2. Images and screenshots

```ts
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";
import { PX } from "./stage";

/** An image as a texture, loaded through ctx.manager so the frame barrier waits for it. */
export function imageTexture(ctx: ThreeSceneContext, url: string, opts: { color?: boolean; mipmaps?: boolean } = {}) {
  const tex = new THREE.TextureLoader(ctx.manager).load(url);
  if (opts.color !== false) tex.colorSpace = THREE.SRGBColorSpace; // colour maps only; never normal/roughness maps
  tex.anisotropy = 8;
  if (opts.mipmaps === false) {
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
  }
  return tex;
}

/**
 * A screenshot or photo on a plane at its true aspect, `widthPx` composition px wide.
 * The aspect is fixed when the image lands (before the barrier releases), so it is never stretched.
 */
export function picture(ctx: ThreeSceneContext, url: string, widthPx: number, name: string) {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.name = name;
  mesh.scale.set(widthPx * PX, widthPx * PX * 0.5625, 1); // placeholder aspect until it loads
  const tex = new THREE.TextureLoader(ctx.manager).load(url, (t) => {
    const img = t.image as { width: number; height: number };
    mesh.scale.y = (widthPx * PX * img.height) / img.width;
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  mat.map = tex;
  return mesh;
}
```

- `picture()` fixes the plane's aspect from the real pixels when the image lands (before the barrier releases), so it is never stretched; width is in composition px.
- Screenshots and UI are `MeshBasicMaterial` with `toneMapped: false`: lit or tone-mapped UI looks wrong immediately.
- An image shown much smaller than its pixels (a 2400 px screenshot at 600 px) keeps the default mipmaps and `anisotropy 8`, or it shimmers as it moves; near 1:1, mipmaps don't matter. Shown larger than its pixels, it goes soft: zoom into the part that matters from a bigger source instead.
- Rounded corners on a screenshot: a `ShapeGeometry` of a rounded rectangle with UVs remapped to 0–1 across it (the LightPay template's `roundedPlane`), or round them into the PNG.

## 3. Logos: flat and extruded

```ts
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";
import { PX, RES } from "./stage";

/**
 * A logo file (SVG or PNG) on a plane, rasterised at 2x the size it is shown at, so it is
 * crisp at any size an SVG can take. Loaded through ctx.manager; drawn before the barrier releases.
 */
export function logoPlane(ctx: ThreeSceneContext, url: string, widthPx: number, aspect: number, name: string) {
  const w = Math.round(widthPx), h = Math.round(widthPx / aspect);
  const canvas = new OffscreenCanvas(w * RES, h * RES);
  const g = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  new THREE.ImageLoader(ctx.manager).load(url, (img) => {
    g.drawImage(img, 0, 0, w * RES, h * RES); // an SVG is rasterised here, at this size
    tex.needsUpdate = true;
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w * PX, h * PX),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.name = name;
  return mesh;
}

/**
 * SVG path data -> THREE.Shapes, for extruding a real mark. Handles M L H V C S Q T Z,
 * absolute and relative. Arcs (A) are not handled: flatten them in the source file first,
 * or use logoPlane. Units stay the SVG's; y is flipped so the mark is upright.
 */
export function svgPathShapes(d: string): THREE.Shape[] {
  const path = new THREE.ShapePath();
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i]!)) cmd = tok[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M": x = ox + num(); y = oy + num(); sx = x; sy = y; path.moveTo(x, -y); cmd = rel ? "l" : "L"; cx = x; cy = y; break;
      case "L": x = ox + num(); y = oy + num(); path.lineTo(x, -y); cx = x; cy = y; break;
      case "H": x = ox + num(); path.lineTo(x, -y); cx = x; cy = y; break;
      case "V": y = (rel ? y : 0) + num(); path.lineTo(x, -y); cx = x; cy = y; break;
      case "C": {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num();
        x = ox + num(); y = oy + num();
        path.bezierCurveTo(x1, -y1, x2, -y2, x, -y); cx = x2; cy = y2; break;
      }
      case "S": {
        const x1 = 2 * x - cx, y1 = 2 * y - cy, x2 = ox + num(), y2 = oy + num();
        x = ox + num(); y = oy + num();
        path.bezierCurveTo(x1, -y1, x2, -y2, x, -y); cx = x2; cy = y2; break;
      }
      case "Q": {
        const x1 = ox + num(), y1 = oy + num();
        x = ox + num(); y = oy + num();
        path.quadraticCurveTo(x1, -y1, x, -y); cx = x1; cy = y1; break;
      }
      case "T": {
        const x1 = 2 * x - cx, y1 = 2 * y - cy;
        x = ox + num(); y = oy + num();
        path.quadraticCurveTo(x1, -y1, x, -y); cx = x1; cy = y1; break;
      }
      case "Z": x = sx; y = sy; cx = x; cy = y; path.currentPath?.closePath(); break;
      default: throw new Error(`svgPathShapes: "${cmd}" is not handled; flatten arcs in the SVG first`);
    }
  }
  return path.toShapes();
}

/** An extruded, bevelled mark from path data, centred and `widthPx` wide; depth in px. */
export function extrudedMark(d: string, widthPx: number, depthPx: number, material: THREE.Material, name: string) {
  const shapes = svgPathShapes(d);
  const xs = shapes.flatMap((s) => s.getPoints().map((p) => p.x));
  const w = Math.max(...xs) - Math.min(...xs); // the mark's width in SVG units
  const bevel = w * 0.012; // a bevel is what catches the studio light on the edge
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: (depthPx / widthPx) * w, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 4, curveSegments: 24,
  });
  geo.center();
  geo.scale((widthPx * PX) / w, (widthPx * PX) / w, (widthPx * PX) / w);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  return mesh;
}
```

- **Flat** (`logoPlane`): an SVG is rasterised by the canvas at the size it is shown, × 2, so it is crisp at any size. Pass the mark's real aspect (from its viewBox).
- **Extruded** (`extrudedMark`): from the real file's path `d` attribute, copied verbatim into `components/brand.ts`. Handles M L H V C S Q T Z, absolute and relative; arcs (A) throw, so flatten them in the source file first, or use the flat plane. Multi-colour marks: one extrusion per colour path. Light it with `three-look`'s product setup and `brand` tone mapping so the colour holds.
- **Never redraw or generate a brand's mark**, and never hot-link a logo CDN: `save-asset` the official file into `assets/`. If there is no file, ask for it, and use the wordmark in the brand's type meanwhile.
- Name it (`hero-mark`, `logo-flat`) so the editor can point at it.

## 4. Device frames

A phone or laptop is geometry around a screen plane:

```ts
/** A centred rounded rectangle, for device bodies, cards and pills. */
export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// in the builder: a phone 390 x 800 px with the app screenshot on its face
const body = new THREE.Mesh(
  new THREE.ExtrudeGeometry(roundedRectShape(3.9, 8.0, 0.55), { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 4 }),
  new THREE.MeshPhysicalMaterial({ color: "#15161a", metalness: 0.6, roughness: 0.3, clearcoat: 1 }),
);
const screen = picture(ctx, appShotUrl, 360, "phone-screen");   // 3.6 units wide
screen.position.z = 0.23;                                       // just in front of the face
const phone = new THREE.Group();
phone.name = "phone";
phone.add(body, screen);
```

Size the screen to the frame's inner area; a notch or island is a small black rounded plane on top. For a push through the screen into the UI, see `three-transitions` (match-push).

## 5. Image hygiene

- Resolution: a screenshot that will fill the frame needs ≥ 1920 px wide (16:9) or ≥ 1080 px wide (9:16) after cropping; photos the same.
- Colour textures `SRGBColorSpace`; normal/roughness maps not.
- Keep files under ~4 K: every frame is rendered and screenshotted, and huge textures multiply export time.
- Text inside a screenshot must still clear the 28 px floor where it is shown; zoom into the part that matters rather than shrinking a whole screen.
