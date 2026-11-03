/**
 * A physical display: a canvas-drawn UI on a glowing surface, inside a dark
 * metal bezel, with a faint glass sheen. Positions are given in canvas pixels
 * and converted to world space, so shots can aim the camera at "the caret" or
 * "the Save button" rather than at guessed coordinates.
 */
import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";

export type G = OffscreenCanvasRenderingContext2D;

export interface Screen {
  group: THREE.Group;
  surface: THREE.Mesh;
  g: G;
  texture: THREE.CanvasTexture;
  W: number;
  H: number;
  ppu: number;
  /** Canvas px -> group-local position (z above the glass). */
  local(x: number, y: number, z?: number, out?: THREE.Vector3): THREE.Vector3;
  /** Canvas px -> world position. */
  world(x: number, y: number, z?: number, out?: THREE.Vector3): THREE.Vector3;
  /** Redraw only when `key` changes, so a static UI is drawn exactly once. */
  draw(key: string, paint: (g: G) => void): void;
}

export interface ScreenOptions {
  name: string;
  W: number;
  H: number;
  /** Canvas pixels per world unit. */
  ppu?: number;
  /** Dark metal frame around the glass. Off by default. */
  bezel?: number;
  brightness?: number;
  /**
   * The display continues past the drawn canvas in this colour, so a raking
   * angle never finds an edge. Defaults to the canvas's top-left pixel colour
   * passed by the scene; set null to show the edge.
   */
  surround?: string | null;
}

export function createScreen(ctx: ThreeSceneContext, o: ScreenOptions): Screen {
  const ppu = o.ppu ?? 1000;
  const canvas = new OffscreenCanvas(o.W, o.H);
  const g = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();

  const w = o.W / ppu;
  const h = o.H / ppu;
  const group = new THREE.Group();
  group.name = o.name;

  const mat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const b = o.brightness ?? 1;
  mat.color.setScalar(b);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  surface.name = `${o.name}-display`;
  group.add(surface);

  const bezel = o.bezel ?? 0;
  if (bezel > 0) {
    const shape = roundedRect(w + bezel * 2, h + bezel * 2, bezel * 1.2);
    const frame = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 10 }),
      new THREE.MeshStandardMaterial({ color: "#0d0d0f", roughness: 0.32, metalness: 0.7 }),
    );
    frame.position.z = -0.0445;
    frame.name = `${o.name}-bezel`;
    group.add(frame);
  }

  if (o.surround !== null) {
    const surround = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 4, h * 4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(o.surround ?? "#0c0c0e").multiplyScalar(b), toneMapped: false }),
    );
    surround.position.z = -0.0006;
    surround.name = `${o.name}-surround`;
    surround.userData.pickable = false;
    group.add(surround);
  }

  // Glass sheen: a soft diagonal band of reflected room light.
  // Spans the surround too when there is one; on a device it stays on the glass.
  const sk = o.surround === null ? 1 : 4;
  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(w * sk, h * sk),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; void main(){
        float d = vUv.x * 0.8 + vUv.y * 0.6;
        float band = smoothstep(0.55, 0.85, d) * (1.0 - smoothstep(0.85, 1.25, d));
        gl_FragColor = vec4(vec3(0.05 * band + 0.008), 1.0);
      }`,
    }),
  );
  sheen.position.z = 0.0008;
  sheen.userData.pickable = false;
  group.add(sheen);

  let lastKey = "";
  const local = (x: number, y: number, z = 0, out = new THREE.Vector3()) =>
    out.set(x / ppu - w / 2, h / 2 - y / ppu, z);
  return {
    group,
    surface,
    g,
    texture,
    W: o.W,
    H: o.H,
    ppu,
    local,
    world(x, y, z = 0, out = new THREE.Vector3()) {
      local(x, y, z, out);
      group.updateMatrixWorld();
      return out.applyMatrix4(group.matrixWorld);
    },
    draw(key, paint) {
      if (key === lastKey) return;
      lastKey = key;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, o.W, o.H);
      paint(g);
      texture.needsUpdate = true;
    },
  };
}

export function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
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

/** A macOS-style pointer as a plane whose origin is the arrow's tip. */
export function createCursor(ctx: ThreeSceneContext, sizePx: number, ppu: number, name = "cursor"): THREE.Mesh {
  const S = 128;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d")!;
  const k = S / 32;
  g.scale(k, k);
  g.beginPath();
  g.moveTo(4, 2);
  g.lineTo(4, 25);
  g.lineTo(9.5, 19.8);
  g.lineTo(13.2, 28.4);
  g.lineTo(17.2, 26.7);
  g.lineTo(13.6, 18.3);
  g.lineTo(21, 18.3);
  g.closePath();
  g.lineJoin = "round";
  g.lineWidth = 2.4;
  g.strokeStyle = "#ffffff";
  g.stroke();
  g.fillStyle = "#050505";
  g.fill();
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
  const s = sizePx / ppu;
  const geo = new THREE.PlaneGeometry(s, s);
  geo.translate(s / 2 - (4 / 32) * s, -s / 2 + (2 / 32) * s, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  m.name = name;
  m.renderOrder = 5;
  return m;
}

/**
 * Soft lights of the room behind the monitor. Out of focus, these become the
 * big grey bokeh shapes that sit behind every shot in the reference.
 */
export function createRoom(scene: THREE.Scene, blobs: { x: number; y: number; z: number; r: number; b: number }[]): THREE.Group {
  const S = 256;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  const room = new THREE.Group();
  room.name = "room-lights";
  room.userData.pickable = false;
  for (const bl of blobs) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(bl.r * 2, bl.r * 2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: bl.b }),
    );
    m.position.set(bl.x, bl.y, bl.z);
    room.add(m);
  }
  scene.add(room);
  return room;
}

/** Key + fill + ambient so the bezels and any physical objects read. */
export function addStudioLights(scene: THREE.Scene): void {
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-2, 3, 2);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(3, 1, -1);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.35));
}

/** An image (a GenMotion frame) on a plane, loaded through the frame barrier. */
export function loadFrame(
  ctx: ThreeSceneContext,
  url: string,
  w: number,
  aspect: number,
  crop?: { x: number; y: number; w: number; h: number },
): THREE.Mesh {
  const tex = new THREE.TextureLoader(ctx.manager).load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
  if (crop) {
    tex.repeat.set(crop.w, crop.h);
    tex.offset.set(crop.x, 1 - crop.y - crop.h);
  }
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, w / aspect),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
  );
}
