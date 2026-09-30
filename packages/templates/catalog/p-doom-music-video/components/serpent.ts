import * as THREE from "three";
import { rng } from "./music";

/** Keeled dorsal scales (olive-black, bronze-edged) over pale ventral plates: colour + bump, drawn once. */
function scaleTextures(seed: number) {
  const r = rng(seed);
  const W = 1024;
  const H = 512;
  const col = new OffscreenCanvas(W, H);
  const bmp = new OffscreenCanvas(W, H);
  const c = col.getContext("2d")!;
  const b = bmp.getContext("2d")!;
  c.fillStyle = "#0d0f0a";
  c.fillRect(0, 0, W, H);
  b.fillStyle = "#202020";
  b.fillRect(0, 0, W, H);
  // v (canvas y) runs around the body: belly band sits at 0.62–0.88
  const cw = 26;
  const ch = 18;
  for (let row = -1; row < H / ch + 1; row++) {
    const v = (row * ch) / H;
    const belly = v > 0.62 && v < 0.88;
    if (belly) continue;
    for (let colI = -1; colI < W / cw + 1; colI++) {
      const x = colI * cw + (row % 2 ? cw / 2 : 0);
      const y = row * ch;
      const tone = 18 + r() * 22;
      const g = c.createLinearGradient(x - cw * 0.6, y, x + cw * 0.6, y);
      g.addColorStop(0, `rgb(${tone + 14},${tone + 16},${tone})`);
      g.addColorStop(0.55, `rgb(${tone + 34},${tone + 30},${tone + 8})`);
      g.addColorStop(1, `rgb(${tone},${tone + 2},${tone - 4})`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - cw * 0.62, y);
      c.quadraticCurveTo(x, y - ch * 1.25, x + cw * 0.62, y);
      c.quadraticCurveTo(x, y + ch * 0.55, x - cw * 0.62, y);
      c.fill();
      // bronze edge and a central keel
      c.strokeStyle = `rgba(${120 + r() * 50},${90 + r() * 30},${40 + r() * 20},0.35)`;
      c.lineWidth = 1.4;
      c.stroke();
      c.strokeStyle = "rgba(0,0,0,0.5)";
      c.beginPath();
      c.moveTo(x - cw * 0.3, y - ch * 0.15);
      c.lineTo(x + cw * 0.35, y - ch * 0.2);
      c.stroke();
      // bump: domed scale with a raised keel, dark seams between
      const gb = b.createRadialGradient(x, y - ch * 0.35, 1, x, y - ch * 0.35, cw * 0.62);
      gb.addColorStop(0, "#b0b0b0");
      gb.addColorStop(1, "#303030");
      b.fillStyle = gb;
      b.beginPath();
      b.moveTo(x - cw * 0.62, y);
      b.quadraticCurveTo(x, y - ch * 1.25, x + cw * 0.62, y);
      b.quadraticCurveTo(x, y + ch * 0.55, x - cw * 0.62, y);
      b.fill();
      b.strokeStyle = "#e0e0e0";
      b.lineWidth = 2;
      b.beginPath();
      b.moveTo(x - cw * 0.3, y - ch * 0.15);
      b.lineTo(x + cw * 0.35, y - ch * 0.2);
      b.stroke();
    }
  }
  // blotched dorsal pattern: darker saddles
  for (let k = 0; k < 26; k++) {
    const x = (k / 26) * W + r() * 20;
    const g = c.createRadialGradient(x, H * 0.25, 4, x, H * 0.25, 60);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - 70, H * 0.05, 140, H * 0.45);
  }
  // ventral plates
  const vy0 = H * 0.62;
  const vy1 = H * 0.88;
  const vg = c.createLinearGradient(0, vy0, 0, vy1);
  vg.addColorStop(0, "#5a5440");
  vg.addColorStop(0.5, "#8a8266");
  vg.addColorStop(1, "#5a5440");
  c.fillStyle = vg;
  c.fillRect(0, vy0, W, vy1 - vy0);
  b.fillStyle = "#808080";
  b.fillRect(0, vy0, W, vy1 - vy0);
  for (let x = 0; x < W; x += 16) {
    c.fillStyle = "rgba(20,18,10,0.6)";
    c.fillRect(x, vy0, 2.5, vy1 - vy0);
    b.fillStyle = "#101010";
    b.fillRect(x, vy0, 3, vy1 - vy0);
  }
  const mk = (cv: OffscreenCanvas, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv as unknown as HTMLCanvasElement);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16;
    return t;
  };
  return { map: mk(col, true), bump: mk(bmp, false) };
}

/** An eye with a vertical slit pupil: amber, veined, behind a glassy cornea. */
function serpentEye(name: string) {
  const g = new THREE.Group();
  g.name = name;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSlit: { value: 0.12 }, uGlow: { value: 1 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vP; void main(){ vN = normal; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uSlit, uGlow, uTime; varying vec3 vN; varying vec3 vP;
      float h(float x){ return fract(sin(x * 127.1) * 43758.5453); }
      void main() {
        vec2 p = vP.xy;                  // the eye looks along +z
        float r = length(p);
        float a = atan(p.y, p.x);
        vec3 amber = mix(vec3(1.0, 0.72, 0.12), vec3(0.55, 0.22, 0.02), smoothstep(0.1, 1.0, r));
        float fib = 0.75 + 0.25 * sin(a * 60.0 + h(floor(a * 20.0)) * 6.0) * sin(r * 30.0);
        vec3 col = amber * fib;
        col += vec3(1.0, 0.85, 0.3) * 0.35 * smoothstep(0.5, 0.0, abs(r - 0.45)) ;
        col *= mix(1.0, 0.25, smoothstep(0.82, 1.0, r));   // dark rim
        // vertical slit pupil
        float slit = smoothstep(uSlit + 0.03, uSlit - 0.01, abs(p.x) / max(0.001, sqrt(max(0.0, 1.0 - p.y * p.y * 0.92))));
        col = mix(col * uGlow, vec3(0.0), slit);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat);
  ball.name = `${name}-ball`;
  const cornea = new THREE.Mesh(
    new THREE.SphereGeometry(1.04, 40, 28),
    new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.12, roughness: 0.0, clearcoat: 1, clearcoatRoughness: 0, depthWrite: false }),
  );
  cornea.name = `${name}-cornea`;
  g.add(ball, cornea);
  return { g, mat };
}

export type Spine = (s: number, out: THREE.Vector3) => THREE.Vector3;

/**
 * A colossal, realistic serpent. The body is a flat-bellied tube relaid
 * around a spine function every frame; the head is a viper's, sculpted from
 * deformed spheres, with slit-pupil eyes, heat pits and hinged fangs.
 */
export function createSerpent(name = "basilisk", rings = 220, radial = 28, bodyR = 2.2) {
  const group = new THREE.Group();
  group.name = name;
  const tex = scaleTextures(11);
  const skin = new THREE.MeshPhysicalMaterial({
    map: tex.map,
    bumpMap: tex.bump,
    bumpScale: 3,
    color: "#8a8a80",
    roughness: 0.5,
    metalness: 0.05,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
    iridescence: 0.22,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [180, 520],
    sheen: 0.3,
    sheenColor: new THREE.Color("#4a6a8a"),
  });

  // ---------- body ----------
  const RV = radial + 1;
  const pos = new Float32Array(rings * RV * 3);
  const uv = new Float32Array(rings * RV * 2);
  const idx: number[] = [];
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < RV; i++) {
      uv.set([(j / (rings - 1)) * 22, i / radial], (j * RV + i) * 2);
      if (j < rings - 1 && i < radial) {
        const a = j * RV + i;
        idx.push(a, a + RV, a + 1, a + RV, a + RV + 1, a + 1);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const body = new THREE.Mesh(geo, skin);
  body.name = `${name}-body`;
  body.frustumCulled = false;
  group.add(body);

  // ---------- head (built facing +z, ~2.6 wide, ~5 long) ----------
  const head = new THREE.Group();
  head.name = `${name}-head`;
  group.add(head);
  /** Viper silhouette: broad jaw bulge behind, tapering to a blunt snout, flat crown. */
  const sculpt = (g: THREE.BufferGeometry, lower: boolean) => {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i);
      let y = p.getY(i);
      const z = p.getZ(i); // -1 back .. +1 snout
      const taper = 0.5 + 0.5 * THREE.MathUtils.smoothstep(z, 1.0, -0.5); // wide at the back
      const cheek = 1 + 0.18 * Math.exp(-Math.pow((z + 0.45) / 0.35, 2));
      x *= 1.08 * taper * cheek;
      y *= lower ? 0.5 : y > 0 ? 0.88 * (0.7 + 0.3 * taper) : 0.3;
      if (!lower && y > 0) y -= Math.max(0, y - 0.62) * 0.55; // flat crown
      p.setXYZ(i, x, y, z * 2.5);
    }
    g.computeVertexNormals();
  };
  const upperGeo = new THREE.SphereGeometry(1, 64, 40, 0, Math.PI * 2, 0, Math.PI * 0.56);
  sculpt(upperGeo, false);
  const upper = new THREE.Group();
  upper.name = `${name}-upper-jaw`;
  const skull = new THREE.Mesh(upperGeo, skin);
  skull.name = `${name}-skull`;
  upper.add(skull);
  const mouthMat = new THREE.MeshPhysicalMaterial({ color: "#4a1a20", roughness: 0.35, clearcoat: 1, side: THREE.DoubleSide, sheen: 0.6, sheenColor: new THREE.Color("#ff8a8a") });
  const palate = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mouthMat);
  palate.rotation.x = Math.PI / 2;
  palate.scale.set(0.82, 2.0, 1);
  palate.position.set(0, -0.12, 0.1);
  palate.name = `${name}-palate`;
  upper.add(palate);
  // brow ridges over the eyes
  for (const x of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skin);
    brow.scale.set(0.3, 0.09, 0.62);
    brow.position.set(x * 0.5, 0.62, 0.42);
    brow.rotation.set(-0.1, 0, -x * 0.45);
    brow.name = `${name}-brow`;
    upper.add(brow);
  }
  const eyes = [-1, 1].map((x) => {
    const e = serpentEye(`${name}-eye-${x < 0 ? "left" : "right"}`);
    e.g.scale.setScalar(0.26);
    // sunk into the skull under the brow: only a dome of the eye shows
    e.g.position.set(x * 0.5, 0.44, 0.55);
    e.g.rotation.y = x * 1.05;
    upper.add(e.g);
    return e;
  });
  // nostrils and heat pits
  const pitMat = new THREE.MeshBasicMaterial({ color: "#050403" });
  for (const x of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), pitMat);
    nostril.scale.set(1, 0.6, 1);
    nostril.position.set(x * 0.34, 0.22, 2.35);
    nostril.name = `${name}-nostril`;
    const pit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), pitMat);
    pit.scale.set(0.6, 1, 1);
    pit.position.set(x * 0.72, 0.1, 1.45);
    pit.name = `${name}-heat-pit`;
    upper.add(nostril, pit);
  }
  // fangs: curved, hinged to fold forward as the jaw opens
  const fangMat = new THREE.MeshPhysicalMaterial({ color: "#efe6d2", roughness: 0.2, clearcoat: 1 });
  const fangGeo = new THREE.ConeGeometry(0.1, 1.3, 12, 8);
  const fp = fangGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < fp.count; i++) {
    const y = fp.getY(i) + 0.65; // 0 root .. 1.3 tip
    fp.setZ(i, fp.getZ(i) + Math.pow(y / 1.3, 2) * -0.35);
  }
  fangGeo.computeVertexNormals();
  fangGeo.rotateX(Math.PI);
  fangGeo.translate(0, -0.65, 0);
  const fangs = [-1, 1].map((x) => {
    const pv = new THREE.Group();
    pv.position.set(x * 0.42, -0.12, 1.85);
    const f = new THREE.Mesh(fangGeo, fangMat);
    f.name = `${name}-fang`;
    pv.add(f);
    upper.add(pv);
    return pv;
  });
  head.add(upper);
  const lowerGeo = new THREE.SphereGeometry(1, 56, 24, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44);
  sculpt(lowerGeo, true);
  lowerGeo.translate(0, 0, 2.2); // hinge at the back of the jaw
  const lower = new THREE.Group();
  lower.name = `${name}-lower-jaw`;
  lower.position.set(0, -0.18, -2.2);
  const jaw = new THREE.Mesh(lowerGeo, skin);
  jaw.name = `${name}-jaw`;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mouthMat);
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(1.05, 2.1, 1);
  floor.position.set(0, 0.02, 2.2);
  floor.name = `${name}-mouth-floor`;
  const tongueMat = new THREE.MeshPhysicalMaterial({ color: "#0c0a0c", roughness: 0.3, clearcoat: 1 });
  const tongue = new THREE.Group();
  tongue.name = `${name}-tongue`;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.8, 8), tongueMat);
  stem.rotation.x = Math.PI / 2;
  stem.position.z = 0.9;
  stem.name = `${name}-tongue-stem`;
  tongue.add(stem);
  for (const x of [-1, 1]) {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.035, 0.6, 6), tongueMat);
    fork.rotation.set(Math.PI / 2, 0, x * 0.45);
    fork.position.set(x * 0.1, 0, 1.95);
    fork.name = `${name}-tongue-fork`;
    tongue.add(fork);
  }
  tongue.position.set(0, 0.08, 2.4);
  lower.add(jaw, floor, tongue);
  head.add(lower);

  // ---------- per-frame ----------
  const c0 = new THREE.Vector3();
  const c1 = new THREE.Vector3();
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const v = new THREE.Vector3();
  const lookM = new THREE.Matrix4();
  const ahead = new THREE.Vector3();
  const radiusAt = (s: number) => bodyR * (0.48 + 0.52 * THREE.MathUtils.smoothstep(s, 0, 0.1)) * (1 - 0.94 * THREE.MathUtils.smoothstep(s, 0.55, 1));

  /** open: jaw 0..1; slit: pupil width; glow: eye brightness; flick: tongue out 0..1. */
  const update = (t: number, spine: Spine, s: { open: number; slit: number; glow: number; flick: number; headScale?: number }) => {
    const pa = geo.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < rings; j++) {
      const sj = j / (rings - 1);
      spine(sj, c0);
      spine(Math.min(1, sj + 0.003), c1);
      T.subVectors(c1, c0);
      if (T.lengthSq() < 1e-8) T.set(0, 0, 1);
      T.normalize();
      N.crossVectors(T, up);
      if (N.lengthSq() < 1e-6) N.set(1, 0, 0);
      N.normalize();
      B.crossVectors(N, T).normalize();
      const r = radiusAt(sj) * (1 + Math.sin(t * 2.4 - sj * 40) * 0.015);
      for (let i = 0; i <= radial; i++) {
        const th = (i / radial) * Math.PI * 2;
        const sn = Math.sin(th);
        // flat belly, rounded back
        const yy = sn < 0 ? sn * 0.62 : sn * 0.95;
        v.copy(c0).addScaledVector(N, Math.cos(th) * r * 1.08).addScaledVector(B, yy * r);
        pa.setXYZ(j * RV + i, v.x, v.y, v.z);
      }
    }
    pa.needsUpdate = true;
    geo.computeVertexNormals();
    // head rides the tip of the spine, looking away from the neck
    spine(0, c0);
    spine(0.012, c1);
    T.subVectors(c0, c1).normalize();
    head.position.copy(c0).addScaledVector(T, 1.6 * (s.headScale ?? 1));
    lookM.lookAt(ahead.copy(head.position).add(T), head.position, up);
    head.quaternion.setFromRotationMatrix(lookM);
    head.scale.setScalar(s.headScale ?? 1);
    const o = THREE.MathUtils.clamp(s.open, 0, 1);
    upper.rotation.x = -o * 0.3;
    lower.rotation.x = o * 0.95;
    fangs.forEach((f) => (f.rotation.x = -o * 0.9));
    tongue.visible = o < 0.4;
    palate.visible = floor.visible = o > 0.05;
    tongue.position.z = 2.4 + s.flick * 1.2;
    tongue.rotation.y = Math.sin(t * 31) * 0.12 * s.flick;
    eyes.forEach((e) => {
      e.mat.uniforms.uSlit.value = s.slit;
      e.mat.uniforms.uGlow.value = s.glow;
      e.mat.uniforms.uTime.value = t;
    });
  };
  const eyeWorld = (out: THREE.Vector3, side = 1) => eyes[side > 0 ? 1 : 0].g.getWorldPosition(out);
  return { group, head, update, eyeWorld };
}
