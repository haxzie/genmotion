import * as THREE from "three";
import { BRAND, FONT } from "./brand";
import { canvasTexture } from "./text";

/** Name an object and prefix its children's names with it, so every pick is unique. */
export function nameAs<T extends THREE.Object3D>(o: T, name: string): T {
  o.name = name;
  o.traverse((c) => {
    if (c !== o) c.name = c.name ? `${name}-${c.name}` : `${name}-part`;
  });
  return o;
}

/* ------------------------------------------------------------------ shapes */

export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
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

/** A flat rounded rectangle whose UVs run 0→1 across it, so it can carry a texture. */
export function roundedPlane(w: number, h: number, r: number): THREE.ShapeGeometry {
  const geo = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 12);
  const pos = geo.attributes.position!;
  const uv = geo.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return geo;
}

/** The LightPay bolt, in a 100×100 box (y down, like the canvas). */
const BOLT: [number, number][] = [
  [54, 2], [16, 58], [45, 58], [36, 98], [84, 38], [56, 38], [70, 2],
];

export function drawBolt(g: OffscreenCanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  BOLT.forEach(([x, y], i) => {
    const px = cx + ((x - 50) / 100) * size;
    const py = cy + ((y - 50) / 100) * size;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  });
  g.closePath();
  g.lineJoin = "round";
  g.lineWidth = size * 0.04;
  g.strokeStyle = color;
  g.fill();
  g.stroke();
  g.restore();
}

/** The bolt as a three.js shape, `size` world units tall, centred. */
export function boltShape(size: number): THREE.Shape {
  const s = new THREE.Shape();
  BOLT.forEach(([x, y], i) => {
    const px = ((x - 50) / 100) * size;
    const py = ((50 - y) / 100) * size;
    if (i === 0) s.moveTo(px, py);
    else s.lineTo(px, py);
  });
  s.closePath();
  return s;
}

/* ------------------------------------------------------------ environment */

/**
 * A soft photo-studio reflection map built from core three: a grey room with
 * a few bright softbox panels, prefiltered once. It is what makes the coins
 * and the phone read glossy instead of plastic.
 */
export function studio(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const room = new THREE.Scene();
  room.background = new THREE.Color("#8d8f94");
  const panel = (w: number, h: number, x: number, y: number, z: number, strength: number, tint = "#ffffff") => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(strength), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  panel(6, 3, 0, 6, 3, 6);
  panel(3, 5, -6, 1, 3, 4);
  panel(3, 5, 6, 2, -2, 3.5);
  panel(8, 2, 0, -4, 5, 1.6, "#fff4e8");
  panel(4, 4, 0, 1, -7, 2.4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: "#d9dbe0" }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -6;
  room.add(floor);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.035).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 8);
  const fill = new THREE.DirectionalLight(0xfff1e6, 0.9);
  fill.position.set(-6, -2, 5);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(0, 4, -6);
  scene.add(key, fill, rim, new THREE.AmbientLight(0xffffff, 0.5));
}

/* ------------------------------------------------------------------ coins */

export type CoinKind = "lime" | "silver" | "ink" | "orange" | "blue";
export type CoinGlyph = "bolt" | "$" | "€" | "£" | "¥";

const COIN: Record<CoinKind, { a: string; b: string; rim: string; glyph: string; metal: number }> = {
  lime: { a: "#e4ff6a", b: "#a9d800", rim: "#8fbd00", glyph: BRAND.ink, metal: 0.25 },
  silver: { a: "#ffffff", b: "#c4c8cf", rim: "#b7bbc3", glyph: BRAND.ink, metal: 0.55 },
  ink: { a: "#2a2d36", b: "#0b0c10", rim: "#22252c", glyph: BRAND.lime, metal: 0.4 },
  orange: { a: "#ffc07a", b: "#ff7a3d", rim: "#f26a22", glyph: "#fff7ec", metal: 0.3 },
  blue: { a: "#5d68ff", b: "#1d2bf0", rim: "#1622c8", glyph: "#ffffff", metal: 0.3 },
};

const faceCache = new Map<string, THREE.Texture>();

function coinFace(kind: CoinKind, glyph: CoinGlyph): THREE.Texture {
  const key = kind + glyph;
  const hit = faceCache.get(key);
  if (hit) return hit;
  const c = COIN[kind];
  const S = 512;
  const tex = canvasTexture(S, S, (g) => {
    const grad = g.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, c.a);
    grad.addColorStop(1, c.b);
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    // Raised inner ring.
    g.lineWidth = 14;
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.beginPath();
    g.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.12)";
    g.beginPath();
    g.arc(S / 2 + 4, S / 2 + 5, S * 0.4, 0, Math.PI * 2);
    g.stroke();
    if (glyph === "bolt") {
      drawBolt(g, S / 2, S / 2, S * 0.5, c.glyph);
    } else {
      g.font = `600 ${S * 0.46}px ${FONT}`;
      g.fillStyle = c.glyph;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(glyph, S / 2, S / 2 + S * 0.02);
    }
  });
  faceCache.set(key, tex);
  return tex;
}

/** A glossy coin of radius `r`, its face towards +z. */
export function makeCoin(r: number, kind: CoinKind, glyph: CoinGlyph): THREE.Group {
  const c = COIN[kind];
  const t = r * 0.18;
  const group = new THREE.Group();
  const edge = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, t, 64, 1, true),
    new THREE.MeshPhysicalMaterial({ color: c.rim, metalness: c.metal + 0.2, roughness: 0.28, clearcoat: 1 }),
  );
  edge.rotation.x = Math.PI / 2;
  const faceMat = new THREE.MeshPhysicalMaterial({
    map: coinFace(kind, glyph),
    metalness: c.metal,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
  });
  const faceGeo = new THREE.CircleGeometry(r, 64);
  const front = new THREE.Mesh(faceGeo, faceMat);
  front.position.z = t / 2;
  const back = new THREE.Mesh(faceGeo, faceMat);
  back.position.z = -t / 2;
  back.rotation.y = Math.PI;
  edge.name = "edge";
  front.name = "face";
  back.name = "back";
  group.add(edge, front, back);
  return group;
}

/* ------------------------------------------------------------------- bills */

let billTexture: THREE.Texture | null = null;

/** A slightly curled LightPay banknote. */
export function makeBill(w = 1.7): THREE.Mesh {
  const h = w * 0.44;
  if (!billTexture) {
    billTexture = canvasTexture(680, 300, (g) => {
      g.fillStyle = "#dff2c7";
      g.fillRect(0, 0, 680, 300);
      g.strokeStyle = "#6f9a4a";
      g.lineWidth = 10;
      g.strokeRect(18, 18, 644, 264);
      g.lineWidth = 3;
      g.strokeRect(34, 34, 612, 232);
      g.fillStyle = "#b9dd8f";
      g.beginPath();
      g.ellipse(340, 150, 86, 100, 0, 0, Math.PI * 2);
      g.fill();
      drawBolt(g, 340, 150, 120, "#3b6a17");
      g.fillStyle = "#3b6a17";
      g.font = `600 64px ${FONT}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("100", 110, 92);
      g.fillText("100", 570, 210);
    });
  }
  const geo = new THREE.PlaneGeometry(w, h, 16, 4);
  const pos = geo.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2);
    pos.setZ(i, Math.sin(x * 1.4) * 0.09 + x * x * 0.05);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: billTexture, roughness: 0.65, side: THREE.DoubleSide }),
  );
}

/* ---------------------------------------------------------------- sparkles */

export function sparkleGeometry(size: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  const k = size * 0.16;
  s.moveTo(0, size);
  s.quadraticCurveTo(k, k, size, 0);
  s.quadraticCurveTo(k, -k, 0, -size);
  s.quadraticCurveTo(-k, -k, -size, 0);
  s.quadraticCurveTo(-k, k, 0, size);
  return new THREE.ShapeGeometry(s, 8);
}

/* ------------------------------------------------------ rays, glows, washes */

const rayCache = new Map<string, THREE.Texture>();

/** The reference's sunburst: soft-edged rays fading out of a white core. */
export function sunburst(size: number, color: string = BRAND.limeBright, rays = 18, core = 0.12): THREE.Mesh {
  const key = color + rays + core;
  let tex = rayCache.get(key);
  if (!tex) {
    const S = 2048;
    tex = canvasTexture(S, S, (g) => {
      const c = S / 2;
      g.fillStyle = color;
      const step = (Math.PI * 2) / rays;
      for (let i = 0; i < rays; i++) {
        const a = i * step;
        const spread = step * 0.26;
        g.beginPath();
        g.moveTo(c, c);
        g.lineTo(c + Math.cos(a - spread) * c * 1.5, c + Math.sin(a - spread) * c * 1.5);
        g.lineTo(c + Math.cos(a + spread) * c * 1.5, c + Math.sin(a + spread) * c * 1.5);
        g.closePath();
        g.fill();
      }
      g.globalCompositeOperation = "destination-in";
      const fade = g.createRadialGradient(c, c, 0, c, c, c);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(core, "rgba(0,0,0,0)");
      fade.addColorStop(core + 0.3, "rgba(0,0,0,1)");
      fade.addColorStop(0.9, "rgba(0,0,0,0.9)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = fade;
      g.fillRect(0, 0, S, S);
    });
    rayCache.set(key, tex);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.userData.pickable = false;
  return mesh;
}

/** A soft radial glow of one colour. */
export function glow(size: number, color: string, strength = 1): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const S = 512;
  const col = new THREE.Color(color);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  const tex = canvasTexture(S, S, (g) => {
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, `rgba(${rgb},${strength})`);
    grad.addColorStop(0.45, `rgba(${rgb},${strength * 0.55})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.userData.pickable = false;
  return mesh;
}

/** The warm app-moment wash: white at the top melting into peach, with a fine speckle. */
export function peachWash(w: number, h: number, rand: () => number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const W = 1024;
  const H = 576;
  const tex = canvasTexture(W, H, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.45, "#fff6ef");
    grad.addColorStop(0.8, "#ffe2cc");
    grad.addColorStop(1, "#ffcfae");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const side = g.createRadialGradient(W * 0.95, H * 0.7, 0, W * 0.95, H * 0.7, W * 0.45);
    side.addColorStop(0, "rgba(255,186,140,0.55)");
    side.addColorStop(1, "rgba(255,186,140,0)");
    g.fillStyle = side;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) {
      const y = H * (0.35 + rand() * 0.65);
      g.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.5})`;
      g.fillRect(rand() * W, y, 1.4, 1.4);
    }
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.userData.pickable = false;
  return mesh;
}

/* ------------------------------------------------------------------ phone */

export interface Phone {
  group: THREE.Group;
  /** Screen canvas px → the phone's local space (on the glass). */
  at(px: number, py: number): THREE.Vector3;
  screenW: number;
  screenH: number;
}

/**
 * A black-titanium phone. `draw` paints the screen into a `cw`×`ch` canvas
 * once; live elements (rolling numbers, the pill) are placed with `at()`.
 */
export function makePhone(h: number, cw: number, ch: number, draw: (g: OffscreenCanvasRenderingContext2D) => void): Phone {
  const w = h * (cw / ch) + 0.34;
  const group = new THREE.Group();
  const depth = 0.18;
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRectShape(w, h + 0.34, 0.95), {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 5,
      curveSegments: 24,
    }),
    new THREE.MeshPhysicalMaterial({ color: "#0e0f12", metalness: 0.7, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 }),
  );
  body.position.z = -depth;
  body.name = "phone-body";
  const screenW = w - 0.34;
  const screenH = h;
  const screen = new THREE.Mesh(
    roundedPlane(screenW, screenH, 0.78),
    new THREE.MeshBasicMaterial({ map: canvasTexture(cw, ch, draw) }),
  );
  screen.position.z = 0.062;
  screen.name = "phone-screen";
  const island = new THREE.Mesh(roundedPlane(1.05, 0.3, 0.15), new THREE.MeshBasicMaterial({ color: "#000000" }));
  island.position.set(0, screenH / 2 - 0.34, 0.066);
  island.name = "phone-island";
  group.add(body, screen, island);
  return {
    group,
    screenW,
    screenH,
    at: (px, py) => new THREE.Vector3((px / cw - 0.5) * screenW, (0.5 - py / ch) * screenH, 0.07),
  };
}
