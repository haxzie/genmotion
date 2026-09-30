import * as THREE from "three";
import type { ThreeSceneContext } from "@genmotion/three-engine";
import { C } from "./brand";
import { filmOverlay, flashPlane, type Globals } from "./fx";
import { FPS, hash } from "./music";

/** What the HUD pieces (lyrics, p(doom) meter) need: a px-unit overlay group. */
export type HudHost = {
  hud: THREE.Group;
  W: number;
  H: number;
  put: <T extends THREE.Object3D>(parent: THREE.Object3D, o: T, order: number) => T;
};

export type World = ReturnType<typeof createWorld>;

const HUD_Z = 10;

/**
 * A real 3D world with a perspective camera, plus a HUD glued to the camera
 * where 1 unit = 1px of a 1080p frame (lyrics, gauge, flashes, film grain).
 */
export function createWorld(ctx: ThreeSceneContext, startFrame: number, o: { bg?: string; fog?: [number, number] } = {}) {
  const { scene, width, height } = ctx;
  const cam = ctx.camera as THREE.PerspectiveCamera;
  cam.near = 0.1;
  cam.far = 5000;
  cam.fov = 50;
  cam.aspect = width / height;
  cam.updateProjectionMatrix();
  const H = 1080;
  const W = (H * width) / height;

  const bg = new THREE.Color(o.bg ?? C.night);
  scene.background = bg;
  if (o.fog) scene.fog = new THREE.Fog(bg, o.fog[0], o.fog[1]);

  const g: Globals = { uInvert: { value: 0 }, uTime: { value: 0 } };
  const root = new THREE.Group();
  root.name = "world";
  scene.add(root);

  const hud = new THREE.Group();
  hud.name = "hud";
  hud.position.z = -HUD_Z;
  cam.add(hud);
  scene.add(cam);

  const put = <T extends THREE.Object3D>(parent: THREE.Object3D, obj: T, order: number): T => {
    obj.traverse((c) => (c.renderOrder = order));
    parent.add(obj);
    return obj;
  };

  // a key, a cool rim and a pink fill: nothing lit ever goes dead black
  const amb = new THREE.AmbientLight(0xb8a8ff, 0.7);
  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(4, 7, 6);
  const rim = new THREE.DirectionalLight(C.cyan, 1.6);
  rim.position.set(-6, 3, -5);
  const fill = new THREE.DirectionalLight(C.pink, 1.2);
  fill.position.set(-5, -2, 5);
  scene.add(amb, key, rim, fill);

  // post layers, all in the HUD so they never move
  const film = put(hud, filmOverlay(W + 4, H + 4, g), 900);
  const invert = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 4, H + 4),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneMinusDstColorFactor,
      blendDst: THREE.ZeroFactor,
    }),
  );
  invert.name = "impact-invert";
  invert.userData.pickable = false;
  invert.visible = false;
  put(hud, invert, 940);
  const flash = put(hud, flashPlane(W + 4, H + 4, "#ffffff"), 950);
  flash.name = "flash";
  const fade = put(hud, flashPlane(W + 4, H + 4, "#05020d", false), 960);
  fade.name = "fade";
  film.userData.pickable = false;

  // one soft glow texture for every sprite
  const gc = new OffscreenCanvas(128, 128);
  const gx = gc.getContext("2d")!;
  const grad = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.6)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.15)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  gx.fillStyle = grad;
  gx.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(gc as unknown as HTMLCanvasElement);
  glowTex.colorSpace = THREE.SRGBColorSpace;

  /** Additive camera-facing glow. `size` in world units. */
  const glow = (color: string, size: number, name = "glow") => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    s.scale.setScalar(size);
    s.name = name;
    s.userData.pickable = false;
    return s;
  };

  const T = (frame: number) => (startFrame + frame) / FPS;
  const bbQ = new THREE.Quaternion();
  const bbM = new THREE.Matrix4();

  /** Place the camera for this frame. Shake is in world units. */
  const shot = (t: number, pos: THREE.Vector3, look: THREE.Vector3, opt: { fov?: number; roll?: number; shake?: number } = {}) => {
    const f = Math.floor(t * 30);
    const sh = opt.shake ?? 0;
    cam.position.set(pos.x + (hash(f) - 0.5) * sh, pos.y + (hash(f + 91) - 0.5) * sh, pos.z + (hash(f + 37) - 0.5) * sh);
    cam.up.set(0, 1, 0);
    cam.lookAt(look);
    if (opt.roll) cam.rotateZ(opt.roll);
    const fov = opt.fov ?? 50;
    if (Math.abs(cam.fov - fov) > 1e-4) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    hud.scale.setScalar((2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * HUD_Z) / H);
    g.uTime.value = t;
    // camera-facing objects are turned from THIS frame's camera, never last frame's
    cam.updateMatrixWorld();
    root.traverseVisible((o) => {
      if (!o.userData.billboard) return;
      o.quaternion.copy(cam.quaternion);
      if (o.parent) o.quaternion.premultiply(bbQ.setFromRotationMatrix(bbM.extractRotation(o.parent.matrixWorld)).invert());
    });
  };

  /** Full-frame post: white flash, dark fade, and the anime impact frame (colour invert). */
  const post = (p: { flash?: number; fade?: number; invert?: boolean }) => {
    flash.material.opacity = THREE.MathUtils.clamp(p.flash ?? 0, 0, 1);
    fade.material.opacity = THREE.MathUtils.clamp(p.fade ?? 0, 0, 1);
    invert.visible = !!p.invert;
  };

  /** Call once at the end of the builder: HUD type must never be fogged. */
  const seal = () => {
    hud.traverse((c) => {
      const m = (c as THREE.Mesh).material as THREE.Material | undefined;
      if (m && "fog" in m) {
        (m as THREE.MeshBasicMaterial).fog = false;
        m.needsUpdate = true;
      }
    });
  };

  return { scene, cam, root, hud, W, H, g, put, glow, glowTex, T, shot, post, seal, lights: { amb, key, rim, fill } };
}
