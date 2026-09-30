import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { beatPos, beatPulse, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter } from "../components/hud";
import { burst, impactFrame, kick, stars, V } from "../components/motion";

/** 1:29–1:35 · "Gato, please don't let me go": a robot cat on a tether of light drifts away; the tether snaps on "go". */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.gato, { bg: "#140a30", fog: [30, 160] });
  const { root, put } = w;
  const S = SCENE_START.gato / 30;
  const END = SCENE_START.paperclips / 30;
  const GO = 94.38;

  const sky = stars(2000, V(300, 200, 400), 71, 0.6, ["#ffffff", "#ffd6f0", C.cyan, "#c9b8ff"]);
  sky.points.position.z = -120;
  put(root, sky.points, 0);

  /* ---------- the cat, from primitives ---------- */
  const white = new THREE.MeshStandardMaterial({ color: "#f6f2ff", roughness: 0.35, metalness: 0.1, flatShading: true });
  const lilac = new THREE.MeshStandardMaterial({ color: "#b89cff", roughness: 0.4, flatShading: true });
  const pinkM = new THREE.MeshStandardMaterial({ color: "#ff8fc7", roughness: 0.5, emissive: "#ff5aa9", emissiveIntensity: 0.3 });
  const glowM = new THREE.MeshBasicMaterial({ color: C.cyan });
  const visorM = new THREE.MeshStandardMaterial({ color: "#1a1030", roughness: 0.1, metalness: 0.6 });
  const cat = new THREE.Group();
  cat.name = "gato";
  put(root, cat, 2);
  const bodyM = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 16), white);
  bodyM.scale.set(1, 1.05, 0.95);
  bodyM.position.y = -1.7;
  bodyM.name = "gato-body";
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), glowM);
  heart.position.set(0, -1.4, 1.16);
  heart.name = "gato-heart-light";
  const headG = new THREE.Group();
  headG.name = "gato-head";
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), white);
  head.scale.set(1.15, 0.95, 1);
  head.name = "gato-skull";
  const visor = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.2, 8, 16), visorM);
  visor.rotation.z = Math.PI / 2;
  visor.scale.set(1, 1, 0.5);
  visor.position.set(0, 0.1, 1.2);
  visor.name = "gato-visor";
  const eyeGeo = new THREE.SphereGeometry(0.3, 16, 12);
  const eyeL = new THREE.Mesh(eyeGeo, glowM);
  const eyeR = new THREE.Mesh(eyeGeo, glowM);
  eyeL.position.set(-0.55, 0.12, 1.42);
  eyeR.position.set(0.55, 0.12, 1.42);
  eyeL.name = "gato-eye-left";
  eyeR.name = "gato-eye-right";
  const earGeo = new THREE.ConeGeometry(0.55, 1.1, 4);
  const earL = new THREE.Mesh(earGeo, lilac);
  const earR = new THREE.Mesh(earGeo, lilac);
  earL.position.set(-0.95, 1.25, 0);
  earR.position.set(0.95, 1.25, 0);
  earL.rotation.z = 0.35;
  earR.rotation.z = -0.35;
  earL.name = "gato-ear-left";
  earR.name = "gato-ear-right";
  const cheekGeo = new THREE.CircleGeometry(0.22, 20);
  const cheekL = new THREE.Mesh(cheekGeo, pinkM);
  const cheekR = new THREE.Mesh(cheekGeo, pinkM);
  cheekL.position.set(-1.05, -0.45, 1.2);
  cheekR.position.set(1.05, -0.45, 1.2);
  cheekL.rotation.y = -0.5;
  cheekR.rotation.y = 0.5;
  cheekL.name = "gato-cheek-left";
  cheekR.name = "gato-cheek-right";
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), lilac);
  antenna.position.set(0, 1.6, 0);
  antenna.name = "gato-antenna";
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), pinkM);
  bulb.position.set(0, 2.05, 0);
  bulb.name = "gato-antenna-bulb";
  headG.add(head, visor, eyeL, eyeR, earL, earR, cheekL, cheekR, antenna, bulb);
  const pawGeo = new THREE.SphereGeometry(0.42, 12, 10);
  const pawL = new THREE.Mesh(pawGeo, white);
  const pawR = new THREE.Mesh(pawGeo, white);
  pawL.position.set(-0.9, -2.7, 0.5);
  pawR.position.set(1.0, -1.5, 0.9);
  pawL.name = "gato-paw-left";
  pawR.name = "gato-paw-right";
  const tailSegs = Array.from({ length: 9 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22 - i * 0.012, 10, 8), i === 8 ? pinkM : lilac);
    m.name = `gato-tail-${i}`;
    cat.add(m);
    return m;
  });
  cat.add(bodyM, heart, headG, pawL, pawR);
  const catLight = new THREE.PointLight("#ffd6f0", 60, 30, 1.5);
  catLight.position.set(2, 3, 6);
  put(root, catLight, 2);

  /* ---------- the tether ---------- */
  const TSEG = 16;
  const tetherMat = new THREE.MeshBasicMaterial({ color: "#ffd6f0" });
  const tGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
  tGeo.rotateX(Math.PI / 2);
  const tether = Array.from({ length: TSEG }, (_, i) => {
    const m = new THREE.Mesh(tGeo, tetherMat);
    m.name = `tether-${i}`;
    put(root, m, 3);
    return m;
  });
  const tetherGlow = Array.from({ length: 5 }, (_, i) => {
    const s = w.glow("#ff8fc7", 2, `tether-glow-${i}`);
    put(root, s, 3);
    return s;
  });
  const snap = burst(260, 17, ["#ffffff", "#ff8fc7", C.pink, C.cyan], 0.35, 14, 1.4, "tether-snap");
  put(root, snap.points, 4);
  const hearts = burst(80, 27, ["#ff5aa9", "#ff8fc7"], 0.9, 8, 1.8, "heart-sparks");
  put(root, hearts.points, 4);

  const lyrics = createLyrics(w, S, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const camPos = V();
  const look = V();
  const anchor = V();
  const paw = V();
  const a = V();
  const b = V();
  const ctrl = V();
  const tan = Math.tan(THREE.MathUtils.degToRad(25));

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const bpos = beatPos(t);
    sky.update(t, 1, bp * 0.3);

    // the cat drifts away from "please", faster after the snap
    const away = interpolate(t, [90.7, GO], [0, 1], Easing.easeInOut);
    const lost = interpolate(t, [GO, END], [0, 1], Easing.easeIn);
    const dist = 10 + away * 22 + lost * 40;
    cat.position.set(Math.sin(t * 0.8) * 0.6 + lost * 6, Math.sin(t * 1.3) * 0.4 + 0.5 + lost * 4, -dist + 10);
    cat.rotation.set(Math.sin(t * 0.9) * 0.1, Math.sin(t * 0.6) * 0.3 + lost * 2, Math.sin(bpos * Math.PI * 0.5) * 0.12 + lost);
    const squash = Math.exp(-(bpos - Math.floor(bpos)) * 6);
    cat.scale.set(1 + squash * 0.04, 1 - squash * 0.05, 1);
    headG.rotation.set(Math.sin(t * 1.4) * 0.12, 0, Math.sin(bpos * Math.PI) * 0.15);
    earL.rotation.z = 0.35 + Math.max(0, Math.sin(t * 9)) * 0.2 * (t > 92.5 ? 1 : 0);
    // sad eyes: they shrink to slits as the tether pulls taut, blink on "Gato"
    const sad = interpolate(t, [92.5, GO], [0, 1]);
    const blink = t > 89.9 && t < 90.1 ? 0.1 : 1;
    eyeL.scale.set(1, (1 - sad * 0.6) * blink * (1 + bp * 0.1), 1);
    eyeR.scale.copy(eyeL.scale);
    glowM.color.set(sad > 0.5 ? "#9fd8ff" : C.cyan);
    heart.scale.setScalar(1 + bp * 0.6);
    bulb.scale.setScalar(1 + bp * 0.5);
    tailSegs.forEach((m, i) => {
      const u = i / 8;
      m.position.set(1.1 + u * 1.6, -2.4 + Math.sin(t * 3 - u * 3) * 0.5 * u + u * 1.2, -0.6 - u * 0.3);
    });
    catLight.position.copy(cat.position).add(V(2, 3, 6));

    // tether: from just under the lens to her paw, sagging, then taut, then snapped
    cat.updateMatrixWorld();
    paw.copy(pawR.position).applyMatrix4(cat.matrixWorld);
    anchor.set(2.2, -2.6, 13.2);
    const taut = interpolate(t, [92.5, GO], [0, 1]);
    ctrl.lerpVectors(anchor, paw, 0.5);
    ctrl.y -= (1 - taut) * 2.5 + Math.sin(t * 2) * 0.3 * (1 - taut);
    const broken = t >= GO;
    const recoil = broken ? interpolate(t, [GO, GO + 0.5], [0, 1], Easing.easeOut) : 0;
    tether.forEach((m, i) => {
      const u0 = i / TSEG;
      const u1 = (i + 1) / TSEG;
      const bez = (u: number, out: THREE.Vector3) => {
        const k = 1 - u;
        return out.set(k * k * anchor.x + 2 * k * u * ctrl.x + u * u * paw.x, k * k * anchor.y + 2 * k * u * ctrl.y + u * u * paw.y, k * k * anchor.z + 2 * k * u * ctrl.z + u * u * paw.z);
      };
      bez(u0, a);
      bez(u1, b);
      // after the snap each half whips back toward its end
      if (broken) {
        const half = u0 < 0.5;
        const end = half ? anchor : paw;
        a.lerp(end, recoil * (half ? u0 * 2 : (1 - u0) * 2));
        b.lerp(end, recoil * (half ? u1 * 2 : (1 - u1) * 2));
      }
      m.position.lerpVectors(a, b, 0.5);
      m.lookAt(b);
      const th = 0.05 * (1 - taut * 0.5) * (1 + bp * 0.3);
      m.scale.set(th, th, a.distanceTo(b) + 0.02);
      m.visible = !broken || recoil < 0.98;
    });
    tetherMat.color.set(taut > 0.8 && Math.floor(t * 16) % 2 === 0 ? "#ffffff" : "#ffd6f0");
    tetherGlow.forEach((s, i) => {
      const u = (i + 0.5) / 5;
      const k = 1 - u;
      s.position.set(k * k * anchor.x + 2 * k * u * ctrl.x + u * u * paw.x, k * k * anchor.y + 2 * k * u * ctrl.y + u * u * paw.y, k * k * anchor.z + 2 * k * u * ctrl.z + u * u * paw.z);
      s.material.opacity = broken ? 0 : 0.4 + bp * 0.4;
    });
    snap.points.position.lerpVectors(anchor, paw, 0.5);
    snap.fire(t, [GO]);
    hearts.points.position.copy(cat.position);
    hearts.fire(t, [89.36, 90.7]);

    // dolly zoom: the fov narrows to hold her size while the world stretches behind
    const camZ = 14;
    const d = camZ - cat.position.z;
    const dEff = 14 + (d - 14) * 0.45;
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan((tan * 14) / dEff)) * (1 + lost * 0.8) - bp * 1.2;
    camPos.set(Math.sin(t * 0.4) * 1.5, 1 + Math.sin(t * 0.6) * 0.3, camZ);
    look.copy(cat.position).add(V(0, -0.5, 0));
    w.shot(t, camPos, look, {
      fov: Math.min(80, fov),
      roll: Math.sin(t * 0.7) * 0.04,
      shake: kick(t, [GO], 5) * 0.4 + taut * 0.04,
    });
    w.post({
      flash: interpolate(t, [S, S + 0.2], [1, 0]) + kick(t, [GO], 8) * 0.5 + interpolate(t, [END - 0.15, END], [0, 1]),
      invert: impactFrame(t, [GO], 2),
    });
    meter.update(t, 1);
    lyrics.update(t);
  };
}
