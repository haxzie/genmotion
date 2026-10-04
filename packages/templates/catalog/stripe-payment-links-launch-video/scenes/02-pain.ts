/**
 * 02 · "a pain" → streak → red tile → blurple puck → column — global frames 60–207
 *
 * Remix of the original shot in Stripe light mode. "a pain" is printed on a pale
 * grid floor seen from straight above; the camera tilts down to the horizon, the
 * type dissolves, and the dot of the "i" stays behind as a blurple light. It
 * streaks off, drops a red tile (the hassle), parks, then strikes the tile — which
 * morphs into a blurple puck and extrudes into the column scene 03 opens inside.
 *
 * Smoothness: camera and light both ride C1 splines (no stop at any key), the
 * tile→puck change is a 6-frame morph, not a swap.
 */
import * as THREE from "three";
import { type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts } from "../components/fonts";
import { makeText, measureText, type TextOpts } from "../components/type";
import { studioEnvLight } from "../components/linkmark";
import { C } from "../components/brand";
import { streakTexture, radialTexture } from "../components/fx";
import { seg, easeOutCubic, easeInCubic, splineKeys } from "../components/stage";

const G0 = 60; // global frame this scene starts at

function floorTexture() {
  const cells = 4;
  const px = 160;
  const S = cells * px;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d")!;
  g.fillStyle = "#F6F9FC";
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "rgba(10,37,64,0.13)";
  g.lineWidth = 2.2;
  g.beginPath();
  for (let i = 0; i <= cells; i++) {
    g.moveTo(i * px, 0); g.lineTo(i * px, S);
    g.moveTo(0, i * px); g.lineTo(S, i * px);
  }
  g.stroke();
  // bright "+" at the tile corner
  const cs = px * 0.32;
  for (const [x, y] of [[0, 0], [S, 0], [0, S], [S, S]]) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const gr = g.createLinearGradient(x - dx * cs, y - dy * cs, x + dx * cs, y + dy * cs);
      gr.addColorStop(0, "rgba(99,91,255,0)");
      gr.addColorStop(0.5, "rgba(99,91,255,0.85)");
      gr.addColorStop(1, "rgba(99,91,255,0)");
      g.strokeStyle = gr;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x - dx * cs, y - dy * cs);
      g.lineTo(x + dx * cs, y + dy * cs);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  return t;
}

/** Square slab with rounded, bevelled edges, centred, size s × h × s. */
function roundedSlab(s: number, h: number, r: number) {
  const shape = new THREE.Shape();
  const a = s / 2 - r;
  shape.moveTo(-a, -s / 2);
  shape.lineTo(a, -s / 2); shape.quadraticCurveTo(s / 2, -s / 2, s / 2, -a);
  shape.lineTo(s / 2, a); shape.quadraticCurveTo(s / 2, s / 2, a, s / 2);
  shape.lineTo(-a, s / 2); shape.quadraticCurveTo(-s / 2, s / 2, -s / 2, a);
  shape.lineTo(-s / 2, -a); shape.quadraticCurveTo(-s / 2, -s / 2, -a, -s / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h - 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -(h - 0.08) / 2, 0);
  return geo;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, renderer } = ctx;
    const camera = ctx.camera as THREE.PerspectiveCamera;
    camera.fov = 50;
    camera.near = 0.05;
    camera.far = 200;
    camera.rotation.order = "YXZ";
    camera.updateProjectionMatrix();
    scene.background = new THREE.Color(C.page);
    scene.fog = new THREE.Fog(C.page, 5, 22);
    const env = studioEnvLight(renderer as THREE.WebGLRenderer);

    // ---------------------------------------------------------------- floor grid
    const TILE = 4;
    const floorTex = floorTexture();
    floorTex.repeat.set(160 / TILE, 160 / TILE);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshBasicMaterial({ map: floorTex, toneMapped: false }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(2, 0, -2);
    floor.name = "grid-floor";
    floor.userData.pickable = false;
    scene.add(floor);

    // ---------------------------------------------------------------- title on the floor
    const FS = 240;
    const WORLD_FS = 2.45;
    const k = WORLD_FS / FS;
    const tOpts: TextOpts = { size: FS, weight: 500, tracking: -0.02, gradient: [C.navy, "#3b5170"], gradientDir: "v", blur: 14 };
    const full = "a paın"; // dotless i: the dot is its own object
    const total = measureText(full, tOpts);
    const title = new THREE.Group();
    title.name = "a-pain";
    title.rotation.x = -Math.PI / 2;
    title.position.y = 0.01;
    title.scale.setScalar(k);
    const wA = makeText("a", { ...tOpts, anchor: "left" }, "a");
    wA.group.position.x = -total / 2;
    const wPain = makeText("paın", { ...tOpts, anchor: "left" }, "pain");
    wPain.group.position.x = -total / 2 + measureText("a ", tOpts);
    title.add(wA.group, wPain.group);
    scene.add(title);
    const iX = -total / 2 + measureText("a pa", tOpts) + measureText("ı", tOpts) / 2;
    const iY = FS * 0.47;
    const I = V(iX * k, 0.06, -iY * k);

    // ---------------------------------------------------------------- the blurple light + streak
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.135, 32, 16), new THREE.MeshBasicMaterial({ color: C.blurple, toneMapped: false, fog: false }));
    dot.name = "light-dot";
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 1.4),
      new THREE.MeshBasicMaterial({ map: radialTexture(), color: C.blurple, transparent: true, opacity: 0.35, depthWrite: false, depthTest: false, toneMapped: false, fog: false }),
    );
    halo.userData.pickable = false;
    scene.add(halo, dot);

    const streakGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(12);
    streakGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    streakGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    streakGeo.setIndex([0, 1, 2, 0, 2, 3]);
    const streak = new THREE.Mesh(
      streakGeo,
      new THREE.MeshBasicMaterial({ map: streakTexture(), color: C.blurple, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }),
    );
    streak.name = "light-streak";
    streak.frustumCulled = false;
    streak.userData.pickBounds = new THREE.Box3(V(-0.3, -0.3, -0.3), V(0.3, 0.3, 0.3));
    scene.add(streak);

    // ---------------------------------------------------------------- red tile → blurple puck
    const D = V(-3.4, 0, -13.0); // the tile
    const R = V(-0.4, 0.12, -13.2); // where the light parks
    const F = V(-4.6, 0.12, -17.4); // the far turn

    const tileMat = new THREE.MeshPhysicalMaterial({ color: "#E8384F", metalness: 0.1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05, envMap: env, envMapIntensity: 0.5 });
    const tile = new THREE.Mesh(roundedSlab(1.6, 0.2, 0.06), tileMat);
    tile.name = "red-tile";
    tile.position.copy(D).setY(0.12);
    scene.add(tile);
    const red = new THREE.Color("#E8384F"), blurple = new THREE.Color(C.blurple);

    const puckMat = new THREE.MeshPhysicalMaterial({ color: "#5148F0", metalness: 0.45, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMap: env, envMapIntensity: 1.1, sheen: 0.5, sheenColor: new THREE.Color("#C9C5FF") });
    const puck = new THREE.Group();
    puck.name = "blurple-puck";
    const puckBody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1, 96), puckMat);
    puckBody.position.y = 0.5;
    puckBody.name = "blurple-puck-body";
    puck.add(puckBody);
    puck.position.copy(D);
    scene.add(puck);
    // impact ripple on the floor
    const ripple = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 96),
      new THREE.MeshBasicMaterial({ color: C.blurple, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    );
    ripple.name = "impact-ripple";
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.copy(D).setY(0.02);
    ripple.userData.pickable = false;
    scene.add(ripple);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-4, 8, 3);
    const rim = new THREE.DirectionalLight(0xe9e7ff, 1.2);
    rim.position.set(6, 3, -6);
    scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.45));

    // ---------------------------------------------------------------- the light's path (spline)
    const I0 = V(I.x, 0.31, I.z);
    const mid = I0.clone().lerp(F, 0.5);
    const past = D.clone().addScaledVector(D.clone().sub(R), 0.35);
    const LIGHT: number[][] = [
      [100, I.x, I.y, I.z],
      [112, I0.x, I0.y, I0.z],
      [123, mid.x, 0.18, mid.z],
      [134, F.x, F.y, F.z],
      [148, R.x, R.y, R.z],
      [176, R.x + 0.05, R.y, R.z - 0.05],
      [187, D.x, 0.12, D.z],
      [190, past.x, 0.12, past.z],
    ];
    const lv = [0, 0, 0];
    function lightPos(G: number, out: THREE.Vector3) {
      splineKeys(LIGHT, G, lv);
      return out.set(lv[0], lv[1], lv[2]);
    }

    // ---------------------------------------------------------------- camera (spline over orbit params)
    // [G, target x, y, z, radius, pitch°, yaw°]
    const CAM: number[][] = [
      [60, 1.55, 0, -0.35, 6.4, -90, 0],
      [84, 1.75, 0, -0.45, 5.3, -86, 0],
      [100, 1.9, 0, -0.7, 4.9, -62, 0],
      [110, 1.8, 0, -1.6, 4.9, -36, 0],
      [118, 1.2, 0, -3.6, 4.0, -23, 4],
      [128, -1.0, 0, -9.0, 4.6, -24, 10],
      [142, -1.8, 0, -13.0, 7.0, -36, 24],
      [176, -1.9, 0, -13.2, 6.8, -38, 29],
      [194, -2.9, 0.3, -13.1, 5.6, -34, 30],
      [207, -3.4, 1.2, -13.0, 2.6, -18, 31],
    ];
    const cv = [0, 0, 0, 0, 0, 0];
    const tgt = V(0, 0, 0);
    const FWD = V(0, 0, -1);
    function cameraAt(G: number) {
      splineKeys(CAM, G, cv);
      tgt.set(cv[0], cv[1], cv[2]);
      camera.rotation.set(THREE.MathUtils.degToRad(cv[4]), THREE.MathUtils.degToRad(cv[5]), 0, "YXZ");
      const fwd = FWD.set(0, 0, -1).applyEuler(camera.rotation);
      camera.position.copy(tgt).addScaledVector(fwd, -cv[3]);
    }

    const head = V(0, 0, 0), tail = V(0, 0, 0), dir = V(0, 0, 0), side = V(0, 0, 0), toCam = V(0, 0, 0), tmp = V(0, 0, 0);

    return ({ frame }) => {
      const G = frame + G0;
      cameraAt(G);

      // title: "pain" completes, then the whole title dissolves as it lies down
      const painIn = 0.25 + 0.75 * easeOutCubic(seg(G, 60, 72));
      const gone = seg(G, 104, 114);
      wA.set(1 - gone, gone);
      wPain.set(painIn * (1 - gone), Math.max(1 - seg(G, 60, 70), gone));

      // the light
      lightPos(G, head);
      lightPos(G - 2.2, tail);
      dot.position.copy(head);
      halo.position.copy(head);
      halo.quaternion.copy(camera.quaternion);
      const moving = head.distanceTo(tail);
      const hitT = seg(G, 186, 188);
      const visible = G < 188;
      dot.visible = visible;
      halo.visible = visible && G >= 104;
      dot.scale.setScalar(1 - hitT);
      // flat on the title while it is the i's dot, a sphere once it lifts
      const lift = seg(G, 104, 112);
      dot.scale.y *= THREE.MathUtils.lerp(0.3, 1, lift);

      if (visible && moving > 0.05) {
        dir.copy(head).sub(tail).normalize();
        const len = Math.min(moving * 4.2, G < 124 ? 3.2 : 9);
        tail.copy(head).addScaledVector(dir, -len);
        toCam.copy(camera.position).sub(head).normalize();
        side.crossVectors(dir, toCam).normalize().multiplyScalar(0.3);
        const set = (i: number, p: THREE.Vector3) => { sPos[i * 3] = p.x; sPos[i * 3 + 1] = p.y; sPos[i * 3 + 2] = p.z; };
        set(0, tmp.copy(tail).sub(side)); set(1, tmp.copy(head).addScaledVector(dir, 0.15).sub(side));
        set(2, tmp.copy(head).addScaledVector(dir, 0.15).add(side)); set(3, tmp.copy(tail).add(side));
        streakGeo.attributes.position.needsUpdate = true;
        streak.visible = true;
      } else streak.visible = false;

      // red tile drops in where the first run turns, settling with a soft spin
      const tIn = seg(G, 136, 148);
      const pop = easeOutCubic(tIn) * (1 + 0.1 * Math.sin(tIn * Math.PI));
      tile.rotation.y = Math.PI / 4 + 0.47 + (1 - easeOutCubic(tIn)) * 0.9;
      tile.position.y = 0.12 + (1 - easeOutCubic(tIn)) * 0.8;

      // strike: the tile turns blurple and folds into the puck (morph, no swap)
      const m = easeOutCubic(seg(G, 185, 193));
      tileMat.color.copy(red).lerp(blurple, seg(G, 183, 188));
      tile.visible = G >= 136 && m < 1;
      tile.scale.set(Math.max(0.001, pop * (1 - m)), Math.max(0.001, pop * (1 - m)), Math.max(0.001, pop * (1 - m)));
      puck.visible = G >= 186;
      const p0 = easeOutCubic(seg(G, 186, 194));
      const grow = easeInCubic(seg(G, 195, 207));
      puck.scale.set(0.4 + p0 * 0.6, 0.06 + p0 * 0.14 + grow * 9, 0.4 + p0 * 0.6);
      const r = seg(G, 187, 199);
      ripple.scale.setScalar(0.8 + 2.4 * easeOutCubic(r));
      (ripple.material as THREE.MeshBasicMaterial).opacity = r > 0 && r < 1 ? (1 - r) * 0.25 : 0;
    };
  });
}
