/**
 * The lanyard drop, as a `@genmotion/three-engine` scene.
 *
 * A port of `packages/templates/catalog/lanyard-drop-job-announcement`, not a
 * fresh take on the idea: the rig, the hardware, the timeline and the camera
 * move are the template's, and the one thing the tool changes is where the two
 * card faces come from. The template paints them from the brand kit; here they
 * are whatever the visitor dropped on the page.
 *
 * Written against the same `ThreeSceneBuilder` contract a project scene is, so
 * it is the engine that owns determinism: build once, return an update
 * callback, and let `mountThreeRenderHost` call it exactly once per frame it is
 * asked for. Nothing below reads a clock, and `time` comes off the frame rather
 * than a closure, which is what makes the preview and the export the same
 * video.
 *
 * The motion is analytic rather than simulated. A rope solver has to be walked
 * from frame zero to be deterministic and lands wherever its damping leaves it;
 * these curves are exact at any frame and are *written* to arrive, turn and
 * settle on the beats the template chose.
 */

import { THREE, Easing, interpolate } from "@genmotion/three-engine";
import type {
  ThreeFrame,
  ThreeSceneBuilder,
  ThreeSceneContext,
  ThreeSceneUpdate,
} from "@genmotion/three-engine";
import { LANYARD_STYLES, type CardShapeId, type LanyardStyleId } from "./types";

/* ------------------------------------------------------------- dimensions */

/** The card's longest edge, in world units. Everything else is tuned to it. */
const CARD_LONG = 4.6;
const CARD_D = 0.035;
const CARD_R = 0.12;
/** Punch hole, as fractions of the card's height. */
const HOLE_FROM_TOP = 0.0494;
const HOLE_RADIUS = 0.0135;

const STRAP_W = 0.44;
/** The strap hangs from a point far above frame, so the swing arc is shallow. */
const PIVOT_Y = 12;
/** Hook bottom, below the strap's end. */
const HOOK_Y = -0.96;
/** Where the card's centre comes to rest, which is what the camera looks at. */
const CARD_REST_Y = -0.6;

/* --------------------------------------------------------------- timeline */

const FALL_END = 14;
const PUSH_IN = 120;
const PUSH_OUT = 400;
const SPIN_IN = 200;
const SPIN_OUT = 262;
const YANK_IN = 458;
const YANK_OUT = 470;

const TAU = Math.PI * 2;

export interface LanyardSceneOptions {
  shape: CardShapeId;
  style: LanyardStyleId;
  /** Webbing colour, as a hex string. */
  strap: string;
  /** The two printed faces, already sampled to the card's ratio. */
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
  /** Width ÷ height of the card. */
  ratio: number;
}

export function createLanyardSceneBuilder(options: LanyardSceneOptions): ThreeSceneBuilder {
  return (ctx: ThreeSceneContext) => buildLanyardScene(ctx, options);
}

function buildLanyardScene(
  ctx: ThreeSceneContext,
  options: LanyardSceneOptions,
): ThreeSceneUpdate {
  const { scene, camera, renderer, width, height } = ctx;
  const style = LANYARD_STYLES[options.style];

  const cardHeight = options.ratio >= 1 ? CARD_LONG / options.ratio : CARD_LONG;
  const cardWidth = cardHeight * options.ratio;
  const holeFromTop = cardHeight * HOLE_FROM_TOP;
  const holeRadius = cardHeight * HOLE_RADIUS;
  const holeY = cardHeight / 2 - holeFromTop;
  // Put the hole at the badge group's origin, so the card swings on the hook
  // rather than about its own middle.
  const cardOffsetY = -holeY;
  // Length the strap so the *card's centre* lands on the camera's target. The
  // easy mistake is measuring to the clip, which parks the badge half a card
  // low in every frame.
  const hangY = CARD_REST_Y - HOOK_Y - cardOffsetY;
  const strapLength = PIVOT_Y - hangY;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.background = new THREE.Color(style.background);

  /* ------------------------------------------------------------ backdrop */

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: style.wall, roughness: 1 }),
  );
  wall.position.z = -2.6;
  wall.receiveShadow = true;
  scene.add(wall);

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 512;
  glowCanvas.height = 512;
  const gg = glowCanvas.getContext("2d")!;
  const bloom = gg.createRadialGradient(256, 256, 0, 256, 256, 256);
  bloom.addColorStop(0, style.glow[0]);
  bloom.addColorStop(0.45, style.glow[1]);
  bloom.addColorStop(1, "rgba(0,0,0,0)");
  gg.fillStyle = bloom;
  gg.fillRect(0, 0, 512, 512);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false }),
  );
  glow.position.set(0, -0.4, -2.55);
  scene.add(glow);

  /* -------------------------------------------------------------- lights */

  const key = new THREE.DirectionalLight(new THREE.Color(style.lights.key), style.lights.keyIntensity);
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
  const fill = new THREE.DirectionalLight(new THREE.Color(style.lights.fill), 0.55);
  fill.position.set(5, -1, 6);
  const rim = new THREE.DirectionalLight(new THREE.Color(style.lights.rim), 0.9);
  rim.position.set(2, 6, -6);
  scene.add(key, fill, rim, new THREE.AmbientLight(0xffffff, style.lights.ambient));

  /* ------------------ rig: pivot far above frame → strap → clip → badge */

  const pendulum = new THREE.Group();
  scene.add(pendulum);

  // The strap is a tall plane whose vertices are rotated about its own centre
  // line per frame, by an angle that grows cubically toward the clip. A real
  // lanyard twists where the badge turns it and hangs flat further up, and a
  // cubic ramp is the cheapest thing that reads as that.
  const SEGMENTS = 60;
  const strapGeometry = new THREE.PlaneGeometry(STRAP_W, strapLength, 1, SEGMENTS);
  strapGeometry.translate(0, -strapLength / 2, 0);
  const strapTexture = webbingTexture(options.strap);
  strapTexture.repeat.set(1, strapLength / (STRAP_W * 4));
  const strap = new THREE.Mesh(
    strapGeometry,
    new THREE.MeshStandardMaterial({ map: strapTexture, roughness: 0.85, side: THREE.FrontSide }),
  );
  strap.castShadow = true;
  // A second mesh for the far side, with the texture flipped in U. Webbing is
  // printed on both faces, so the back must not read as a mirror image when
  // the twist turns it toward camera.
  const backTexture = strapTexture.clone();
  backTexture.wrapS = THREE.RepeatWrapping;
  backTexture.repeat.set(-1, strapTexture.repeat.y);
  backTexture.needsUpdate = true;
  const strapBack = new THREE.Mesh(
    strapGeometry,
    new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.85, side: THREE.BackSide }),
  );
  pendulum.add(strap, strapBack);
  const strapPosition = strapGeometry.attributes.position as THREE.BufferAttribute;
  const strapRest = Float32Array.from(strapPosition.array as Float32Array);

  const hang = new THREE.Group();
  hang.position.y = -strapLength;
  pendulum.add(hang);

  /* ---------------------------------------------------- the clip hardware */

  const environment = studioEnvironment(renderer);
  const metal = new THREE.MeshStandardMaterial({
    color: "#b9bcc4",
    metalness: 1,
    roughness: 0.28,
    envMap: environment,
    envMapIntensity: 1.1,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: "#3a3b40",
    metalness: 0.9,
    roughness: 0.35,
    envMap: environment,
  });

  const clip = new THREE.Group();
  hang.add(clip);

  // The strap's end folds back on itself round the ring: a short darker tab.
  const fold = new THREE.Mesh(
    new THREE.BoxGeometry(STRAP_W, 0.22, 0.03),
    new THREE.MeshStandardMaterial({ color: "#101312", roughness: 0.9 }),
  );
  fold.position.y = 0.02;
  clip.add(fold);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.026, 16, 48), metal);
  ring.scale.set(1.55, 0.8, 1);
  ring.position.y = -0.12;
  clip.add(ring);

  const swivel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.14, 24), metal);
  swivel.position.y = -0.31;
  clip.add(swivel);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.32, 8, 24), darkMetal);
  body.position.y = -0.58;
  clip.add(body);

  const gate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.03), metal);
  gate.position.set(0, -0.6, 0.06);
  clip.add(gate);

  // The hook arcs through the card's hole, in the plane perpendicular to it.
  const hook = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.024, 14, 40, Math.PI * 1.25),
    metal,
  );
  hook.rotation.y = Math.PI / 2;
  hook.rotation.z = -Math.PI * 0.12 + Math.PI;
  hook.position.y = HOOK_Y + 0.1;
  clip.add(hook);
  clip.traverse((object) => {
    object.castShadow = true;
  });

  /* -------------------------------------------------------------- the card */

  const badge = new THREE.Group();
  badge.position.y = HOOK_Y;
  hang.add(badge);

  const outline = roundedRect(cardWidth, cardHeight, CARD_R);
  const hole = new THREE.Path();
  hole.absarc(0, holeY, holeRadius, 0, TAU, true);
  outline.holes.push(hole);

  const edge = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outline, { depth: CARD_D, bevelEnabled: false, curveSegments: 24 }),
    new THREE.MeshStandardMaterial({ color: "#3a4140", roughness: 0.4 }),
  );
  edge.position.set(0, cardOffsetY, -CARD_D / 2);
  edge.castShadow = true;
  badge.add(edge);

  const faceGeometry = new THREE.ShapeGeometry(outline, 24);
  // ShapeGeometry copies the shape's own coordinates into the UV attribute,
  // which here are world units around the origin. Without this the artwork
  // would land mostly outside 0..1 and the card would show one stretched
  // corner of it.
  {
    const position = faceGeometry.attributes.position as THREE.BufferAttribute;
    const uv = faceGeometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      uv.setXY(i, position.getX(i) / cardWidth + 0.5, position.getY(i) / cardHeight + 0.5);
    }
  }

  const frontTexture = faceTexture(options.front);
  const backFaceTexture = faceTexture(options.back);

  const front = new THREE.Mesh(
    faceGeometry,
    new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.62 }),
  );
  front.position.set(0, cardOffsetY, CARD_D / 2 + 0.0015);
  front.castShadow = true;
  badge.add(front);

  const back = new THREE.Mesh(
    faceGeometry,
    new THREE.MeshStandardMaterial({ map: backFaceTexture, roughness: 0.62 }),
  );
  back.rotation.y = Math.PI;
  back.position.set(0, cardOffsetY, -CARD_D / 2 - 0.0015);
  badge.add(back);

  /* ------------------------------------------------------------- framing */

  // One fit for every aspect: whichever of height and width is tighter sets
  // the distance, so a portrait badge in 16:9 and a landscape one in 9:16 are
  // both fully in frame.
  const aspect = width / height;
  const fitDistance = (h: number, w: number) => {
    const k = 2 * Math.tan(THREE.MathUtils.degToRad(25));
    return Math.max(h / k, w / (k * aspect));
  };
  const cameraFrom = new THREE.Vector3(0, -0.25, fitDistance(cardHeight + 4.7, cardWidth + 3.05));
  const cameraTo = new THREE.Vector3(0, -0.6, fitDistance(cardHeight + 1.5, cardWidth + 0.95));
  const lookFrom = new THREE.Vector3(0, -0.4, 0);
  const lookTo = new THREE.Vector3(0, -0.5, 0);
  const look = new THREE.Vector3();

  /* -------------------------------------------------------------- frames */

  return ({ frame, time }: ThreeFrame) => {
    // Drop: accelerate in from above, then bounce on the strap's stretch.
    const fall = THREE.MathUtils.clamp(frame / FALL_END, 0, 1);
    let dy = 7 * (1 - fall * fall);
    const bounce = Math.max(0, (frame - FALL_END) / 30);
    if (frame >= FALL_END) dy = -0.42 * Math.exp(-3.2 * bounce) * Math.sin(10.5 * bounce);
    // Exit: yanked back up out of frame.
    dy += interpolate(frame, [YANK_IN, YANK_OUT], [0, 14], Easing.easeIn);

    // Swing about the far-off pivot: damped, with a breath that never stops.
    const swing =
      0.055 * Math.exp(-0.32 * bounce) * Math.cos(2.6 * bounce + 0.4) +
      0.006 * Math.sin(time * 0.9) +
      interpolate(frame, [YANK_IN, YANK_OUT], [0, 0.03], Easing.easeIn);
    pendulum.position.set(0, PIVOT_Y + dy, 0);
    pendulum.rotation.z = swing;
    pendulum.rotation.x = -0.012 * Math.exp(-0.5 * bounce) * Math.sin(2.1 * bounce);

    // Twist: the badge arrives turned, unwinds, then turns once onto its back
    // and back again. This is the beat the second upload exists for.
    const arrival = 0.75 * Math.exp(-0.45 * (frame / 30)) * Math.cos(2.3 * (frame / 30));
    const spin = TAU * interpolate(frame, [SPIN_IN, SPIN_OUT], [0, 1], Easing.easeInOut);
    const after = Math.max(0, (frame - SPIN_OUT) / 30);
    const overshoot = frame > SPIN_OUT ? 0.22 * Math.exp(-0.9 * after) * Math.sin(2.8 * after) : 0;
    const ambient = 0.05 * Math.sin(time * 0.7 + 1.1);
    const twist = arrival + spin + overshoot + ambient;
    hang.rotation.y = twist;

    // The strap carries that twist, growing toward the clip.
    for (let i = 0; i < strapPosition.count; i++) {
      const x = strapRest[i * 3]!;
      const y = strapRest[i * 3 + 1]!;
      const along = -y / strapLength;
      const angle = twist * along * along * along;
      strapPosition.setXYZ(i, x * Math.cos(angle), y, -x * Math.sin(angle));
    }
    strapPosition.needsUpdate = true;
    strapGeometry.computeVertexNormals();

    // The card rocks on the hook as the strap bounces.
    badge.rotation.x =
      0.16 * Math.exp(-2.6 * bounce) * Math.sin(9 * bounce) * (frame >= FALL_END ? 1 : 0) +
      0.015 * Math.sin(time * 1.1);
    badge.rotation.z = -swing * 0.6;

    // One camera idea: a slow push in on the badge.
    const push = interpolate(frame, [PUSH_IN, PUSH_OUT], [0, 1], Easing.easeInOut);
    camera.position.lerpVectors(cameraFrom, cameraTo, push);
    look.lerpVectors(lookFrom, lookTo, push);
    (camera as THREE.PerspectiveCamera).lookAt(look);
  };
}

/* ------------------------------------------------------------------ pieces */

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function faceTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Studio reflections for the metal clip, built from core three only.
 *
 * A box with three softbox planes in it, prefiltered once. Without an
 * environment a `metalness: 1` surface has nothing to reflect and the whole
 * clip renders black; this is the cheapest thing that makes it read as metal,
 * and unlike `RoomEnvironment` it is three primitives rather than an addon.
 */
function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const room = new THREE.Scene();
  room.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(20, 20, 20),
      new THREE.MeshBasicMaterial({ color: "#1c1c20", side: THREE.BackSide }),
    ),
  );
  const softbox = (w: number, h: number, x: number, y: number, z: number, colour: string) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: colour }),
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  };
  softbox(8, 3, -5, 6, 6, "#ffffff");
  softbox(3, 10, 8, 0, 2, "#c8ccd6");
  softbox(10, 2, 0, -8, 0, "#55565c");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(room, 0.03).texture;
  pmrem.dispose();
  return texture;
}

/**
 * Polyester webbing: the strap colour, a fine weave, and darker edge binding.
 *
 * The speckle is seeded rather than random, because this texture is built once
 * per renderer and the export builds a second renderer: two different noise
 * fields would make the exported strap a different strap from the previewed
 * one.
 */
function webbingTexture(colour: string): THREE.CanvasTexture {
  const W = 256;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  g.fillStyle = colour;
  g.fillRect(0, 0, W, H);

  const random = mulberry32(7);
  for (let y = 0; y < H; y += 2) {
    g.fillStyle = `rgba(255,255,255,${0.015 + random() * 0.035})`;
    g.fillRect(0, y, W, 1);
  }
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.18)";
    g.fillRect(random() * W, random() * H, 2, 1);
  }
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(0, 0, 10, H);
  g.fillRect(W - 10, 0, 10, H);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** Seeded, deterministic random source. Called when building, never per frame. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
