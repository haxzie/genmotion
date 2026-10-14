import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import avatarUrl from "../assets/haxzie-avatar.png";
import { mulberry32 } from "../components/rng";
import { C, FONT, drawDotGrid, drawLockup, drawMark, drawTile, type Tile } from "../components/brand";

// ── Dimensions (world units) ────────────────────────────────────────────────
const CARD_H = 4.6;
const CARD_W = CARD_H * (1720 / 2508);
const CARD_D = 0.035;
const CARD_R = 0.12;
const HOLE_FROM_TOP = CARD_H * (124 / 2508);
const HOLE_R = 0.062;

const STRAP_W = 0.44;
const PIVOT_Y = 12; // the strap hangs from a point far above frame
const HANG_Y = 2.435; // where the strap meets the clip, at rest
const STRAP_L = PIVOT_Y - HANG_Y;
const HOOK_Y = -0.96; // hook bottom, below the strap end

const BG = "#060707";

// ── Timeline (frames @30fps) ────────────────────────────────────────────────
const FALL_END = 14;
const SPIN_IN = 200;
const SPIN_OUT = 262;
const PUSH_IN = 120;
const PUSH_OUT = 400;
const YANK_IN = 458;
const YANK_OUT = 470;

function roundedRect(w: number, h: number, r: number): THREE.Shape {
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

/** Studio reflections for the metal clip, built from core three only. */
function studioEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const env = new THREE.Scene();
  env.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(20, 20, 20),
      new THREE.MeshBasicMaterial({ color: "#1c1c20", side: THREE.BackSide }),
    ),
  );
  const softbox = (w: number, h: number, x: number, y: number, z: number, c: string) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  softbox(8, 3, -5, 6, 6, "#ffffff");
  softbox(3, 10, 8, 0, 2, "#c8ccd6");
  softbox(10, 2, 0, -8, 0, "#55565c");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  return tex;
}

/** The woven strap: near-black, fine weave, "GENMOTION •" running up it. */
function strapTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 1024; // one tile = 4 strap-widths of length
  const canvas = new OffscreenCanvas(W, H);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#151918";
  g.fillRect(0, 0, W, H);
  const rand = mulberry32(7);
  for (let y = 0; y < H; y += 2) {
    g.fillStyle = `rgba(255,255,255,${0.015 + rand() * 0.035})`;
    g.fillRect(0, y, W, 1);
  }
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.18)";
    g.fillRect(rand() * W, rand() * H, 2, 1);
  }
  // Edge binding.
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(0, 0, 10, H);
  g.fillRect(W - 10, 0, 10, H);

  g.save();
  g.translate(W / 2 + 6, H);
  g.rotate(-Math.PI / 2);
  g.fillStyle = C.text;
  g.font = `500 100px ${FONT}`;
  g.textBaseline = "middle";
  const unit = "GENMOTION  •  ";
  const unitW = g.measureText(unit).width;
  // Text reads bottom-to-top; scaled so one phrase tiles the canvas exactly.
  g.scale(H / unitW, 1);
  g.fillText(unit, 0, 0);
  g.restore();

  const tex = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, width, height } = ctx;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.background = new THREE.Color(BG);

  // ── Backdrop: a dark wall the badge throws a soft shadow onto ────────────
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: "#0d0f0f", roughness: 1 }),
  );
  wall.name = "backdrop";
  wall.position.z = -2.6;
  wall.receiveShadow = true;
  wall.userData.pickable = false;
  scene.add(wall);

  // A soft brand-tinted glow on the wall, so the dark card separates from it.
  const glowCanvas = new OffscreenCanvas(512, 512);
  const gg = glowCanvas.getContext("2d")!;
  const rg = gg.createRadialGradient(256, 256, 0, 256, 256, 256);
  rg.addColorStop(0, "rgba(108,219,169,0.22)");
  rg.addColorStop(0.45, "rgba(74,168,145,0.08)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  gg.fillStyle = rg;
  gg.fillRect(0, 0, 512, 512);
  const glowTex = new THREE.CanvasTexture(glowCanvas as unknown as HTMLCanvasElement);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }),
  );
  glow.name = "backdrop-glow";
  glow.position.set(0, -0.4, -2.55);
  glow.userData.pickable = false;
  scene.add(glow);

  // ── Lights ───────────────────────────────────────────────────────────────
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-3.5, 5, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.radius = 14;
  key.shadow.blurSamples = 20;
  key.shadow.bias = -0.0005;
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.55);
  fill.position.set(5, -1, 6);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(2, 6, -6);
  scene.add(key, fill, rim, new THREE.AmbientLight(0xffffff, 0.75));

  // ── Rig: pivot far above frame → strap → clip → badge ───────────────────
  const pendulum = new THREE.Group();
  pendulum.name = "lanyard";
  scene.add(pendulum);

  // Strap: a segmented ribbon whose vertices are twisted per frame.
  const SEG = 60;
  const strapGeo = new THREE.PlaneGeometry(STRAP_W, STRAP_L, 1, SEG);
  strapGeo.translate(0, -STRAP_L / 2, 0);
  const strapTex = strapTexture();
  strapTex.repeat.set(1, STRAP_L / (STRAP_W * 4));
  const strap = new THREE.Mesh(
    strapGeo,
    new THREE.MeshStandardMaterial({
      map: strapTex,
      roughness: 0.85,
      side: THREE.FrontSide,
    }),
  );
  strap.name = "lanyard-strap";
  strap.castShadow = true;
  // The print runs on both faces, so the back is not mirrored when it twists.
  const strapBackTex = strapTex.clone();
  strapBackTex.wrapS = THREE.RepeatWrapping;
  strapBackTex.repeat.set(-1, strapTex.repeat.y);
  strapBackTex.needsUpdate = true;
  const strapBack = new THREE.Mesh(
    strapGeo,
    new THREE.MeshStandardMaterial({ map: strapBackTex, roughness: 0.85, side: THREE.BackSide }),
  );
  strapBack.name = "lanyard-strap-back";
  pendulum.add(strap, strapBack);
  const strapPos = strapGeo.attributes.position as THREE.BufferAttribute;
  const strapRest = Float32Array.from(strapPos.array as Float32Array);

  const hang = new THREE.Group();
  hang.name = "badge-assembly";
  hang.position.y = -STRAP_L;
  pendulum.add(hang);

  // Clip hardware.
  const metal = new THREE.MeshStandardMaterial({
    color: "#b9bcc4",
    metalness: 1,
    roughness: 0.28,
    envMap: studioEnv(renderer),
    envMapIntensity: 1.1,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: "#3a3b40",
    metalness: 0.9,
    roughness: 0.35,
    envMap: metal.envMap,
  });
  const clip = new THREE.Group();
  clip.name = "clip";
  hang.add(clip);

  // Strap end folds round the ring: a short darker tab.
  const tab = new THREE.Mesh(
    new THREE.BoxGeometry(STRAP_W, 0.22, 0.03),
    new THREE.MeshStandardMaterial({ color: "#101312", roughness: 0.9 }),
  );
  tab.name = "strap-fold";
  tab.position.y = 0.02;
  clip.add(tab);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.026, 16, 48), metal);
  ring.name = "clip-ring";
  ring.scale.set(1.55, 0.8, 1);
  ring.position.y = -0.12;
  clip.add(ring);

  const swivel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.14, 24), metal);
  swivel.name = "clip-swivel";
  swivel.position.y = -0.31;
  clip.add(swivel);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.32, 8, 24), darkMetal);
  body.name = "clip-body";
  body.position.y = -0.58;
  clip.add(body);

  const gate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.03), metal);
  gate.name = "clip-gate";
  gate.position.set(0, -0.6, 0.06);
  clip.add(gate);

  // The hook arcs through the card's hole, in the plane perpendicular to it.
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 14, 40, Math.PI * 1.25), metal);
  hook.name = "clip-hook";
  hook.rotation.y = Math.PI / 2;
  hook.rotation.z = -Math.PI * 0.12 + Math.PI;
  hook.position.y = HOOK_Y + 0.1;
  clip.add(hook);
  clip.traverse((o) => {
    o.castShadow = true;
  });

  // Badge: pivots on the hook at the hole.
  const badge = new THREE.Group();
  badge.name = "badge";
  badge.position.y = HOOK_Y;
  hang.add(badge);

  const cardShape = roundedRect(CARD_W, CARD_H, CARD_R);
  const holeY = CARD_H / 2 - HOLE_FROM_TOP;
  const hole = new THREE.Path();
  hole.absarc(0, holeY, HOLE_R, 0, Math.PI * 2, true);
  cardShape.holes.push(hole);

  const cardOffsetY = -holeY; // put the hole at the badge group's origin

  const edge = new THREE.Mesh(
    new THREE.ExtrudeGeometry(cardShape, { depth: CARD_D, bevelEnabled: false, curveSegments: 24 }),
    new THREE.MeshStandardMaterial({ color: "#3a4140", roughness: 0.4 }),
  );
  edge.name = "badge-edge";
  edge.position.set(0, cardOffsetY, -CARD_D / 2);
  edge.castShadow = true;
  badge.add(edge);

  const faceGeo = new THREE.ShapeGeometry(cardShape, 24);
  {
    const p = faceGeo.attributes.position as THREE.BufferAttribute;
    const uv = faceGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      uv.setXY(i, p.getX(i) / CARD_W + 0.5, p.getY(i) / CARD_H + 0.5);
    }
  }

  const FW = 1720;
  const FH = 2508;
  const frontCanvas = new OffscreenCanvas(FW, FH);
  const backCanvas = new OffscreenCanvas(FW, FH);
  const frontTex = new THREE.CanvasTexture(frontCanvas as unknown as HTMLCanvasElement);
  const backTex = new THREE.CanvasTexture(backCanvas as unknown as HTMLCanvasElement);
  for (const t of [frontTex, backTex]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  }
  const CELL = 172;
  const OFF = 86; // grid offset so the photo sits on the grid
  const hy = 124;
  const holeR = (HOLE_R / CARD_H) * FH;

  const ground = (g: OffscreenCanvasRenderingContext2D) => {
    g.fillStyle = C.card;
    g.fillRect(0, 0, FW, FH);
    // A faint lift at the top, so the dark card still reads as an object.
    const lift = g.createRadialGradient(FW / 2, FH * 0.3, 80, FW / 2, FH * 0.3, FH * 0.8);
    lift.addColorStop(0, "rgba(108,219,169,0.07)");
    lift.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = lift;
    g.fillRect(0, 0, FW, FH);
    drawDotGrid(g, FW, FH, CELL, OFF, OFF);
  };
  const finish = (g: OffscreenCanvasRenderingContext2D) => {
    g.strokeStyle = "rgba(255,255,255,0.16)";
    g.lineWidth = 6;
    g.beginPath();
    g.arc(FW / 2, hy, holeR + 4, 0, Math.PI * 2);
    g.stroke();
    // 1px-style border, inset, following the card's rounding.
    const r = (CARD_R / CARD_H) * FH;
    g.strokeStyle = "rgba(255,255,255,0.12)";
    g.lineWidth = 8;
    g.beginPath();
    g.roundRect(4, 4, FW - 8, FH - 8, r);
    g.stroke();
  };
  const text = (
    g: OffscreenCanvasRenderingContext2D,
    str: string,
    y: number,
    px: number,
    weight: number,
    colour: string,
    tracking = 0,
  ) => {
    g.font = `${weight} ${px}px ${FONT}`;
    (g as unknown as { letterSpacing: string }).letterSpacing = `${tracking}px`;
    g.fillStyle = colour;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(str, FW / 2 + tracking / 2, y);
  };

  // ── Front ────────────────────────────────────────────────────────────────
  const PHOTO = { x: OFF + CELL * 2, y: OFF + CELL * 3, w: CELL * 5, h: CELL * 5 };
  const f = frontCanvas.getContext("2d")!;
  ground(f);
  drawLockup(f, FW / 2, OFF + CELL * 1.5, 128);
  const sideTiles: Tile[] = [
    { x: OFF + CELL * 7, y: OFF + CELL * 3, bg: C.mint, icon: "gem" },
    { x: OFF + CELL * 7, y: OFF + CELL * 4, bg: C.lime, icon: "play" },
    { x: OFF + CELL * 1, y: OFF + CELL * 6, bg: C.purple, icon: "plus", fg: C.lilac },
    { x: OFF, y: OFF + CELL * 7, bg: C.mint, icon: "gem" },
  ];
  sideTiles.forEach((t) => drawTile(f, t, CELL));
  f.fillStyle = C.slate;
  f.beginPath();
  f.roundRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, 28);
  f.fill();
  text(f, "Musthaq Ahamad", 1640, 132, 500, C.text, -3);
  text(f, "AI & PRODUCT ENGINEER", 1770, 54, 500, C.muted, 9);
  f.fillStyle = "rgba(255,255,255,0.14)";
  f.fillRect(FW / 2 - 300, 1858, 600, 3);
  text(f, "@haxzie", 1945, 62, 400, "#b4b4bc");
  const rowY = FH - CELL;
  const bottom: Tile[] = [
    { x: -OFF, y: rowY, bg: C.lime, icon: "gem" },
    { x: OFF, y: rowY, bg: C.mint, icon: "gem" },
    { x: OFF + CELL, y: rowY, bg: C.teal, icon: "play", fg: C.paleMint },
    { x: OFF + CELL * 2, y: rowY, bg: C.purple, icon: "plus", fg: C.lilac },
    { x: OFF + CELL * 3, y: rowY, bg: C.slate, icon: "curve", fg: C.mint },
    { x: OFF + CELL * 4, y: rowY, bg: C.lime, icon: "focus", band: C.teal },
    { x: OFF + CELL * 5, y: rowY, bg: C.lime, icon: "play" },
    { x: OFF + CELL * 6, y: rowY, bg: C.mint, icon: "gem" },
    { x: OFF + CELL * 7, y: rowY, bg: C.purple, icon: "plus", fg: C.lilac },
    { x: OFF + CELL * 8, y: rowY, bg: C.lime, icon: "gem" },
    { x: OFF + CELL * 9, y: rowY, bg: C.teal },
  ];
  bottom.forEach((t) => drawTile(f, t, CELL));
  finish(f);

  new THREE.ImageLoader(ctx.manager).load(avatarUrl, (img) => {
    f.save();
    f.beginPath();
    f.roundRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, 28);
    f.clip();
    f.filter = "grayscale(1) contrast(1.08) brightness(1.04)";
    f.drawImage(img, PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    f.restore();
    frontTex.needsUpdate = true;
  });

  // ── Back: the mark, the wordmark, and the brand's tile staircase ────────
  const b = backCanvas.getContext("2d")!;
  ground(b);
  drawMark(b, FW / 2, 640, 520);
  text(b, "GenMotion", 1110, 170, 500, C.text, -4);
  const stair: Tile[] = [
    { x: -OFF, y: FH - CELL, bg: C.lime, icon: "gem" },
    { x: OFF, y: FH - CELL * 2, bg: C.mint, icon: "gem" },
    { x: OFF + CELL, y: FH - CELL * 2, bg: C.teal, icon: "play", fg: C.paleMint },
    { x: OFF + CELL * 2, y: FH - CELL * 3, bg: C.purple, icon: "plus", fg: C.lilac },
    { x: OFF + CELL * 3, y: FH - CELL * 3, bg: C.slate, icon: "curve", fg: C.mint },
    { x: OFF + CELL * 4, y: FH - CELL * 3, bg: C.lime, icon: "focus", band: C.teal },
    { x: OFF + CELL * 5, y: FH - CELL * 4, bg: C.lime, icon: "focus", band: C.teal },
    { x: OFF + CELL * 6, y: FH - CELL * 4, bg: C.lime, icon: "play" },
    { x: OFF + CELL * 7, y: FH - CELL * 5, bg: C.mint, icon: "gem" },
  ];
  stair.forEach((t) => drawTile(b, t, CELL));
  finish(b);
  backTex.needsUpdate = true;

  const front = new THREE.Mesh(
    faceGeo,
    new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.62 }),
  );
  front.name = "badge-front";
  front.position.set(0, cardOffsetY, CARD_D / 2 + 0.0015);
  front.castShadow = true;
  badge.add(front);

  const back = new THREE.Mesh(
    faceGeo,
    new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.62 }),
  );
  back.name = "badge-back";
  back.rotation.y = Math.PI;
  back.position.set(0, cardOffsetY, -CARD_D / 2 - 0.0015);
  badge.add(back);

  // ── Camera framing (square/landscape/portrait all fit the card) ─────────
  const aspect = width / height;
  const fitDist = (h: number, w: number) => {
    const k = 2 * Math.tan(THREE.MathUtils.degToRad(25));
    return Math.max(h / k, w / (k * aspect));
  };
  const wideDist = fitDist(9.3, 6.2);
  const closeDist = fitDist(6.1, 4.1);
  const camFrom = new THREE.Vector3(0, -0.25, wideDist);
  const camTo = new THREE.Vector3(0, -0.6, closeDist);
  const lookFrom = new THREE.Vector3(0, -0.4, 0);
  const lookTo = new THREE.Vector3(0, -0.5, 0);
  const look = new THREE.Vector3();

  const TAU = Math.PI * 2;

  return ({ frame, time }) => {
    const f = frame;

    // Drop: accelerate in from above, then bounce on the strap's stretch.
    const fallT = THREE.MathUtils.clamp(f / FALL_END, 0, 1);
    let dy = 7 * (1 - fallT * fallT);
    const tb = Math.max(0, (f - FALL_END) / 30);
    if (f >= FALL_END) dy = -0.42 * Math.exp(-3.2 * tb) * Math.sin(10.5 * tb);
    // Exit: yanked back up.
    dy += interpolate(f, [YANK_IN, YANK_OUT], [0, 14], Easing.easeIn);

    // Swing (around the far-off pivot) — damped, with a breath that never stops.
    const ts = tb;
    const swing =
      0.055 * Math.exp(-0.32 * ts) * Math.cos(2.6 * ts + 0.4) +
      0.006 * Math.sin(time * 0.9) +
      interpolate(f, [YANK_IN, YANK_OUT], [0, 0.03], Easing.easeIn);
    pendulum.position.set(0, PIVOT_Y + dy, 0);
    pendulum.rotation.z = swing;
    pendulum.rotation.x = -0.012 * Math.exp(-0.5 * ts) * Math.sin(2.1 * ts);

    // Twist: the badge arrives turned, unwinds, then spins once to show its back.
    const twistIn = 0.75 * Math.exp(-0.45 * (f / 30)) * Math.cos(2.3 * (f / 30));
    const spin = TAU * interpolate(f, [SPIN_IN, SPIN_OUT], [0, 1], Easing.easeInOut);
    const ta = Math.max(0, (f - SPIN_OUT) / 30);
    const settle = f > SPIN_OUT ? 0.22 * Math.exp(-0.9 * ta) * Math.sin(2.8 * ta) : 0;
    const ambient = 0.05 * Math.sin(time * 0.7 + 1.1);
    const psi = twistIn + spin + settle + ambient;
    hang.rotation.y = psi;

    // The strap carries the twist, growing towards the clip.
    for (let i = 0; i < strapPos.count; i++) {
      const x0 = strapRest[i * 3];
      const y0 = strapRest[i * 3 + 1];
      const s = -y0 / STRAP_L;
      const a = psi * s * s * s;
      strapPos.setXYZ(i, x0 * Math.cos(a), y0, -x0 * Math.sin(a));
    }
    strapPos.needsUpdate = true;
    strapGeo.computeVertexNormals();

    // The card rocks on the hook as the strap bounces.
    badge.rotation.x =
      0.16 * Math.exp(-2.6 * tb) * Math.sin(9 * tb) * (f >= FALL_END ? 1 : 0) +
      0.015 * Math.sin(time * 1.1);
    badge.rotation.z = -swing * 0.6;

    // One camera idea: a slow push in on the badge.
    const push = interpolate(f, [PUSH_IN, PUSH_OUT], [0, 1], Easing.easeInOut);
    camera.position.lerpVectors(camFrom, camTo, push);
    look.lerpVectors(lookFrom, lookTo, push);
    camera.lookAt(look);


  };
}
