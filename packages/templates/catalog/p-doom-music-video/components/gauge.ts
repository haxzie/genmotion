import * as THREE from "three";
import { C } from "./brand";
import { numberDisplay } from "./hud";
import { label } from "./text";

/**
 * The p(doom) dial as a 3D object: a 270° neon arc that fills clockwise,
 * 30 tick blocks that light up, a needle, and the number in the middle.
 * Radius r in world units.
 */
export function createGauge(name = "pdoom-dial", r = 3) {
  const group = new THREE.Group();
  group.name = name;

  const SEG = 180;
  const arcGeo = new THREE.RingGeometry(r - 0.16, r + 0.16, SEG, 1, -Math.PI / 4, Math.PI * 1.5);
  const track = new THREE.Mesh(arcGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  track.name = `${name}-track`;
  track.scale.x = -1;
  const fillMat = new THREE.MeshBasicMaterial({ color: C.pink, side: THREE.DoubleSide, transparent: true });
  const fill = new THREE.Mesh(arcGeo.clone(), fillMat);
  fill.name = `${name}-fill`;
  fill.scale.x = -1;
  fill.position.z = 0.01;
  const glowMat = new THREE.MeshBasicMaterial({ color: C.pink, side: THREE.DoubleSide, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
  const glowArc = new THREE.Mesh(new THREE.RingGeometry(r - 0.5, r + 0.5, SEG, 1, -Math.PI / 4, Math.PI * 1.5), glowMat);
  glowArc.name = `${name}-glow`;
  glowArc.scale.x = -1;
  // a dark face so the number always reads, whatever is behind the dial
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 64), new THREE.MeshBasicMaterial({ color: "#0b0520" }));
  face.name = `${name}-face`;
  face.position.z = -0.02;
  group.add(face, track, glowArc, fill);

  // ticks
  const N = 30;
  const tickGeo = new THREE.BoxGeometry(0.1, 0.42, 0.18);
  const ticks: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(tickGeo, new THREE.MeshStandardMaterial({ color: "#2a2250", emissive: "#000000", roughness: 0.4 }));
    const a = Math.PI * 1.25 - (i / (N - 1)) * Math.PI * 1.5; // clockwise from bottom-left
    m.position.set(Math.cos(a) * (r + 0.55), Math.sin(a) * (r + 0.55), 0);
    m.rotation.z = a - Math.PI / 2;
    m.name = `${name}-tick-${i}`;
    group.add(m);
    ticks.push(m);
  }

  const needle = new THREE.Group();
  needle.name = `${name}-needle`;
  const nm = new THREE.Mesh(new THREE.BoxGeometry(0.1, r * 0.42, 0.08), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  nm.name = `${name}-needle-bar`;
  nm.position.y = r * 0.68;
  needle.add(nm);
  needle.position.z = 0.05;
  group.add(needle);

  // type is drawn in px and scaled to the dial
  const u = r / 300;
  const num = numberDisplay(150, 5, "#ffffff", `${name}-value`);
  num.group.scale.setScalar(u);
  num.group.position.set(r * 0.5, r * 0.02, 0.1);
  const cap = label("p(doom)", { size: 56, weight: 500, color: C.text, ss: 3 });
  cap.name = `${name}-label`;
  cap.scale.setScalar(u);
  cap.position.set(0, -r * 0.62, 0.1);
  group.add(num.group, cap);

  const pink = new THREE.Color(C.pink);
  const red = new THREE.Color("#ff2d4a");
  const col = new THREE.Color();
  const dim = new THREE.Color("#000000");
  const white = new THREE.Color("#ffffff");
  const tmp = new THREE.Color();

  const update = (value: number, pulse = 0, opacity = 1) => {
    group.visible = opacity > 0.001;
    const v = THREE.MathUtils.clamp(value / 100, 0, 1);
    fill.geometry.setDrawRange(0, Math.floor(v * SEG) * 6);
    glowArc.geometry.setDrawRange(0, Math.floor(v * SEG) * 6);
    const danger = THREE.MathUtils.smoothstep(value, 50, 95);
    col.copy(pink).lerp(red, danger);
    fillMat.color.copy(col);
    glowMat.color.copy(col);
    glowMat.opacity = (0.25 + 0.35 * pulse) * opacity;
    fillMat.opacity = opacity;
    (track.material as THREE.MeshBasicMaterial).opacity = 0.12 * opacity;
    const lit = Math.round(v * (N - 1));
    ticks.forEach((m, i) => {
      m.material.emissive.copy(i <= lit ? col : dim);
      m.material.emissiveIntensity = i <= lit ? 1.2 + pulse : 0;
    });
    needle.rotation.z = Math.PI * 0.75 - v * Math.PI * 1.5;
    num.setOpacity(opacity);
    num.setText(value >= 99.5 ? value.toFixed(1) + "%" : Math.round(value) + "%");
    num.setColor(tmp.copy(col).lerp(white, 0.55 - danger * 0.3));
    cap.material.opacity = opacity;
    face.visible = opacity > 0.4;
  };
  update(0);
  return { group, update };
}
