/**
 * 04 — LightScore. Opens on 03's turning rays, which collapse into the tick
 * arc of a score gauge; the score slot-rolls to 812 while the factors that
 * built it pop in around it with their own counters (the reference's credit
 * gauge). Then the gauge steps back, a credit-line card rises, unlocks and
 * turns lime — and expands to flood the frame for the outro.
 */
import * as THREE from "three";
import { interpolate, Easing, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { BRAND, FONT } from "../components/brand";
import { CAM_Z, canvasTexture, label, measure, roller, u } from "../components/text";
import { enter, leave, glide, pop, lerp, RAY_SPIN, RAY_START } from "../components/motion";
import { drawBolt, glow, roundedPlane, studio, sunburst } from "../components/props";

const RING_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const RING_FRAG = /* glsl */ `
uniform float progress;
uniform float opacity;
uniform vec3 color;
varying vec2 vUv;
void main() {
  vec2 d = vUv - 0.5;
  float r = length(d) * 2.0;
  float a = atan(d.x, d.y);
  float ang = (a < 0.0 ? a + 6.2831853 : a) / 6.2831853;
  float ring = smoothstep(0.80, 0.83, r) * (1.0 - smoothstep(0.95, 0.98, r));
  vec3 col = mix(vec3(0.8, 0.8, 0.78), color, step(ang, progress));
  gl_FragColor = vec4(col, ring * opacity);
  #include <colorspace_fragment>
}
`;

type Icon = "check" | "card" | "coin" | "up";

function iconTexture(bg: string, icon: Icon) {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = bg;
    g.beginPath();
    g.arc(128, 128, 96, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = BRAND.ink;
    g.fillStyle = BRAND.ink;
    g.lineWidth = 14;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    if (icon === "check") {
      g.moveTo(88, 132);
      g.lineTo(116, 160);
      g.lineTo(170, 100);
      g.stroke();
    } else if (icon === "card") {
      g.roundRect(78, 94, 100, 70, 12);
      g.stroke();
      g.beginPath();
      g.moveTo(80, 118);
      g.lineTo(176, 118);
      g.stroke();
    } else if (icon === "coin") {
      g.font = `600 96px ${FONT}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("$", 128, 134);
    } else {
      g.moveTo(90, 162);
      g.lineTo(166, 94);
      g.moveTo(118, 92);
      g.lineTo(168, 92);
      g.lineTo(168, 142);
      g.stroke();
    }
  });
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, renderer, width, height, durationInFrames: D } = ctx;
  scene.background = new THREE.Color(BRAND.paper);
  studio(renderer, scene);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);
  const halfH = u(540);
  const halfW = halfH * (width / height);

  /* Handoff in: the same rays 03 cut on. */
  const rays = sunburst(30);
  rays.name = "sunburst";
  rays.position.z = -4;
  const core = glow(9, "#ffffff", 1);
  core.name = "core-glow";
  core.position.z = -3.5;
  scene.add(rays, core);

  /* ---------------------------------------------------------------- gauge */
  const gauge = new THREE.Group();
  gauge.name = "score-gauge";
  scene.add(gauge);
  const G = new THREE.Vector3(0, -1.15, 0);

  const halo = glow(8.5, BRAND.limeBright, 0.8);
  halo.name = "gauge-glow";
  halo.position.set(0, -0.4, -0.5);
  gauge.add(halo);

  const TICKS = 64;
  const R0 = 2.4;
  const R1 = 3.3;
  const A0 = THREE.MathUtils.degToRad(205);
  const A1 = THREE.MathUtils.degToRad(-25);
  const tickGeo = new THREE.PlaneGeometry(0.055, R1 - R0);
  tickGeo.translate(0, (R0 + R1) / 2, 0);
  const onMat = new THREE.MeshBasicMaterial({ color: "#b3e000", transparent: true });
  const offMat = new THREE.MeshBasicMaterial({ color: "#dcddd7", transparent: true });
  const ticks: THREE.Mesh[] = [];
  const ticksGroup = new THREE.Group();
  ticksGroup.name = "gauge-ticks";
  for (let i = 0; i < TICKS; i++) {
    const a = lerp(A0, A1, i / (TICKS - 1));
    const t = new THREE.Mesh(tickGeo, offMat);
    t.rotation.z = a - Math.PI / 2;
    t.name = `gauge-tick-${i + 1}`;
    ticks.push(t);
    ticksGroup.add(t);
  }
  gauge.add(ticksGroup);

  const score = roller("###", { size: 180, weight: 500, tracking: -0.03, color: BRAND.ink });
  score.group.name = "score";
  score.group.traverse((o) => { if (o !== score.group) o.name = `score-${o.name}`; });
  score.group.position.set(0, 0.1, 0.1);
  gauge.add(score.group);

  const eyebrow = label("LIGHTSCORE", { size: 26, weight: 600, tracking: 0.22, color: BRAND.ink });
  eyebrow.name = "eyebrow-lightscore";
  eyebrow.position.set(0, 1.55, 0.1);
  gauge.add(eyebrow);

  const badge = new THREE.Group();
  badge.name = "badge-excellent";
  const badgeBg = new THREE.Mesh(roundedPlane(2.3, 0.62, 0.31), new THREE.MeshBasicMaterial({ color: BRAND.lime, transparent: true }));
  badgeBg.name = "badge-excellent-bg";
  const badgeText = label("Excellent", { size: 34, weight: 500, color: BRAND.ink });
  badgeText.name = "badge-excellent-text";
  badgeText.position.z = 0.01;
  badge.add(badgeBg, badgeText);
  badge.position.set(0, -1.35, 0.1);
  gauge.add(badge);

  /* ---------------------------------------------------------------- chips */
  const chipSpecs = [
    { name: "factor-on-time-bills", title: "On-time bills", plus: "32", bg: BRAND.lime, icon: "check" as Icon, color: "#9ccc00", x: -6.0, y: 1.55 },
    { name: "factor-card-spending", title: "Card spending", plus: "18", bg: "#cdd5ff", icon: "card" as Icon, color: "#5a66ff", x: -6.35, y: -1.6 },
    { name: "factor-savings-held", title: "Savings held", plus: "27", bg: "#ffd8bd", icon: "coin" as Icon, color: "#ff8a4c", x: 6.0, y: 1.55 },
    { name: "factor-steady-income", title: "Steady income", plus: "21", bg: "#f0dcff", icon: "up" as Icon, color: "#b36bff", x: 6.35, y: -1.6 },
  ];
  const chips = chipSpecs.map((c, i) => {
    const group = new THREE.Group();
    group.name = c.name;
    const icon = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.86),
      new THREE.MeshBasicMaterial({ map: iconTexture(c.bg, c.icon), transparent: true, depthWrite: false }),
    );
    icon.name = `${c.name}-icon`;
    icon.position.y = 0.55;
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: RING_VERT,
      fragmentShader: RING_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { progress: { value: 0 }, opacity: { value: 1 }, color: { value: new THREE.Color(c.color) } },
    });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), ringMat);
    ring.name = `${c.name}-ring`;
    ring.position.set(0, 0.55, -0.01);
    const title = label(c.title, { size: 38, weight: 500, color: BRAND.ink });
    title.name = `${c.name}-title`;
    title.position.y = -0.38;
    const plus = roller("+##", { size: 30, weight: 600, color: BRAND.muted });
    plus.group.name = `${c.name}-points`;
    plus.group.traverse((o) => { if (o !== plus.group) o.name = `${c.name}-points-${o.name}`; });
    plus.group.position.set(0.82, 1.05, 0);
    group.add(ring, icon, title, plus.group);
    group.position.set(c.x, c.y, 0.2);
    scene.add(group);
    return { group, ringMat, plus, c, at: 22 + i * 3, mats: [icon.material, title.material] as THREE.MeshBasicMaterial[] };
  });

  /* ----------------------------------------------------------- credit card */
  const CWd = 7.6;
  const CHt = 1.8;
  const card = new THREE.Group();
  card.name = "credit-line-card";
  const cardGeo = roundedPlane(CWd, CHt, 0.42);
  const cardMat = new THREE.MeshBasicMaterial({ color: "#ecede8" });
  const cardFace = new THREE.Mesh(cardGeo, cardMat);
  cardFace.name = "credit-line-card-surface";
  card.add(cardFace);
  const content = new THREE.Group();
  content.name = "credit-line-content";
  const leftX = -CWd / 2 + 0.5;
  const cTitle = label("Credit line", { size: 38, weight: 500, color: BRAND.ink });
  cTitle.name = "credit-line-title";
  cTitle.position.set(leftX + u(measure("Credit line", { size: 38, weight: 500 })) / 2, 0.42, 0.01);
  const cValue = label("$500 unlocked", { size: 60, weight: 500, tracking: -0.02, color: BRAND.ink });
  cValue.name = "credit-line-amount";
  cValue.position.set(leftX + u(measure("$500 unlocked", { size: 60, weight: 500, tracking: -0.02 })) / 2, -0.26, 0.01);
  const lockedNote = label("Locked", { size: 38, weight: 500, color: BRAND.muted });
  lockedNote.name = "credit-line-locked";
  lockedNote.position.set(leftX + u(measure("Locked", { size: 38, weight: 500 })) / 2, -0.26, 0.01);

  const lock = new THREE.Group();
  lock.name = "credit-line-lock";
  const inkMat = new THREE.MeshBasicMaterial({ color: BRAND.ink, transparent: true });
  const lockBody = new THREE.Mesh(roundedPlane(0.56, 0.44, 0.08), inkMat);
  lockBody.name = "credit-line-lock-body";
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 12, 32, Math.PI), inkMat);
  shackle.name = "credit-line-lock-shackle";
  const shackleLegs = new THREE.Group();
  shackleLegs.add(shackle);
  shackle.position.y = 0.26;
  const legGeo = new THREE.PlaneGeometry(0.09, 0.14);
  const legL = new THREE.Mesh(legGeo, inkMat);
  legL.position.set(-0.17, 0.2, 0);
  legL.name = "credit-line-lock-leg-left";
  const legR = new THREE.Mesh(legGeo, inkMat);
  legR.position.set(0.17, 0.2, 0);
  legR.name = "credit-line-lock-leg-right";
  shackleLegs.add(legL, legR);
  lock.add(lockBody, shackleLegs);
  lock.position.set(CWd / 2 - 0.9, -0.08, 0.01);

  const boltTex = canvasTexture(200, 200, (g) => drawBolt(g, 100, 100, 150, BRAND.ink));
  const bolt = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: boltTex, transparent: true }));
  bolt.name = "credit-line-bolt";
  bolt.position.set(CWd / 2 - 0.9, 0, 0.012);
  content.add(cTitle, cValue, lockedNote, lock, bolt);
  card.add(content);
  scene.add(card);
  const cardRest = new THREE.Vector3(0, -2.75, 0.6);
  const grey = new THREE.Color("#ecede8");
  const lime = new THREE.Color(BRAND.lime);
  const coverX = (halfW * 2 * 1.35) / CWd;
  const coverY = (halfH * 2 * 1.9) / CHt;

  return ({ frame, time }) => {
    /* Rays collapse into the gauge. */
    const collapse = interpolate(frame, [0, 18], [0, 1], Easing.easeInOut);
    rays.rotation.z = RAY_START + (120 + frame) * RAY_SPIN + collapse * 0.6;
    rays.scale.setScalar(lerp(1, 0.2, collapse));
    rays.material.opacity = 1 - collapse;
    core.material.opacity = 1 - collapse;
    rays.visible = collapse < 1;
    core.visible = collapse < 1;

    /* Gauge: ticks sweep on, fill follows the score. */
    const back = glide(frame, 90, 22);
    const out = leave(frame, 124, 8);
    gauge.position.set(G.x, lerp(G.y, 1.25, back), G.z);
    gauge.scale.setScalar(lerp(1, 0.8, back) * (1 - out * 0.1));
    const roll = interpolate(frame, [18, 62], [0, 1]);
    const fill = interpolate(frame, [18, 62], [0, 0.93], Easing.easeOut);
    ticks.forEach((t, i) => {
      const s = enter(frame, 4 + i * 0.28, 8);
      t.scale.set(1, Math.max(0.001, s), 1);
      t.material = i / (TICKS - 1) <= fill ? onMat : offMat;
      t.visible = s > 0;
    });
    onMat.opacity = offMat.opacity = 1 - out;
    halo.material.opacity = enter(frame, 14, 20) * (0.85 + Math.sin(time * 2) * 0.1) * (1 - out);
    halo.scale.setScalar(0.4 + fill * 0.7);

    score.roll("300", "812", roll, 1);
    const sIn = enter(frame, 12, 10);
    score.setOpacity(sIn * (1 - out));
    score.group.position.y = 0.1 - (1 - sIn) * u(50);
    eyebrow.material.opacity = enter(frame, 16, 10) * (1 - leave(frame, 88, 6));
    const bIn = pop(frame, 62, 12);
    const bOut = leave(frame, 88, 6);
    badge.scale.setScalar(Math.max(0.001, bIn * (1 - bOut)));
    badge.visible = frame >= 62 && bOut < 1;

    /* Factors pop in with their rings and counters, then clear. */
    for (const ch of chips) {
      const p = pop(frame, ch.at, 14);
      const cOut = leave(frame, 88 + (ch.at - 22) / 3, 7);
      ch.group.visible = frame >= ch.at && cOut < 1;
      ch.group.scale.setScalar(Math.max(0.001, p * (1 - cOut * 0.15)));
      ch.group.position.y = ch.c.y + Math.sin(time * 1.2 + ch.at) * 0.04 + cOut * 0.3;
      const o = Math.min(1, enter(frame, ch.at, 6)) * (1 - cOut);
      for (const m of ch.mats) m.opacity = o;
      ch.plus.setOpacity(o);
      ch.ringMat.uniforms.opacity!.value = o;
      const r = interpolate(frame, [ch.at + 4, ch.at + 36], [0, 1], Easing.easeOut);
      ch.ringMat.uniforms.progress!.value = r * (0.55 + Number(ch.c.plus) / 80);
      ch.plus.roll("00", ch.c.plus, r, 0);
    }

    /* Credit line: rises, unlocks, turns lime, floods the frame. */
    const rise = interpolate(frame, [96, 110], [0, 1], Easing.easeOut);
    const unlock = interpolate(frame, [112, 118], [0, 1], Easing.easeOut);
    const tint = interpolate(frame, [114, 121], [0, 1], Easing.easeOut);
    const flood = interpolate(frame, [134, D - 3], [0, 1], Easing.easeIn);
    card.visible = rise > 0;
    card.position.set(0, lerp(cardRest.y - 4, cardRest.y, rise) * (1 - flood), lerp(cardRest.z, 1.2, flood));
    card.scale.set(lerp(1, coverX, flood), lerp(1, coverY, flood), 1);
    cardMat.color.lerpColors(grey, lime, tint);
    shackleLegs.position.y = unlock * 0.14;
    shackleLegs.rotation.y = unlock * Math.PI * 0.9;
    const lockOut = leave(frame, 118, 5);
    lock.scale.setScalar(Math.max(0.001, 1 - lockOut));
    lock.visible = lockOut < 1;
    const boltIn = pop(frame, 120, 10);
    bolt.scale.setScalar(Math.max(0.001, boltIn));
    bolt.visible = frame >= 120;
    lockedNote.material.opacity = 1 - leave(frame, 114, 5);
    const vIn = enter(frame, 117, 9);
    cValue.material.opacity = vIn;
    cValue.position.y = -0.26 - (1 - vIn) * u(24);
    // Content clears just before the card goes full-frame.
    const cOut = leave(frame, 130, 5);
    cTitle.material.opacity = 1 - cOut;
    cValue.material.opacity *= 1 - cOut;
    bolt.material.opacity = 1 - cOut;
    content.visible = cOut < 1;
  };
}
