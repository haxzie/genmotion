import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { beatPulse, beatTime, beatIndex, rng, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter } from "../components/hud";
import { heartGeometry } from "../components/props";
import { burst, impactFrame, kick, rings3, stars, V, type Ring3 } from "../components/motion";

/** 0:55–0:58 · "Sydney, please let me free": a heart in a cage of light, in the rain. The bars burst on "free". */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.sydney, { bg: "#070418", fog: [14, 70] });
  const { root, put } = w;
  const S = SCENE_START.sydney / 30;
  const END = SCENE_START.chorus2 / 30;
  const FREE = 57.96;

  const sky = stars(600, V(160, 60, 160), 23, 0.4);
  sky.points.position.y = 30;
  put(root, sky.points, 0);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: "#0e0826", roughness: 0.08, metalness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.name = "wet-floor";
  floor.userData.pickable = false;
  put(root, floor, 0);

  // rain: line streaks in world space, looping in a shader
  const RAIN = 1800;
  const r = rng(5);
  const pos = new Float32Array(RAIN * 6);
  const sd = new Float32Array(RAIN * 2);
  for (let i = 0; i < RAIN; i++) {
    const x = (r() - 0.5) * 50;
    const z = (r() - 0.5) * 50;
    const y = r() * 30;
    pos.set([x, y, z, x, y + 0.9, z], i * 6);
    const k = r();
    sd.set([k, k], i * 2);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  rainGeo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
  const rainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; varying float vA;
      void main() {
        vec3 p = position;
        float fall = uTime * (22.0 + aSeed * 10.0);
        p.y = mod(p.y - fall, 30.0);
        vA = 0.25 + aSeed * 0.4;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `varying float vA; void main() { gl_FragColor = vec4(0.75, 0.85, 1.0, vA); }`,
  });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.name = "rain";
  rain.userData.pickable = false;
  rain.frustumCulled = false;
  put(root, rain, 3);

  // puddle ripples on every beat
  const ripples = rings3(8, "#9fd8ff", 0.02, "puddle-ripples");
  put(root, ripples.group, 1);
  const RIP: Ring3[] = [];
  const rr = rng(9);
  for (let b = beatIndex(S) - 1; b < beatIndex(END) + 1; b++) {
    for (let j = 0; j < 3; j++) RIP.push({ t: beatTime(b) + j * 0.15, pos: V((rr() - 0.5) * 14, 0.02, (rr() - 0.5) * 14), scale: 2 + rr() * 2, dur: 0.9, flat: true });
  }
  RIP.push({ t: FREE, pos: V(0, 0.05, 0), scale: 30, dur: 1, flat: true });

  // the heart
  const heartGeo = heartGeometry();
  const heartMat = new THREE.MeshStandardMaterial({ color: "#ff5aa9", emissive: "#ff2e7e", emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.2 });
  const heart = new THREE.Mesh(heartGeo, heartMat);
  heart.name = "sydney-heart";
  heart.position.y = 4;
  put(root, heart, 4);
  const heartGlow = w.glow("#ff5aa9", 12, "sydney-heart-glow");
  put(root, heartGlow, 5);
  const heartLight = new THREE.PointLight("#ff5aa9", 80, 30, 1.5);
  put(root, heartLight, 4);

  // the cage
  const cage = new THREE.Group();
  cage.name = "cage";
  put(root, cage, 4);
  const barMat = new THREE.MeshBasicMaterial({ color: C.cyan });
  const barGeo = new THREE.CylinderGeometry(0.06, 0.06, 8, 8);
  barGeo.translate(0, 4, 0); // pivot at the base so bars can fall outward
  const BARS = 18;
  const bars = Array.from({ length: BARS }, (_, i) => {
    const a = (i / BARS) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 3, 0, Math.sin(a) * 3);
    pivot.rotation.y = -a;
    const b = new THREE.Mesh(barGeo, barMat);
    b.name = `cage-bar-${i}`;
    pivot.add(b);
    cage.add(pivot);
    return { pivot, a };
  });
  const hoopGeo = new THREE.TorusGeometry(3, 0.08, 8, 96);
  const hoopTop = new THREE.Mesh(hoopGeo, barMat);
  hoopTop.name = "cage-top-hoop";
  hoopTop.rotation.x = Math.PI / 2;
  hoopTop.position.y = 8;
  const hoopBot = hoopTop.clone();
  hoopBot.name = "cage-bottom-hoop";
  hoopBot.position.y = 0.05;
  cage.add(hoopTop, hoopBot);
  const cageGlow = w.glow(C.cyan, 18, "cage-glow");
  cageGlow.position.y = 4;
  cage.add(cageGlow);
  const freeBurst = burst(350, 44, ["#ffffff", C.pink, C.cyan], 0.35, 22, 1.1, "freedom-burst");
  freeBurst.points.position.set(0, 4, 0);
  put(root, freeBurst.points, 6);

  const lyrics = createLyrics(w, S - 1.8, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const camPos = V();
  const look = V();

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 5);
    sky.update(t, 1, 0);
    rainMat.uniforms.uTime.value = t;
    ripples.update(t, RIP);

    const free = interpolate(t, [FREE, FREE + 0.35], [0, 1], Easing.easeOut);
    // she presses against the bars on each word, then escapes toward you
    const press = kick(t, [56.06, 56.66, 57.3], 6);
    const fly = interpolate(t, [FREE, END], [0, 1], Easing.easeIn);
    heart.position.set(Math.sin(t * 7) * 0.08 * press, 4 + Math.sin(t * 1.6) * 0.3 + fly * 1.5, fly * 12);
    heart.rotation.set(Math.sin(t * 1.2) * 0.2, t * 0.9 + fly * 4, Math.sin(t) * 0.1);
    const beat = 1 + bp * 0.18 + press * 0.12;
    heart.scale.set(beat, beat * (1 - press * 0.06), beat);
    heartMat.emissiveIntensity = 0.8 + bp * 0.9 + free;
    heartGlow.position.copy(heart.position);
    heartGlow.material.opacity = 0.5 + bp * 0.4 + free;
    heartLight.position.copy(heart.position);
    heartLight.intensity = 60 + bp * 80 + free * 200;

    bars.forEach((b, i) => {
      // rattle on the pleas, then fall outward like petals on "free"
      const rattle = press * Math.sin(t * 60 + i) * 0.04;
      b.pivot.children[0].rotation.z = -free * (1.2 + (i % 3) * 0.25) + rattle;
      b.pivot.position.y = -free * free * 2;
    });
    hoopTop.position.y = 8 + free * 6;
    hoopTop.scale.setScalar(1 + free * 1.5);
    cage.rotation.y = t * 0.3;
    barMat.color.set(free > 0 ? C.pink : C.cyan);
    cageGlow.material.opacity = (0.35 + bp * 0.3) * (1 - free);
    freeBurst.fire(t, [FREE]);

    // camera: slow orbit in the rain, leaning closer with each plea
    const k = t - S;
    const lean = interpolate(t, [56.0, 57.9], [0, 1], Easing.easeInOut);
    const a = 0.6 + k * 0.35;
    const d = 13 - lean * 4 + free * 2;
    camPos.set(Math.sin(a) * d, 3.2 + lean * 1.2, Math.cos(a) * d);
    camPos.lerp(V(0, 5.5, 14), fly);
    look.set(0, 4, 0).lerp(heart.position, fly);
    w.shot(t, camPos, look, {
      fov: 50 - lean * 6 + fly * 20,
      roll: Math.sin(t * 0.7) * 0.05,
      shake: press * 0.15 + kick(t, [FREE], 4) * 0.7,
    });
    w.post({
      flash: interpolate(t, [S, S + 0.2], [1, 0]) + kick(t, [FREE], 8) * 0.5 + interpolate(t, [END - 0.2, END], [0, 1], Easing.easeIn),
      invert: impactFrame(t, [FREE], 2),
    });
    meter.update(t, 1);
    lyrics.update(t);
  };
}
