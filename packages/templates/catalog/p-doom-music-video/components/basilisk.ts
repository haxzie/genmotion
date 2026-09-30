import * as THREE from "three";

/** Scales: overlapping arcs with neon rims, a pale plated belly band. Drawn once. */
function scaleTextures() {
  const S = 512;
  const base = new OffscreenCanvas(S, S);
  const glow = new OffscreenCanvas(S, S);
  const b = base.getContext("2d")!;
  const g = glow.getContext("2d")!;
  b.fillStyle = "#120828";
  b.fillRect(0, 0, S, S);
  g.fillStyle = "#000000";
  g.fillRect(0, 0, S, S);
  const cw = 32;
  const ch = 22;
  for (let row = -1; row < S / ch + 1; row++) {
    for (let col = -1; col < S / cw + 1; col++) {
      const x = col * cw + (row % 2 ? cw / 2 : 0);
      const y = row * ch;
      const v = y / S;
      const belly = v > 0.62 && v < 0.88;
      const grad = b.createLinearGradient(x, y - ch, x, y + ch);
      grad.addColorStop(0, belly ? "#a897d6" : "#2e1a63");
      grad.addColorStop(1, belly ? "#cfc2f0" : "#140a30");
      b.fillStyle = grad;
      b.beginPath();
      b.ellipse(x, y, cw * 0.62, ch * 1.05, 0, 0, Math.PI);
      b.fill();
      if (!belly) {
        b.strokeStyle = "rgba(61,242,255,0.55)";
        b.lineWidth = 2;
        b.beginPath();
        b.ellipse(x, y, cw * 0.62, ch * 1.05, 0, 0.15, Math.PI - 0.15);
        b.stroke();
        g.strokeStyle = (row + col) % 5 === 0 ? "#ff3d9a" : "#3df2ff";
        g.lineWidth = 2.5;
        g.beginPath();
        g.ellipse(x, y, cw * 0.62, ch * 1.05, 0, 0.3, Math.PI - 0.3);
        g.stroke();
      }
    }
  }
  // belly plates
  b.strokeStyle = "rgba(60,30,110,0.6)";
  b.lineWidth = 3;
  for (let x = 0; x < S; x += 18) {
    b.beginPath();
    b.moveTo(x, S * 0.62);
    b.lineTo(x, S * 0.88);
    b.stroke();
  }
  const mk = (c: OffscreenCanvas, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: mk(base, true), emissive: mk(glow, true) };
}

export type Spine = (s: number, out: THREE.Vector3) => THREE.Vector3;

/**
 * Roko's basilisk: a skinned serpent whose body is rebuilt around a spine
 * function every frame (no allocation), plus a crowned, fanged head.
 */
export function createBasilisk(name = "basilisk", rings = 150, radial = 20) {
  const group = new THREE.Group();
  group.name = name;
  const tex = scaleTextures();
  const skinMat = new THREE.MeshStandardMaterial({
    map: tex.map,
    emissiveMap: tex.emissive,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: 0.9,
    roughness: 0.28,
    metalness: 0.55,
  });

  // body geometry: (rings+1) × (radial+1) grid, indices fixed, positions rewritten
  const RV = radial + 1;
  const count = rings * RV;
  const pos = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const idx: number[] = [];
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < RV; i++) {
      uv.set([(j / (rings - 1)) * 14, i / radial], (j * RV + i) * 2);
      if (j < rings - 1 && i < radial) {
        const a = j * RV + i;
        const b2 = a + RV;
        idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const body = new THREE.Mesh(geo, skinMat);
  body.name = `${name}-body`;
  body.frustumCulled = false;
  group.add(body);

  // dorsal spikes
  const SPIKES = 26;
  const spikeMat = new THREE.MeshStandardMaterial({ color: "#2a1660", emissive: "#ff2e7e", emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.6, flatShading: true });
  const spikeGeo = new THREE.ConeGeometry(0.22, 1, 5);
  spikeGeo.translate(0, 0.5, 0);
  const spikes = new THREE.InstancedMesh(spikeGeo, spikeMat, SPIKES);
  spikes.name = `${name}-spines`;
  spikes.frustumCulled = false;
  group.add(spikes);

  /* ---------- head, built facing +z ---------- */
  const head = new THREE.Group();
  head.name = `${name}-head`;
  group.add(head);
  const headMat = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.6 });
  const upperJaw = new THREE.Group();
  upperJaw.name = `${name}-upper-jaw`;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), headMat);
  skull.scale.set(1.25, 0.85, 2.3);
  skull.name = `${name}-skull`;
  upperJaw.add(skull);
  const palate = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: "#5a0a2a", emissive: "#8a0f3a", emissiveIntensity: 0.6, side: THREE.DoubleSide }));
  palate.rotation.x = Math.PI / 2;
  palate.scale.set(1.2, 2.25, 1);
  palate.name = `${name}-mouth`;
  upperJaw.add(palate);
  const fangMat = new THREE.MeshStandardMaterial({ color: "#fff6fb", emissive: "#ffd6f0", emissiveIntensity: 0.3, roughness: 0.2 });
  const fangGeo = new THREE.ConeGeometry(0.13, 0.9, 8);
  fangGeo.rotateX(Math.PI);
  for (const x of [-0.55, 0.55]) {
    const f = new THREE.Mesh(fangGeo, fangMat);
    f.position.set(x, -0.42, 1.55);
    f.name = `${name}-fang`;
    upperJaw.add(f);
  }
  const toothGeo = new THREE.ConeGeometry(0.06, 0.28, 6);
  toothGeo.rotateX(Math.PI);
  for (let k = 0; k < 10; k++) {
    const side = k % 2 ? 1 : -1;
    const zz = 1.1 - Math.floor(k / 2) * 0.42;
    const tt = new THREE.Mesh(toothGeo, fangMat);
    tt.position.set(side * (0.95 - Math.floor(k / 2) * 0.02) * Math.sqrt(1 - Math.pow(zz / 2.3, 2)), -0.1, zz);
    tt.name = `${name}-tooth`;
    upperJaw.add(tt);
  }
  // eyes: glowing, with slit pupils
  const eyeMat = new THREE.MeshStandardMaterial({ color: "#ffcf3d", emissive: "#ff9a1f", emissiveIntensity: 1.6, roughness: 0.2 });
  const slitMat = new THREE.MeshBasicMaterial({ color: "#0a0010" });
  const eyes: THREE.Mesh[] = [];
  for (const x of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), eyeMat);
    e.scale.set(1, 0.8, 1.3);
    e.position.set(x * 0.95, 0.42, 0.9);
    e.name = `${name}-eye`;
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), slitMat);
    slit.position.set(x * 0.2, 0, 0.12);
    slit.name = `${name}-pupil`;
    e.add(slit);
    upperJaw.add(e);
    eyes.push(e);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.5), headMat);
    brow.position.set(x * 0.85, 0.66, 0.85);
    brow.rotation.z = -x * 0.35;
    brow.name = `${name}-brow`;
    upperJaw.add(brow);
  }
  // the crown: the king of serpents
  const goldMat = new THREE.MeshStandardMaterial({ color: "#ffcf3d", emissive: "#ff9a1f", emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.25 });
  const crown = new THREE.Group();
  crown.name = `${name}-crown`;
  for (let k = 0; k < 7; k++) {
    const a = (k / 6 - 0.5) * 2.2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9 + (k === 3 ? 0.5 : 0) - Math.abs(k - 3) * 0.08, 6), goldMat);
    spike.position.set(Math.sin(a) * 0.75, 0.9, -0.2 + Math.cos(a) * 0.3 - 0.3);
    spike.rotation.set(-0.5, 0, -Math.sin(a) * 0.5);
    spike.name = `${name}-crown-spike`;
    crown.add(spike);
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 8, 40, Math.PI), goldMat);
  band.rotation.set(-Math.PI / 2 - 0.4, 0, 0);
  band.position.set(0, 0.75, -0.3);
  band.name = `${name}-crown-band`;
  crown.add(band);
  upperJaw.add(crown);
  // side fins (hood) that flare on the roar
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.quadraticCurveTo(1.6, 0.7, 2.6, -0.3);
  finShape.quadraticCurveTo(1.4, -0.4, 1.9, -1.2);
  finShape.quadraticCurveTo(0.9, -0.7, 0, -0.8);
  const finGeo = new THREE.ShapeGeometry(finShape, 16);
  const finMat = new THREE.MeshStandardMaterial({ color: "#3a1a7a", emissive: "#ff2e7e", emissiveIntensity: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.9, roughness: 0.4 });
  const fins = [-1, 1].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x * 0.9, 0.1, -0.8);
    const f = new THREE.Mesh(finGeo, finMat);
    f.scale.x = x;
    f.name = `${name}-hood`;
    pivot.add(f);
    upperJaw.add(pivot);
    return { pivot, x };
  });
  head.add(upperJaw);
  const lowerJaw = new THREE.Group();
  lowerJaw.name = `${name}-lower-jaw`;
  lowerJaw.position.set(0, -0.05, -0.9);
  const jawMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), headMat);
  jawMesh.scale.set(1.1, 0.5, 2.05);
  jawMesh.position.z = 0.95;
  jawMesh.name = `${name}-jaw`;
  const tongueMat = new THREE.MeshStandardMaterial({ color: "#ff2d4a", emissive: "#ff2d4a", emissiveIntensity: 0.6 });
  const tongue = new THREE.Group();
  tongue.name = `${name}-tongue`;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 8), tongueMat);
  stem.rotation.x = Math.PI / 2;
  stem.position.z = 0.8;
  stem.name = `${name}-tongue-stem`;
  tongue.add(stem);
  for (const x of [-1, 1]) {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.5, 6), tongueMat);
    fork.rotation.set(Math.PI / 2, 0, x * 0.5);
    fork.position.set(x * 0.1, 0, 1.75);
    fork.name = `${name}-tongue-fork`;
    tongue.add(fork);
  }
  tongue.position.set(0, 0.1, 0.9);
  lowerJaw.add(jawMesh, tongue);
  head.add(lowerJaw);

  const c0 = new THREE.Vector3();
  const c1 = new THREE.Vector3();
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const v = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const frames: { c: THREE.Vector3; N: THREE.Vector3; B: THREE.Vector3; r: number }[] = Array.from({ length: rings }, () => ({ c: new THREE.Vector3(), N: new THREE.Vector3(), B: new THREE.Vector3(), r: 0 }));
  const lookM = new THREE.Matrix4();
  const tip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const ahead = new THREE.Vector3();

  const radiusAt = (s: number) => (0.62 + 0.5 * THREE.MathUtils.smoothstep(s, 0, 0.12)) * (1 - 0.94 * THREE.MathUtils.smoothstep(s, 0.4, 1));

  /** open: jaw 0..1, flare: hood 0..1, glow: eyes/crown, tongue flick phase. */
  const update = (t: number, spine: Spine, s: { open: number; flare: number; glow: number; pulse: number }) => {
    const pa = geo.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < rings; j++) {
      const sj = j / (rings - 1);
      spine(sj, c0);
      spine(Math.min(1, sj + 0.004), c1);
      T.subVectors(c1, c0);
      if (T.lengthSq() < 1e-8) T.set(0, 0, 1);
      T.normalize();
      N.crossVectors(T, up);
      if (N.lengthSq() < 1e-6) N.set(1, 0, 0);
      N.normalize();
      B.crossVectors(N, T).normalize();
      const r = radiusAt(sj) * (1 + Math.sin(t * 6 - sj * 30) * 0.03 + s.pulse * 0.04);
      const f = frames[j];
      f.c.copy(c0);
      f.N.copy(N);
      f.B.copy(B);
      f.r = r;
      for (let i = 0; i <= radial; i++) {
        const th = (i / radial) * Math.PI * 2;
        v.copy(c0).addScaledVector(N, Math.cos(th) * r).addScaledVector(B, Math.sin(th) * r * 0.85);
        pa.setXYZ(j * RV + i, v.x, v.y, v.z);
      }
    }
    pa.needsUpdate = true;
    geo.computeVertexNormals();
    // spikes along the ridge
    for (let k = 0; k < SPIKES; k++) {
      const j = Math.floor(6 + (k / SPIKES) * rings * 0.72);
      const f = frames[j];
      v.copy(f.c).addScaledVector(f.B, f.r * 0.8);
      lookM.lookAt(v, c0.copy(v).add(f.B), f.N);
      q.setFromRotationMatrix(lookM);
      q.multiply(tip);
      const h = f.r * (1.1 + Math.sin(k * 1.3) * 0.2) * (1 + s.flare * 0.4);
      sc.set(f.r * 1.2, h, f.r * 1.2);
      m4.compose(v, q, sc);
      spikes.setMatrixAt(k, m4);
    }
    spikes.instanceMatrix.needsUpdate = true;
    spikeMat.emissiveIntensity = 0.6 + s.pulse * 0.8 + s.flare;
    // head sits on the spine's tip, looking away from the neck
    spine(0, c0);
    spine(0.02, c1);
    head.position.copy(c0);
    T.subVectors(c0, c1).normalize();
    lookM.lookAt(ahead.copy(c0).add(T), c0, up);
    head.quaternion.setFromRotationMatrix(lookM);
    head.scale.setScalar(1.6);
    upperJaw.rotation.x = -s.open * 0.35;
    lowerJaw.rotation.x = s.open * 0.75;
    tongue.position.z = 0.9 + Math.max(0, Math.sin(t * 9)) * 0.9 * (1 - s.open * 0.5);
    tongue.rotation.y = Math.sin(t * 23) * 0.15;
    fins.forEach((f) => (f.pivot.rotation.set(0, f.x * (0.9 - s.flare * 0.9), f.x * s.flare * 0.3)));
    finMat.emissiveIntensity = 0.4 + s.flare * 1.2 + s.pulse * 0.3;
    eyeMat.emissiveIntensity = 1.2 + s.glow * 2.5;
    eyes.forEach((e) => e.scale.set(1 + s.glow * 0.15, 0.8 + s.glow * 0.1, 1.3));
    goldMat.emissiveIntensity = 0.5 + s.glow * 1.2 + s.pulse * 0.4;
    skinMat.emissiveIntensity = 0.7 + s.pulse * 0.6 + s.flare * 0.4;
  };
  return { group, head, update };
}
