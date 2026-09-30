import * as THREE from "three";
import { createEye, type Eye } from "./eye";
import { stars } from "./motion";
import type { World } from "./world";

/**
 * The boss: a "biblically accurate" machine seraph. A colossal central eye,
 * three gold gyroscope rings (ophanim) studded with eyes that all watch you,
 * a corona of god-rays, and six wings of glowing feathers. Faces +z.
 */
export function createDeity(w: World, name = "deity") {
  const group = new THREE.Group();
  group.name = name;

  // corona: rotating god-rays behind everything
  const coronaMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uAmt: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uPulse, uAmt; varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float a = atan(p.y, p.x);
        float rays = pow(0.5 + 0.5 * sin(a * 24.0 + uTime * 0.6), 6.0) + pow(0.5 + 0.5 * sin(a * 11.0 - uTime * 0.35 + 1.3), 10.0) * 0.8;
        float fall = smoothstep(1.0, 0.12, r);
        float core = exp(-r * 5.0) * 1.6;
        vec3 gold = vec3(1.0, 0.78, 0.35);
        vec3 rose = vec3(1.0, 0.45, 0.7);
        vec3 col = mix(gold, rose, smoothstep(0.2, 0.9, r)) * (rays * fall * (0.55 + uPulse * 0.5) + core);
        gl_FragColor = vec4(col * uAmt, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), coronaMat);
  corona.position.z = -6;
  corona.name = `${name}-corona`;
  corona.userData.pickable = false;
  group.add(corona);

  const gold = new THREE.MeshStandardMaterial({ color: "#ffcf6d", metalness: 0.75, roughness: 0.22, emissive: "#b8741a", emissiveIntensity: 0.55 });
  const feather = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.15, emissive: "#8a5a1a", emissiveIntensity: 0.25, side: THREE.DoubleSide });
  const featherEdge = new THREE.MeshBasicMaterial({ color: "#ffcf6d", side: THREE.DoubleSide, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });

  // wings: three pairs, each a fan of feathers
  const featherShape = (L: number, W: number) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(W * 0.6, L * 0.15, W * 0.55, L * 0.7, 0.08 * W, L);
    s.bezierCurveTo(-W * 0.35, L * 0.72, -W * 0.5, L * 0.2, 0, 0);
    return s;
  };
  const wings: { pivot: THREE.Group; side: number; base: number; ph: number }[] = [];
  const PAIRS = [
    { y: 3.5, base: 0.5, len: 22, n: 13 },
    { y: 0, base: 0.0, len: 27, n: 15 },
    { y: -3.5, base: -0.5, len: 19, n: 12 },
  ];
  PAIRS.forEach((P, pi) => {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.name = `${name}-wing-${pi}-${side < 0 ? "left" : "right"}`;
      pivot.position.set(side * 6, P.y, -3 - pi * 0.5);
      for (let f = 0; f < P.n; f++) {
        const u = f / (P.n - 1);
        const L = P.len * (0.38 + 0.62 * Math.pow(u, 0.8));
        const geo = new THREE.ShapeGeometry(featherShape(L, 2.0 + u * 0.8), 10);
        // gold at the quill, blushing to rose (or ice-cyan on the middle pair) at the tip
        const fp = geo.attributes.position;
        const fc = new Float32Array(fp.count * 3);
        const cc = new THREE.Color();
        const tipC = new THREE.Color(pi === 1 ? "#8fe9ff" : "#ff9ad0");
        for (let v = 0; v < fp.count; v++) {
          const k = THREE.MathUtils.clamp(fp.getY(v) / L, 0, 1);
          cc.set("#fff3d8").lerp(tipC, Math.pow(k, 1.6) * 0.85);
          cc.multiplyScalar(0.8 + 0.2 * Math.abs(Math.sin(fp.getX(v) * 3)));
          fc.set([cc.r, cc.g, cc.b], v * 3);
        }
        geo.setAttribute("color", new THREE.BufferAttribute(fc, 3));
        const fm = new THREE.Mesh(geo, feather);
        fm.name = `${pivot.name}-feather-${f}`;
        const edge = new THREE.Mesh(geo, featherEdge);
        edge.scale.set(1.08, 1.02, 1);
        edge.position.z = -0.03;
        edge.name = `${pivot.name}-feather-${f}-glow`;
        const holder = new THREE.Group();
        // fan the feathers out from the shoulder: from pointing up-and-out to out-and-down
        // feathers ride along the wing's bone: short coverts near the body,
        // long primaries at the tip sweeping out and down
        holder.position.set(side * u * P.len * 0.42, Math.sin(u * Math.PI * 0.9) * P.len * 0.16 + u * P.len * 0.08, -u * 0.12);
        holder.rotation.z = side * (-2.55 + u * 1.25);
        holder.rotation.y = side * 0.15 * u;
        holder.add(edge, fm);
        pivot.add(holder);
      }
      group.add(pivot);
      wings.push({ pivot, side, base: P.base, ph: pi * 0.7 });
    }
  });

  // the ophanim: gyroscope rings covered in eyes
  const rings: { g: THREE.Group; eyes: Eye[]; axis: THREE.Vector3; speed: number }[] = [];
  [
    { r: 7.2, tube: 0.34, n: 8, axis: new THREE.Vector3(1, 0.2, 0), speed: 0.45 },
    { r: 9.4, tube: 0.3, n: 10, axis: new THREE.Vector3(0.1, 1, 0.3), speed: -0.35 },
    { r: 11.6, tube: 0.26, n: 12, axis: new THREE.Vector3(0.6, -0.3, 1), speed: 0.25 },
  ].forEach((R, ri) => {
    const g = new THREE.Group();
    g.name = `${name}-ophan-${ri}`;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(R.r, R.tube, 16, 220), gold);
    torus.name = `${name}-ophan-${ri}-ring`;
    const inner = new THREE.Mesh(new THREE.TorusGeometry(R.r - R.tube * 1.8, R.tube * 0.25, 8, 220), gold);
    inner.name = `${name}-ophan-${ri}-inner`;
    g.add(torus, inner);
    const eyes: Eye[] = [];
    for (let k = 0; k < R.n; k++) {
      const e = createEye(`${name}-ophan-${ri}-eye-${k}`, { detail: 0.3, a: "#ffcf3d", b: ri === 1 ? "#3df2ff" : "#ff5aa9", lid: "#6a4214" });
      const a = (k / R.n) * Math.PI * 2;
      e.group.position.set(Math.cos(a) * R.r, Math.sin(a) * R.r, 0);
      e.group.scale.setScalar(0.62 + (ri === 0 ? 0.1 : 0));
      g.add(e.group);
      eyes.push(e);
    }
    group.add(g);
    rings.push({ g, eyes, axis: R.axis.normalize(), speed: R.speed });
  });

  // the one great eye
  const eye = createEye(`${name}-eye`, { a: "#ffcf3d", b: "#ffffff", lid: "#6a4214" });
  eye.group.scale.setScalar(3.4);
  group.add(eye.group);
  const eyeHalo = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.12, 12, 160), gold);
  eyeHalo.name = `${name}-eye-bezel`;
  group.add(eyeHalo);

  const dust = stars(700, new THREE.Vector3(60, 44, 20), 71, 0.35, ["#ffe2a0", "#ffffff", "#ffcf6d"], `${name}-motes`);
  dust.points.position.z = -2;
  group.add(dust.points);
  const glow = w.glow("#ffcf6d", 50, `${name}-glow`);
  glow.position.z = -5;
  group.add(glow);
  const light = new THREE.PointLight("#ffd28a", 350, 140, 1.4);
  light.position.set(0, 0, 14);
  group.add(light);

  const q = new THREE.Quaternion();
  /** look: world point the eyes watch. open: 0 → the maw takes over (eye sinks, wings flare). */
  const update = (t: number, s: { pulse: number; look: THREE.Vector3; maw: number; blink?: number }) => {
    coronaMat.uniforms.uTime.value = t;
    coronaMat.uniforms.uPulse.value = s.pulse;
    coronaMat.uniforms.uAmt.value = 0.65 + s.maw * 0.35;
    corona.rotation.z = t * 0.05;
    wings.forEach((wg) => {
      const beat = Math.sin(t * 2.1 + wg.ph) * 0.1 + s.pulse * 0.05;
      wg.pivot.rotation.set(0, wg.side * (0.3 - s.maw * 0.2), wg.side * (wg.base * 1.2 + beat + s.maw * 0.2));
      wg.pivot.scale.setScalar(1 + s.maw * 0.15);
    });
    feather.emissiveIntensity = 0.2 + s.pulse * 0.25 + s.maw * 0.3;
    featherEdge.opacity = 0.25 + s.pulse * 0.35;
    rings.forEach((R, i) => {
      q.setFromAxisAngle(R.axis, t * R.speed + i);
      R.g.quaternion.copy(q);
      R.g.scale.setScalar((1 + s.pulse * 0.025) * (1 + s.maw * 0.35));
      R.eyes.forEach((e, k) => e.set(t + k, { look: s.look, pupil: 0.3 + s.pulse * 0.08, close: 0.12 + (Math.sin(t * 1.7 + k * 2.3 + i) > 0.97 ? 0.85 : 0) + s.maw * 0.4, glow: 1 + s.pulse * 0.4 }));
    });
    gold.emissiveIntensity = 0.5 + s.pulse * 0.4;
    eye.group.scale.setScalar(Math.max(0.001, 3.4 * (1 - s.maw)));
    eye.group.visible = s.maw < 0.99;
    eye.set(t, { look: s.look, pupil: 0.24 + s.pulse * 0.06, close: 0.1 + (s.blink ?? 0), glow: 1.2 + s.pulse * 0.4 });
    eyeHalo.rotation.z = t * 0.3;
    eyeHalo.scale.setScalar(Math.max(0.001, (1 - s.maw) * (1 + s.pulse * 0.04)));
    eyeHalo.visible = s.maw < 0.99;
    dust.update(t, 0.8, s.pulse * 0.4);
    glow.material.opacity = 0.3 + s.pulse * 0.2 + s.maw * 0.3;
    light.intensity = 300 + s.pulse * 250;
  };
  return { group, update };
}
